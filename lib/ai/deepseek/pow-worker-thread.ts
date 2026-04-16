import { parentPort, workerData } from 'worker_threads';
import { DeepSeekPOW } from './pow';

type PowSolveRequest = {
  id: number;
  challenge: any;
};

type PowWorkerData = {
  wasmPath?: string;
};

if (!parentPort) {
  throw new Error('pow-worker-thread must run inside a worker thread');
}
const port = parentPort;

const data = (workerData || {}) as PowWorkerData;
const pow = new DeepSeekPOW(data.wasmPath);

async function bootstrap() {
  await pow.init();
  port.postMessage({ type: 'ready' });
}

port.on('message', (request: PowSolveRequest) => {
  if (!request || typeof request.id !== 'number') {
    return;
  }

  try {
    const powResponse = pow.solveChallenge(request.challenge);
    port.postMessage({
      id: request.id,
      powResponse
    });
  } catch (error: any) {
    port.postMessage({
      id: request.id,
      error: error?.message || String(error)
    });
  }
});

bootstrap().catch((error: any) => {
  port.postMessage({
    type: 'fatal',
    error: error?.message || String(error)
  });
  process.exit(1);
});
