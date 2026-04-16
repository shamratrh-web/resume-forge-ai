export async function sleep(ms: number) {
  await new Promise<void>((resolve) => setTimeout(resolve, ms));
}

async function withSerializedLock<T>(
  currentLock: Promise<void>,
  setLock: (lock: Promise<void>) => void,
  job: () => Promise<T>,
  onAcquired?: (waitedMs: number) => void
): Promise<T> {
  const previous = currentLock.catch(() => {});
  let release!: () => void;
  setLock(new Promise<void>((resolve) => { release = resolve; }));
  const waitStartedAt = Date.now();
  await previous;
  if (onAcquired) {
    onAcquired(Date.now() - waitStartedAt);
  }
  try {
    return await job();
  } finally {
    release();
  }
}

export async function withSerializedPowSolve<T>(
  lock: Promise<void>,
  setLock: (next: Promise<void>) => void,
  job: () => Promise<T>
): Promise<T> {
  return withSerializedLock(lock, setLock, job);
}

export async function withSerializedUploadPipeline<T>(
  lock: Promise<void>,
  setLock: (next: Promise<void>) => void,
  job: () => Promise<T>,
  label?: string
): Promise<T> {
  return withSerializedLock(lock, setLock, job, (waitedMs) => {
    if (waitedMs > 25) {
      console.log(
        `[DeepSeekAPI] Upload pipeline slot acquired after ${(waitedMs / 1000).toFixed(2)}s${label ? ` (${label})` : ''}.`
      );
    }
  });
}

export function enableDynamicUploadSerialization(
  previousUntil: number,
  reason: string,
  durationMs: number
): { nextUntil: number; logMessage: string | null } {
  const now = Date.now();
  const nextUntil = Math.max(previousUntil, now + Math.max(5_000, durationMs));
  if (now >= previousUntil) {
    const seconds = (Math.max(0, nextUntil - now) / 1000).toFixed(0);
    return {
      nextUntil,
      logMessage: `[DeepSeekAPI] Enabling temporary upload serialization for ${seconds}s due to ${reason}.`
    };
  }
  return { nextUntil, logMessage: null };
}
