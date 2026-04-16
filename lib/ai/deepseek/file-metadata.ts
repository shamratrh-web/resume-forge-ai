import { AxiosInstance } from 'axios';
import { config } from '../deep-config';
import { extractFilesPayload, normalizeFileInfo } from './file-shape';
import { isRetryableRequestError } from './retry';

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

export type WaitForFileOptions = {
  timeoutMs?: number;
  pollIntervalMs?: number;
  missingMetadataGraceMs?: number;
};

export async function fetchFiles(client: AxiosInstance, fileIds: string[]): Promise<DeepSeekFileInfo[]> {
  if (fileIds.length === 0) return [];
  const query = new URLSearchParams();
  for (const fileId of fileIds) {
    query.append('file_ids', fileId);
  }
  const res = await client.get(`/file/fetch_files?${query.toString()}`);
  const files = extractFilesPayload(res?.data);
  if (!Array.isArray(files) || files.length === 0) return [];
  return files.map((item: any) => normalizeFileInfo(item));
}

export async function waitForFileReady(params: {
  client: AxiosInstance;
  fileId: string;
  options?: WaitForFileOptions;
  sleep: (ms: number) => Promise<void>;
}): Promise<DeepSeekFileInfo> {
  const { client, fileId, sleep } = params;
  const options = params.options || {};
  const timeoutMs = options.timeoutMs ?? 120_000;
  const pollIntervalMs = options.pollIntervalMs ?? 1_500;
  const missingMetadataGraceMs = options.missingMetadataGraceMs ?? config.FILE_METADATA_MISSING_GRACE_MS;
  const start = Date.now();
  let firstMissingMetadataAt: number | null = null;
  let lastFetchErrorAt: number | null = null;
  let fetchFailureCount = 0;

  while (Date.now() - start <= timeoutMs) {
    let file: DeepSeekFileInfo | undefined;
    try {
      const files = await fetchFiles(client, [fileId]);
      file = files.find((item) => String(item.id || '') === String(fileId)) || files[0];
      lastFetchErrorAt = null;
      fetchFailureCount = 0;
    } catch (error: any) {
      fetchFailureCount += 1;
      const message = error?.message || String(error);
      if (!isRetryableRequestError(error)) {
        throw error;
      }

      const now = Date.now();
      if (lastFetchErrorAt === null) {
        lastFetchErrorAt = now;
      }
      if (now - lastFetchErrorAt > timeoutMs) {
        throw new Error(`Timed out while fetching DeepSeek metadata for file ${fileId}: ${message}`);
      }

      const transientDelayMs = Math.min(5_000, pollIntervalMs + fetchFailureCount * 300);
      console.log(
        `[DeepSeekAPI] Transient metadata fetch failure for file ${fileId}: ${message}. Retrying in ${transientDelayMs}ms.`
      );
      await sleep(transientDelayMs);
      continue;
    }

    if (!file) {
      if (firstMissingMetadataAt === null) {
        firstMissingMetadataAt = Date.now();
      }
      if (Date.now() - firstMissingMetadataAt > missingMetadataGraceMs) {
        throw new Error(`DeepSeek did not return metadata for file id ${fileId}`);
      }
      await sleep(pollIntervalMs);
      continue;
    }

    firstMissingMetadataAt = null;
    const status = String(file.status || '').toUpperCase();
    if (status === 'SUCCESS') return file;
    if (status === 'FAILED') {
      throw new Error(`DeepSeek failed to parse ${file.fileName || fileId}: ${file.errorCode || 'unknown file processing error'}`);
    }

    await sleep(pollIntervalMs);
  }

  throw new Error(`Timed out waiting for DeepSeek to finish file ${fileId}`);
}
