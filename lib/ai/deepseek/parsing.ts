import { DeepSeekStreamChunk } from '../DeepSeek';

export function parseSSEEvent(eventChunk: string): { eventType: string | null; payload: string } {
  const dataLines: string[] = [];
  let eventType: string | null = null;
  const lines = eventChunk.split(/\r?\n/);
  for (const line of lines) {
    if (line.startsWith('event:')) {
      eventType = line.slice(6).trim();
      continue;
    }
    if (line.startsWith('data:')) {
      dataLines.push(line.slice(5).trimStart());
    }
  }
  return { eventType, payload: dataLines.join('\n').trim() };
}

export function parseStreamPayload(
  payload: string,
  currentPath: string | null
): { currentPath: string | null; chunk: DeepSeekStreamChunk | null } {
  let pathCursor = currentPath;
  try {
    const json = JSON.parse(payload);
    if (typeof json?.p === 'string') {
      pathCursor = json.p;
    }
    if (json?.v === undefined) {
      return { currentPath: pathCursor, chunk: null };
    }

    const value = json.v;
    const pathValue = pathCursor || '';

    if (pathValue.includes('search_results')) {
      if (Array.isArray(value)) {
        return { currentPath: pathCursor, chunk: { sources: value } };
      }
      if (value && Array.isArray((value as any).items)) {
        return { currentPath: pathCursor, chunk: { sources: (value as any).items } };
      }
      return { currentPath: pathCursor, chunk: null };
    }

    if (typeof value === 'object' && value !== null) {
      return { currentPath: pathCursor, chunk: null };
    }

    const text = String(value);
    if (!text || text === 'SEARCHING' || text === 'FINISHED') {
      return { currentPath: pathCursor, chunk: null };
    }

    if (pathValue.includes('thinking_content') || pathValue.includes('/thinking')) {
      return { currentPath: pathCursor, chunk: { thinking: text } };
    }

    if (pathValue === 'response/content' || pathValue.endsWith('/content') || pathValue.includes('/response/content')) {
      return { currentPath: pathCursor, chunk: { content: text } };
    }

    if (typeof value === 'string') {
      return { currentPath: pathCursor, chunk: { content: text } };
    }
  } catch {
    // ignore malformed/non-json payload fragments
  }
  return { currentPath: pathCursor, chunk: null };
}
