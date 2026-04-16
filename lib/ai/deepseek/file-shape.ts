import path from 'path';
import { DeepSeekFileInfo } from '../DeepSeek';

export function extractSessionId(payload: any) {
  const candidates = [
    payload?.data?.biz_data?.id,
    payload?.data?.biz_data?.chat_session_id,
    payload?.data?.biz_data?.chatSessionId,
    payload?.data?.chat_session_id,
    payload?.data?.chatSessionId,
    payload?.chat_session_id,
    payload?.chatSessionId,
    payload?.id
  ];
  for (const value of candidates) {
    if (value === undefined || value === null) continue;
    const normalized = String(value).trim();
    if (normalized) return normalized;
  }
  return '';
}

export function normalizeFileInfo(raw: any): DeepSeekFileInfo {
  return {
    id: String(raw?.id || ''),
    status: String(raw?.status || ''),
    fileName: String(raw?.file_name || ''),
    previewable: Boolean(raw?.previewable),
    fileSize: Number(raw?.file_size || 0),
    tokenUsage: raw?.token_usage === null || raw?.token_usage === undefined ? null : Number(raw.token_usage),
    errorCode: raw?.error_code === null || raw?.error_code === undefined ? null : String(raw.error_code),
    insertedAt: raw?.inserted_at === undefined || raw?.inserted_at === null ? null : Number(raw.inserted_at),
    updatedAt: raw?.updated_at === undefined || raw?.updated_at === null ? null : Number(raw.updated_at)
  };
}

export function guessMimeType(fileName: string) {
  const extension = path.extname(fileName).toLowerCase();
  const map: Record<string, string> = {
    '.pdf': 'application/pdf',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.ppt': 'application/vnd.ms-powerpoint',
    '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    '.xls': 'application/vnd.ms-excel',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.csv': 'text/csv',
    '.tsv': 'text/tab-separated-values',
    '.tab': 'text/plain',
    '.md': 'text/markdown',
    '.markdown': 'text/markdown',
    '.html': 'text/html',
    '.htm': 'text/html',
    '.txt': 'text/plain',
    '.rtf': 'application/rtf',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
    '.bmp': 'image/bmp',
    '.gif': 'image/gif',
    '.tif': 'image/tiff',
    '.tiff': 'image/tiff'
  };
  return map[extension] || 'application/octet-stream';
}

export function extractFilesPayload(payload: any): any[] {
  const candidates = [
    payload?.data?.biz_data?.files,
    payload?.data?.biz_data,
    payload?.data?.files,
    payload?.biz_data?.files,
    payload?.biz_data,
    payload?.files,
    payload
  ];
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate;
    if (candidate && typeof candidate === 'object') {
      if (Array.isArray((candidate as any).items)) {
        return (candidate as any).items;
      }
      const values = Object.values(candidate as Record<string, any>);
      if (values.length > 0 && values.every((value) => value && typeof value === 'object')) {
        return values;
      }
      if ((candidate as any).id || (candidate as any).file_id || (candidate as any).fileId) {
        return [candidate];
      }
    }
  }
  return [];
}
