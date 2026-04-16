import fs from 'fs';
import path from 'path';
import axios, { AxiosInstance } from 'axios';
import { config } from './deep-config';
import { extractSessionId, guessMimeType, normalizeFileInfo } from './deepseek/file-shape';
import { parseSSEEvent, parseStreamPayload } from './deepseek/parsing';
import { DeepSeekPowWorkerPool } from './deepseek/pow-worker-pool';
import {
  fetchFiles as fetchDeepSeekFiles,
  waitForFileReady as waitForDeepSeekFileReady
} from './deepseek/file-metadata';
import {
  enableDynamicUploadSerialization,
  sleep,
  withSerializedPowSolve,
  withSerializedUploadPipeline
} from './deepseek/serialization';
import {
  buildPowChallengeError,
  isAuthorizationFailureText,
  isInvalidPowTargetPathText,
  isPendingPowChallengeError,
  isRetryablePowChallengeError,
  isRetryableRequestError,
  resolvePowPendingDelayMs,
  RetryableError,
  summarizePowResponse
} from './deepseek/retry';

export type DeepSeekStreamChunk = {
  content?: string;
  thinking?: string;
  sources?: any[];
};

export type DeepSeekFileInfo = {
  id: string;
  status: 'PENDING' | 'SUCCESS' | 'FAILED' | string;
  fileName: string;
  previewable: boolean;
  fileSize: number;
  tokenUsage: number | null;
  errorCode: string | null;
  insertedAt: number | null;
  updatedAt: number | null;
};

export type DeepSeekWaitForFileOptions = {
  timeoutMs?: number;
  pollIntervalMs?: number;
  missingMetadataGraceMs?: number;
};

export class DeepSeekAPI {
  private static BASE_URL = "https://chat.deepseek.com/api/v0";
  private static USER_AGENT =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
  private static powWorkerPool = DeepSeekPowWorkerPool.getShared();
  private static globalChatStartLock: Promise<void> = Promise.resolve();
  private static globalSessionCreateLock: Promise<void> = Promise.resolve();
  private static globalUploadPipelineLock: Promise<void> = Promise.resolve();
  private static nextGlobalChatStartAt = 0;
  private static nextGlobalSessionCreateAt = 0;
  private static globalChatStartSpacingMs = 0;
  private static globalSessionCreateSpacingMs = 150;
  private static globalChatPowSuccessStreak = 0;
  private static globalSessionCreateSuccessStreak = 0;
  private token: string;
  private client: AxiosInstance;
  private powSolveLock: Promise<void> = Promise.resolve();
  private uploadPipelineLock: Promise<void> = Promise.resolve();
  private sessionCreateLock: Promise<void> = Promise.resolve();
  private chatStartLock: Promise<void> = Promise.resolve();
  private dynamicUploadSerializationUntil = 0;
  private nextChatStartAt = 0;
  private chatStartSpacingMs = 0;
  private chatPowSuccessStreak = 0;

  constructor(token: string = config.DEEPSEEK_TOKEN) {
    this.token = token;
    this.client = axios.create({
      baseURL: DeepSeekAPI.BASE_URL,
      timeout: config.API_REQUEST_TIMEOUT_MS,
      headers: {
        'authorization': `Bearer ${token}`,
        'user-agent': DeepSeekAPI.USER_AGENT,
        'content-type': 'application/json'
      }
    });
  }

  async init() {
    await DeepSeekAPI.powWorkerPool.init();
  }

  async createSession() {
    return this.withSerializedSessionCreate(() => this.createSessionWithRetries());
  }

  private async createSessionWithRetries() {
    // Fail fast on unhealthy lanes so queue-level alternate-token retries can recover work quickly.
    const hardAttemptCap = Math.max(6, config.MAX_RETRIES + 3);
    const retryDeadline = Date.now() + Math.max(20_000, config.POW_PENDING_CHALLENGE_MAX_WAIT_MS + 10_000);
    let attempt = 0;

    while (attempt < hardAttemptCap) {
      attempt += 1;
      try {
        const res = await this.client.post('/chat_session/create', { character_id: null });
        const sessionId = extractSessionId(res?.data);
        if (!sessionId) {
          const summary = summarizePowResponse(res?.data);
          const error = new Error(
            `DeepSeek session create response missing session id${summary ? `: ${summary}` : ''}`
          ) as RetryableError;
          error.retryable = true;
          if (res?.status === 202) {
            error.retryAfterMs = resolvePowPendingDelayMs('/api/v0/chat_session/create', config.POW_PENDING_CHALLENGE_DELAY_MS);
          }
          throw error;
        }
        this.registerSessionCreateSuccess();
        return sessionId;
      } catch (error: any) {
        const now = Date.now();
        const shouldRetry =
          attempt < hardAttemptCap &&
          now < retryDeadline &&
          isRetryableRequestError(error);
        if (!shouldRetry) {
          if (error instanceof Error) {
            throw error;
          }
          throw new Error(`Failed to create DeepSeek session: ${String(error)}`);
        }
        this.registerSessionCreateFailure();

        const requestedDelay =
          typeof (error as RetryableError)?.retryAfterMs === 'number'
            ? Math.max(0, (error as RetryableError).retryAfterMs || 0)
            : null;
        const delay =
          requestedDelay !== null
            ? requestedDelay + Math.floor(Math.random() * 350)
            : Math.min(2_500, config.POW_RETRY_BASE_DELAY_MS + Math.max(0, attempt - 1) * 250) +
              Math.floor(Math.random() * 220);

        const message = error?.message || String(error);
        const shouldLogRetry = attempt === 1 || attempt === hardAttemptCap - 1 || attempt % 3 === 0;
        if (shouldLogRetry) {
          console.log(
            `[DeepSeekAPI] Failed to create DeepSeek session: ${message}. retry ${attempt}/${hardAttemptCap} (time_left_ms=${Math.max(0, retryDeadline - now)}) after ${delay}ms.`
          );
        }
        await sleep(delay);
      }
    }

    throw new Error('Failed to create DeepSeek session.');
  }

  async createPoWChallenge(targetPath: string) {
    const maxNonPendingAttempts = Math.max(1, config.POW_MAX_RETRIES + 1);
    const pendingWaitDeadline = Date.now() + Math.max(1_000, config.POW_PENDING_CHALLENGE_MAX_WAIT_MS);
    let nonPendingAttempt = 0;
    let pendingAttempt = 0;

    while (true) {
      try {
        const res = await this.client.post('/chat/create_pow_challenge', {
          target_path: targetPath
        });

        const challenge = res?.data?.data?.biz_data?.challenge;
        if (challenge) {
          if (targetPath.includes('/chat/completion')) {
            this.registerChatCompletionPowSuccess();
          }
          return challenge;
        }

        const detail = summarizePowResponse(res?.data);
        const status = Number.isFinite(res?.status) ? ` (HTTP ${res.status})` : '';
        const message = detail
          ? `Failed to create DeepSeek PoW challenge for ${targetPath}${status}: ${detail}`
          : `Failed to create DeepSeek PoW challenge for ${targetPath}${status}`;
        const missingChallengeError = new Error(message) as RetryableError;
        missingChallengeError.retryable =
          !isAuthorizationFailureText(detail) && !isInvalidPowTargetPathText(detail);
        if (res?.status === 202) {
          missingChallengeError.retryAfterMs = resolvePowPendingDelayMs(targetPath, config.POW_PENDING_CHALLENGE_DELAY_MS);
        }
        throw missingChallengeError;
      } catch (error: any) {
        const wrapped = buildPowChallengeError(targetPath, error);
        const isPending = isPendingPowChallengeError(error);
        const shouldRetry = isRetryablePowChallengeError(error);
        if (targetPath.includes('/file/upload_file')) {
          if (isPending) {
            this.enableDynamicUploadSerialization(
              'upload PoW pending responses',
              Math.max(60_000, config.POW_PENDING_CHALLENGE_MAX_WAIT_MS)
            );
          } else if (/http 429|rate limit|too many requests|resource exhausted/i.test(wrapped.message)) {
            this.enableDynamicUploadSerialization('upload rate limiting', 45_000);
          }
        }
        if (targetPath.includes('/chat/completion') && isPending) {
          this.registerChatCompletionPowPending();
        }
        const nonPendingRetryBudgetRemaining = nonPendingAttempt < maxNonPendingAttempts - 1;
        const pendingTimeRemaining = Date.now() < pendingWaitDeadline;

        if (!shouldRetry) {
          throw wrapped;
        }
        if (!isPending && !nonPendingRetryBudgetRemaining) {
          throw wrapped;
        }
        if (isPending && !pendingTimeRemaining) {
          throw wrapped;
        }

        if (isPending) {
          pendingAttempt += 1;
        } else {
          pendingAttempt = 0;
          nonPendingAttempt += 1;
        }

        const requestedDelay =
          typeof (error as RetryableError)?.retryAfterMs === 'number'
            ? Math.max(0, (error as RetryableError).retryAfterMs || 0)
            : null;
        const exponentialDelay = config.POW_RETRY_BASE_DELAY_MS * Math.pow(2, Math.max(0, nonPendingAttempt));
        const delay = (() => {
          if (isPending) {
            const basePendingDelay =
              requestedDelay !== null
                ? requestedDelay
                : resolvePowPendingDelayMs(targetPath, config.POW_PENDING_CHALLENGE_DELAY_MS);
            const adaptivePendingDelay = Math.min(
              Math.max(2_000, config.POW_PENDING_CHALLENGE_MAX_WAIT_MS),
              basePendingDelay + Math.max(0, pendingAttempt - 1) * 900
            );
            const remaining = Math.max(500, pendingWaitDeadline - Date.now());
            return Math.min(adaptivePendingDelay, remaining) + Math.floor(Math.random() * 220);
          }
          if (requestedDelay !== null) {
            return requestedDelay + Math.floor(Math.random() * 450);
          }
          return Math.min(exponentialDelay, config.POW_RETRY_MAX_DELAY_MS) + Math.floor(Math.random() * 250);
        })();
        const retryLabel = isPending
          ? `pending challenge retry (time_left_ms=${Math.max(0, pendingWaitDeadline - Date.now())})`
          : `retry ${nonPendingAttempt}/${maxNonPendingAttempts - 1}`;
        const shouldLogPendingRetry =
          !isPending || pendingAttempt === 1 || pendingAttempt % 4 === 0;
        if (shouldLogPendingRetry) {
          const logLine = `[DeepSeekAPI] ${wrapped.message}. ${retryLabel} after ${delay}ms.`;
          if (isPending) {
            console.log(logLine);
          } else {
            console.warn(logLine);
          }
        }
        await sleep(delay);
      }
    }
  }

  async getPoWChallenge() {
    return this.createPoWChallenge('/api/v0/chat/completion');
  }

  private registerChatCompletionPowPending() {
    const nextSpacing = Math.min(2_000, Math.max(200, this.chatStartSpacingMs + 150));
    if (nextSpacing !== this.chatStartSpacingMs) {
      this.chatStartSpacingMs = nextSpacing;
      console.log(
        `[DeepSeekAPI] Chat start spacing increased to ${this.chatStartSpacingMs}ms due to pending PoW challenges.`
      );
    }
    const nextGlobalSpacing = Math.min(1_500, Math.max(120, DeepSeekAPI.globalChatStartSpacingMs + 120));
    if (nextGlobalSpacing !== DeepSeekAPI.globalChatStartSpacingMs) {
      DeepSeekAPI.globalChatStartSpacingMs = nextGlobalSpacing;
      console.log(
        `[DeepSeekAPI] Global chat start spacing increased to ${DeepSeekAPI.globalChatStartSpacingMs}ms due to pending PoW challenges.`
      );
    }
    this.chatPowSuccessStreak = 0;
    DeepSeekAPI.globalChatPowSuccessStreak = 0;
  }

  private registerChatCompletionPowSuccess() {
    if (this.chatStartSpacingMs > 0) {
      this.chatPowSuccessStreak += 1;
      if (this.chatPowSuccessStreak >= 3) {
        this.chatPowSuccessStreak = 0;
        const nextSpacing = Math.max(0, this.chatStartSpacingMs - 100);
        if (nextSpacing !== this.chatStartSpacingMs) {
          this.chatStartSpacingMs = nextSpacing;
          if (this.chatStartSpacingMs > 0) {
            console.log(`[DeepSeekAPI] Chat start spacing reduced to ${this.chatStartSpacingMs}ms.`);
          } else {
            console.log('[DeepSeekAPI] Chat start spacing disabled (stable PoW challenge responses).');
          }
        }
      }
    }

    if (DeepSeekAPI.globalChatStartSpacingMs > 0) {
      DeepSeekAPI.globalChatPowSuccessStreak += 1;
      if (DeepSeekAPI.globalChatPowSuccessStreak >= 5) {
        DeepSeekAPI.globalChatPowSuccessStreak = 0;
        const nextGlobalSpacing = Math.max(0, DeepSeekAPI.globalChatStartSpacingMs - 80);
        if (nextGlobalSpacing !== DeepSeekAPI.globalChatStartSpacingMs) {
          DeepSeekAPI.globalChatStartSpacingMs = nextGlobalSpacing;
          if (DeepSeekAPI.globalChatStartSpacingMs > 0) {
            console.log(
              `[DeepSeekAPI] Global chat start spacing reduced to ${DeepSeekAPI.globalChatStartSpacingMs}ms.`
            );
          } else {
            console.log('[DeepSeekAPI] Global chat start spacing disabled (stable PoW challenge responses).');
          }
        }
      }
    }
  }

  private registerSessionCreateFailure() {
    const nextSpacing = Math.min(1_500, Math.max(150, DeepSeekAPI.globalSessionCreateSpacingMs + 120));
    if (nextSpacing !== DeepSeekAPI.globalSessionCreateSpacingMs) {
      DeepSeekAPI.globalSessionCreateSpacingMs = nextSpacing;
      console.log(
        `[DeepSeekAPI] Global session create spacing increased to ${DeepSeekAPI.globalSessionCreateSpacingMs}ms due to transient failures.`
      );
    }
    DeepSeekAPI.globalSessionCreateSuccessStreak = 0;
  }

  private registerSessionCreateSuccess() {
    if (DeepSeekAPI.globalSessionCreateSpacingMs <= 150) {
      return;
    }
    DeepSeekAPI.globalSessionCreateSuccessStreak += 1;
    if (DeepSeekAPI.globalSessionCreateSuccessStreak < 6) {
      return;
    }
    DeepSeekAPI.globalSessionCreateSuccessStreak = 0;
    const nextSpacing = Math.max(150, DeepSeekAPI.globalSessionCreateSpacingMs - 80);
    if (nextSpacing !== DeepSeekAPI.globalSessionCreateSpacingMs) {
      DeepSeekAPI.globalSessionCreateSpacingMs = nextSpacing;
      if (DeepSeekAPI.globalSessionCreateSpacingMs > 150) {
        console.log(
          `[DeepSeekAPI] Global session create spacing reduced to ${DeepSeekAPI.globalSessionCreateSpacingMs}ms.`
        );
      } else {
        console.log('[DeepSeekAPI] Global session create spacing reset to baseline.');
      }
    }
  }

  private async buildPowResponse(targetPath: string) {
    const powJob = async () => {
      await this.init();
      const challenge = await this.createPoWChallenge(targetPath);
      return DeepSeekAPI.powWorkerPool.solveChallenge(challenge);
    };

    const shouldSerializePowSolve =
      config.SERIALIZE_POW_SOLVE && !DeepSeekAPI.powWorkerPool.isEnabled();

    if (shouldSerializePowSolve) {
      return this.withSerializedPowSolve(powJob);
    }

    return powJob();
  }

  private async withSerializedPowSolve<T>(job: () => Promise<T>): Promise<T> {
    return withSerializedPowSolve(this.powSolveLock, (next) => {
      this.powSolveLock = next;
    }, job);
  }

  private async withSerializedUploadPipeline<T>(job: () => Promise<T>, label?: string): Promise<T> {
    return withSerializedUploadPipeline(this.uploadPipelineLock, (next) => {
      this.uploadPipelineLock = next;
    }, job, label);
  }

  private async withGlobalSerializedUploadPipeline<T>(job: () => Promise<T>, label?: string): Promise<T> {
    return withSerializedUploadPipeline(
      DeepSeekAPI.globalUploadPipelineLock,
      (next) => {
        DeepSeekAPI.globalUploadPipelineLock = next;
      },
      job,
      label
    );
  }

  private async withGlobalSessionCreateStart<T>(job: () => Promise<T>): Promise<T> {
    return withSerializedPowSolve(
      DeepSeekAPI.globalSessionCreateLock,
      (next) => {
        DeepSeekAPI.globalSessionCreateLock = next;
      },
      async () => {
        const waitMs = DeepSeekAPI.nextGlobalSessionCreateAt - Date.now();
        if (waitMs > 0) {
          await sleep(waitMs);
        }
        try {
          return await job();
        } finally {
          const spacing = Math.max(0, DeepSeekAPI.globalSessionCreateSpacingMs);
          DeepSeekAPI.nextGlobalSessionCreateAt = spacing > 0 ? Date.now() + spacing : Date.now();
        }
      }
    );
  }

  private async withGlobalChatStart<T>(job: () => Promise<T>): Promise<T> {
    return withSerializedPowSolve(
      DeepSeekAPI.globalChatStartLock,
      (next) => {
        DeepSeekAPI.globalChatStartLock = next;
      },
      async () => {
        const waitMs = DeepSeekAPI.nextGlobalChatStartAt - Date.now();
        if (waitMs > 0) {
          await sleep(waitMs);
        }
        try {
          return await job();
        } finally {
          const spacing = Math.max(0, DeepSeekAPI.globalChatStartSpacingMs);
          DeepSeekAPI.nextGlobalChatStartAt = spacing > 0 ? Date.now() + spacing : Date.now();
        }
      }
    );
  }

  private async withSerializedSessionCreate<T>(job: () => Promise<T>): Promise<T> {
    return withSerializedPowSolve(this.sessionCreateLock, (next) => {
      this.sessionCreateLock = next;
    }, () => this.withGlobalSessionCreateStart(job));
  }

  private async withSerializedChatStart<T>(job: () => Promise<T>): Promise<T> {
    return withSerializedPowSolve(this.chatStartLock, (next) => {
      this.chatStartLock = next;
    }, async () => {
      const waitMs = this.nextChatStartAt - Date.now();
      if (waitMs > 0) {
        await sleep(waitMs);
      }
      try {
        return await this.withGlobalChatStart(job);
      } finally {
        const spacing = Math.max(0, this.chatStartSpacingMs);
        this.nextChatStartAt = spacing > 0 ? Date.now() + spacing : Date.now();
      }
    });
  }

  private enableDynamicUploadSerialization(reason: string, durationMs: number) {
    const result = enableDynamicUploadSerialization(
      this.dynamicUploadSerializationUntil,
      reason,
      durationMs
    );
    this.dynamicUploadSerializationUntil = result.nextUntil;
    if (result.logMessage) {
      console.warn(result.logMessage);
    }
  }

  private shouldSerializeUploadPipeline() {
    const now = Date.now();
    return (
      config.SERIALIZE_UPLOAD_PIPELINE ||
      now < this.dynamicUploadSerializationUntil
    );
  }

  async uploadReferenceFile(filePath: string): Promise<DeepSeekFileInfo> {
    const absolutePath = path.resolve(filePath);
    if (!fs.existsSync(absolutePath)) {
      throw new Error(`Document file not found: ${absolutePath}`);
    }

    const uploadJob = async () => {
      const fileName = path.basename(absolutePath);
      const fileBuffer = fs.readFileSync(absolutePath);
      const fileBlob = new Blob([fileBuffer], { type: guessMimeType(fileName) });
      // Keep per-upload retries shallow so queue-level retries can redistribute quickly.
      const maxAttempts = Math.min(2, Math.max(1, config.MAX_RETRIES + 1));

      for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
        try {
          const form = new FormData();
          form.append('file', fileBlob, fileName);

          const powResponse = await this.buildPowResponse('/api/v0/file/upload_file');
          const requestTimeoutMs = Math.max(15_000, config.UPLOAD_REQUEST_TIMEOUT_MS);
          const controller = new AbortController();
          const timeout = setTimeout(() => {
            controller.abort();
          }, requestTimeoutMs);

          let response: Response;
          try {
            response = await fetch(`${DeepSeekAPI.BASE_URL}/file/upload_file`, {
              method: 'POST',
              headers: {
                authorization: `Bearer ${this.token}`,
                'x-ds-pow-response': powResponse,
                'user-agent': DeepSeekAPI.USER_AGENT
              },
              body: form,
              signal: controller.signal
            });
          } catch (error: any) {
            if (String(error?.name || '').toLowerCase() === 'aborterror') {
              const timeoutError = new Error(
                `DeepSeek file upload timed out after ${requestTimeoutMs}ms for ${fileName}`
              ) as RetryableError;
              timeoutError.retryable = true;
              throw timeoutError;
            }
            throw error;
          } finally {
            clearTimeout(timeout);
          }

          const bodyText = await response.text();
          let bodyJson: any = null;
          if (bodyText) {
            try {
              bodyJson = JSON.parse(bodyText);
            } catch {
              // handled below
            }
          }

          if (!response.ok) {
            const detail = bodyText ? `: ${bodyText.slice(0, 600)}` : '';
            const error = new Error(`DeepSeek file upload failed (HTTP ${response.status})${detail}`) as RetryableError;
            error.retryable = response.status === 408 || response.status === 409 || response.status === 425 || response.status === 429 || response.status >= 500;
            throw error;
          }

          const bizCode = bodyJson?.data?.biz_code;
          if (bizCode !== undefined && bizCode !== 0) {
            const bizMessage = bodyJson?.data?.biz_msg || 'Unknown upload error';
            const error = new Error(`DeepSeek file upload rejected: ${bizMessage} (biz_code=${bizCode})`) as RetryableError;
            error.retryable = /(rate limit|too many requests|try again|temporar|timeout|timed out|busy)/i.test(String(bizMessage || ''));
            throw error;
          }

          const candidateFile =
            bodyJson?.data?.biz_data?.file ||
            bodyJson?.data?.biz_data ||
            bodyJson?.data?.file ||
            bodyJson?.biz_data ||
            bodyJson?.file;
          const candidateId =
            candidateFile?.id ||
            candidateFile?.file_id ||
            candidateFile?.fileId ||
            bodyJson?.data?.biz_data?.id ||
            bodyJson?.data?.id ||
            bodyJson?.id;

          if (!candidateId) {
            const error = new Error(
              `DeepSeek upload response missing file id${response.status ? ` (HTTP ${response.status})` : ''}: ${bodyText.slice(0, 600)}`
            ) as RetryableError;
            error.retryable = true;
            if (response.status === 202) {
              error.retryAfterMs = resolvePowPendingDelayMs('/api/v0/file/upload_file', config.POW_PENDING_CHALLENGE_DELAY_MS);
            }
            throw error;
          }

          const normalizedFile = {
            ...candidateFile,
            id: String(candidateId),
            file_name: String(
              candidateFile?.file_name ||
                candidateFile?.name ||
                path.basename(absolutePath)
            ),
            file_size:
              candidateFile?.file_size === undefined || candidateFile?.file_size === null
                ? fileBuffer.length
                : candidateFile.file_size
          };

          return normalizeFileInfo(normalizedFile);
        } catch (error: any) {
          const message = String(error?.message || error || '');
          if (
            /timed out|timeout|socket|econnreset|network|too many requests|http 429|resource exhausted|service unavailable|server[_\s-]*is[_\s-]*busy|server.*busy/i.test(
              message
            )
          ) {
            this.enableDynamicUploadSerialization('upload transport instability', 120_000);
          }
          const retryable = (error as RetryableError)?.retryable !== false;
          if (!retryable || attempt >= maxAttempts) {
            throw error;
          }

          const retryDelayMs =
            typeof (error as RetryableError)?.retryAfterMs === 'number'
              ? Math.max(0, (error as RetryableError).retryAfterMs || 0) + Math.floor(Math.random() * 350)
              : Math.min(
                  config.POW_RETRY_BASE_DELAY_MS * Math.pow(2, Math.max(0, attempt - 1)),
                  config.POW_RETRY_MAX_DELAY_MS
                ) + Math.floor(Math.random() * 250);

          console.warn(
            `[DeepSeekAPI] Upload attempt ${attempt}/${maxAttempts} failed for ${fileName}: ${error?.message || String(error)}. Retrying after ${retryDelayMs}ms.`
          );
          await sleep(retryDelayMs);
        }
      }

      throw new Error(`DeepSeek upload failed for ${fileName}`);
    };

    if (config.SERIALIZE_UPLOAD_PIPELINE) {
      return this.withGlobalSerializedUploadPipeline(uploadJob, path.basename(absolutePath));
    }

    if (this.shouldSerializeUploadPipeline()) {
      return this.withSerializedUploadPipeline(uploadJob, path.basename(absolutePath));
    }

    return uploadJob();
  }

  async fetchFiles(fileIds: string[]): Promise<DeepSeekFileInfo[]> {
    return fetchDeepSeekFiles(this.client, fileIds);
  }

  async waitForFileReady(fileId: string, options: DeepSeekWaitForFileOptions = {}): Promise<DeepSeekFileInfo> {
    return waitForDeepSeekFileReady({
      client: this.client,
      fileId,
      options,
      sleep
    });
  }

  async *chatCompletion(
    sessionId: string,
    prompt: string,
    searchEnabled: boolean = config.ENABLE_WEB_SEARCH,
    refFileIds: string[] = []
  ): AsyncGenerator<DeepSeekStreamChunk> {
    const res = await this.withSerializedChatStart(async () => {
      const powResponse = await this.buildPowResponse('/api/v0/chat/completion');

      return this.client.post('/chat/completion', {
        chat_session_id: sessionId,
        prompt,
        ref_file_ids: refFileIds,
        thinking_enabled: true,
        search_enabled: searchEnabled
      }, {
        headers: { 'x-ds-pow-response': powResponse },
        responseType: 'stream',
        timeout: config.STREAM_REQUEST_TIMEOUT_MS
      });
    });

    const stream = res.data;
    let currentPath: string | null = null;
    let buffer = '';

    for await (const chunk of stream) {
      buffer += chunk.toString('utf8');

      let delimiterIndex = buffer.indexOf('\n\n');
      while (delimiterIndex !== -1) {
        const rawEvent = buffer.slice(0, delimiterIndex);
        buffer = buffer.slice(delimiterIndex + 2);

        const parsedEvent = parseSSEEvent(rawEvent);
        const payload = parsedEvent.payload;
        if (!payload || payload === '[DONE]') {
          delimiterIndex = buffer.indexOf('\n\n');
          continue;
        }

        if (parsedEvent.eventType === 'toast') {
          try {
            const toast = JSON.parse(payload);
            if (toast?.type === 'error') {
              const finishReason = toast?.finish_reason ? ` (${toast.finish_reason})` : '';
              const content = toast?.content || 'Unknown DeepSeek toast error';
              throw new Error(`DeepSeek toast error: ${content}${finishReason}`);
            }
          } catch (error: any) {
            if (error instanceof Error) {
              throw error;
            }
            throw new Error(`DeepSeek toast error: ${payload}`);
          }
          delimiterIndex = buffer.indexOf('\n\n');
          continue;
        }

        const parsed = parseStreamPayload(payload, currentPath);
        currentPath = parsed.currentPath;
        if (parsed.chunk) {
          yield parsed.chunk;
        }

        delimiterIndex = buffer.indexOf('\n\n');
      }
    }

    if (buffer.trim()) {
      const parsedEvent = parseSSEEvent(buffer);
      const payload = parsedEvent.payload;
      if (payload && payload !== '[DONE]') {
        if (parsedEvent.eventType === 'toast') {
          try {
            const toast = JSON.parse(payload);
            if (toast?.type === 'error') {
              const finishReason = toast?.finish_reason ? ` (${toast.finish_reason})` : '';
              const content = toast?.content || 'Unknown DeepSeek toast error';
              throw new Error(`DeepSeek toast error: ${content}${finishReason}`);
            }
          } catch (error: any) {
            if (error instanceof Error) {
              throw error;
            }
            throw new Error(`DeepSeek toast error: ${payload}`);
          }
          return;
        }

        const parsed = parseStreamPayload(payload, currentPath);
        if (parsed.chunk) {
          yield parsed.chunk;
        }
      }
    }
  }
}
