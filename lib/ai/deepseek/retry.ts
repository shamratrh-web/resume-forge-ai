import axios from 'axios';

export type RetryableError = Error & {
  retryable?: boolean;
  retryAfterMs?: number;
};

export function summarizePowResponse(data: any): string {
  if (data === undefined || data === null) return '';
  if (typeof data === 'string') {
    const trimmed = data.trim();
    return trimmed ? trimmed.slice(0, 300) : '<empty response body>';
  }

  const bizCode = data?.data?.biz_code;
  const bizMsg = data?.data?.biz_msg;
  const message = data?.message || data?.msg;
  const parts: string[] = [];
  if (bizCode !== undefined && bizCode !== null) parts.push(`biz_code=${String(bizCode)}`);
  if (bizMsg) parts.push(`biz_msg=${String(bizMsg)}`);
  if (message && String(message) !== String(bizMsg || '')) parts.push(`message=${String(message)}`);
  if (parts.length > 0) return parts.join(', ');
  try {
    return JSON.stringify(data).slice(0, 300);
  } catch {
    return '';
  }
}

export function buildPowChallengeError(targetPath: string, error: any): Error {
  const prefix = `Failed to create DeepSeek PoW challenge for ${targetPath}`;
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    const responseSummary = summarizePowResponse(error.response?.data);
    const statusPart = status ? ` (HTTP ${status})` : '';
    const detailPart = responseSummary ? `: ${responseSummary}` : error.message ? `: ${error.message}` : '';
    return new Error(`${prefix}${statusPart}${detailPart}`);
  }
  if (error instanceof Error) {
    if (error.message.startsWith(prefix)) return error;
    return new Error(`${prefix}: ${error.message}`);
  }
  return new Error(`${prefix}: ${String(error)}`);
}

export function isAuthorizationFailureText(text: string): boolean {
  return /(authorization failed|unauthorized|forbidden|invalid token|token expired)/i.test(String(text || ''));
}

export function isInvalidPowTargetPathText(text: string): boolean {
  return /(invalid[_\s-]*target[_\s-]*path)/i.test(String(text || ''));
}

export function resolvePowPendingDelayMs(targetPath: string, maxPendingMs: number): number {
  if (targetPath.includes('/file/upload_file') || targetPath.includes('/chat/completion')) {
    return Math.min(maxPendingMs, 2_000);
  }
  return Math.min(maxPendingMs, 5_000);
}

export function isPendingPowChallengeError(error: any): boolean {
  if (axios.isAxiosError(error)) return error.response?.status === 202;
  if (error && typeof error === 'object') {
    if (typeof (error as RetryableError).retryAfterMs === 'number') return true;
    const text = String((error as Error).message || '');
    if (isInvalidPowTargetPathText(text)) return false;
    return /HTTP 202|pending challenge|time_left_ms|challenge pending/i.test(text);
  }
  if (!(error instanceof Error)) return false;
  if (isInvalidPowTargetPathText(error.message)) return false;
  return /HTTP 202|pending challenge|time_left_ms|challenge pending/i.test(error.message);
}

export function isRetryablePowChallengeError(error: any): boolean {
  if (error && typeof error === 'object' && (error as RetryableError).retryable === true) return true;
  if (error && typeof error === 'object' && (error as RetryableError).retryable === false) return false;
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    if (status === 401 || status === 403) return false;
    if (status === 408 || status === 409 || status === 425 || status === 429) return true;
    if (status !== undefined && status >= 500) return true;
    const responseText = summarizePowResponse(error.response?.data);
    if (/(rate limit|too many requests|messages too frequent|try again|temporar|timeout|timed out|resource exhausted)/i.test(responseText)) {
      return true;
    }
    if (!error.response) return true;
  }
  const text = error instanceof Error ? error.message : typeof error === 'string' ? error : JSON.stringify(error);
  if (isInvalidPowTargetPathText(text)) return false;
  if (/unauthorized|forbidden|invalid token|token expired/i.test(text)) return false;
  return /(rate limit|too many requests|messages too frequent|temporar|timeout|timed out|econnreset|network)/i.test(text);
}

export function isRetryableRequestError(error: any): boolean {
  if (error && typeof error === 'object' && (error as RetryableError).retryable === true) return true;
  if (error && typeof error === 'object' && (error as RetryableError).retryable === false) return false;
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    if (status === 401 || status === 403) return false;
    if (status === 202 || status === 408 || status === 409 || status === 425 || status === 429) return true;
    if (status !== undefined && status >= 500) return true;
    const responseText = summarizePowResponse(error.response?.data);
    if (/(rate limit|too many requests|messages too frequent|try again|temporar|timeout|timed out|resource exhausted|pending|challenge)/i.test(responseText)) {
      return true;
    }
    if (!error.response) return true;
  }
  const text = error instanceof Error ? error.message : typeof error === 'string' ? error : JSON.stringify(error);
  if (isInvalidPowTargetPathText(text)) return false;
  if (/unauthorized|forbidden|invalid token|token expired/i.test(text)) return false;
  return /(rate limit|too many requests|messages too frequent|temporar|timeout|timed out|econnreset|network|pending|challenge|service unavailable)/i.test(text);
}
