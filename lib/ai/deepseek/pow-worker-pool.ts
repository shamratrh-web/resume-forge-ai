import fs from 'fs';
import path from 'path';
import { Worker } from 'worker_threads';
import { config } from '../deep-config';
import { DeepSeekPOW } from './pow';

type PowWorkerResponse =
  | { type: 'ready' }
  | { type: 'fatal'; error: string }
  | { id: number; powResponse?: string; error?: string };

type PowTask = {
  id: number;
  challenge: any;
  resolve: (value: string) => void;
  reject: (error: Error) => void;
  workerIndex: number | null;
};

type PowWorkerSlot = {
  index: number;
  worker: Worker;
  ready: boolean;
  busy: boolean;
  inFlightTaskId: number | null;
};

export class DeepSeekPowWorkerPool {
  private static sharedInstance: DeepSeekPowWorkerPool | null = null;

  static getShared() {
    if (!DeepSeekPowWorkerPool.sharedInstance) {
      DeepSeekPowWorkerPool.sharedInstance = new DeepSeekPowWorkerPool();
    }
    return DeepSeekPowWorkerPool.sharedInstance;
  }

  private readonly enabled: boolean;
  private readonly poolSize: number;
  private readonly readyTimeoutMs: number;
  private readonly restartDelayMs: number;
  private readonly workerScriptPath: string;
  private readonly wasmPath: string;
  private readonly workers: PowWorkerSlot[] = [];
  private readonly queue: PowTask[] = [];
  private readonly tasksById = new Map<number, PowTask>();
  private nextTaskId = 1;
  private initPromise: Promise<void> | null = null;
  private shuttingDown = false;
  private fallbackPow = new DeepSeekPOW();
  private fallbackPowInitPromise: Promise<void> | null = null;

  private constructor() {
    this.enabled = config.POW_WORKER_POOL_ENABLED !== false;
    this.poolSize = Math.max(1, config.POW_WORKER_POOL_SIZE || 1);
    this.readyTimeoutMs = Math.max(1_000, config.POW_WORKER_READY_TIMEOUT_MS || 15_000);
    this.restartDelayMs = Math.max(100, config.POW_WORKER_RESTART_DELAY_MS || 1_500);
    this.workerScriptPath = path.resolve(__dirname, 'pow-worker-thread.js');
    this.wasmPath = path.resolve(process.cwd(), config.WASM_PATH);
  }

  isEnabled() {
    return this.enabled && fs.existsSync(this.workerScriptPath) && fs.existsSync(this.wasmPath);
  }

  async init() {
    if (!this.isEnabled()) {
      return;
    }
    if (!this.initPromise) {
      this.initPromise = this.initWorkers().catch((error) => {
        this.initPromise = null;
        throw error;
      });
    }
    await this.initPromise;
  }

  async solveChallenge(challenge: any) {
    if (!this.isEnabled()) {
      return this.solveWithFallback(challenge);
    }

    try {
      await this.init();
    } catch (error) {
      return this.solveWithFallback(challenge);
    }

    if (!this.workers.some((slot) => slot.ready)) {
      return this.solveWithFallback(challenge);
    }

    return new Promise<string>((resolve, reject) => {
      const id = this.nextTaskId++;
      const task: PowTask = {
        id,
        challenge,
        resolve,
        reject,
        workerIndex: null
      };
      this.tasksById.set(id, task);
      this.queue.push(task);
      this.dispatch();
    });
  }

  async shutdown() {
    this.shuttingDown = true;
    const workerStops = this.workers.map((slot) => slot.worker.terminate().catch(() => undefined));
    await Promise.all(workerStops);
    this.workers.length = 0;
  }

  private async initWorkers() {
    if (!fs.existsSync(this.workerScriptPath)) {
      throw new Error(`PoW worker script missing: ${this.workerScriptPath}`);
    }
    if (!fs.existsSync(this.wasmPath)) {
      throw new Error(`PoW WASM missing: ${this.wasmPath}`);
    }

    for (let index = 0; index < this.poolSize; index += 1) {
      this.spawnWorker(index);
    }

    const startedAt = Date.now();
    let firstReadyAt: number | null = null;
    const warmupWindowMs = 2_000;
    while (true) {
      const readyCount = this.workers.filter((slot) => slot.ready).length;
      if (readyCount >= 1 && firstReadyAt === null) {
        firstReadyAt = Date.now();
      }

      const warmupSatisfied =
        readyCount >= this.poolSize ||
        (firstReadyAt !== null && Date.now() - firstReadyAt >= warmupWindowMs);

      if (readyCount >= 1 && warmupSatisfied) {
        if (readyCount < this.poolSize) {
          console.warn(
            `[DeepSeekAPI] PoW pool initialized with ${readyCount}/${this.poolSize} ready worker(s).`
          );
        } else {
          console.log(`[DeepSeekAPI] PoW pool initialized (${readyCount} worker(s)).`);
        }
        return;
      }

      if (Date.now() - startedAt > this.readyTimeoutMs) {
        if (readyCount >= 1) {
          console.warn(
            `[DeepSeekAPI] PoW pool startup reached timeout with ${readyCount}/${this.poolSize} ready worker(s). Proceeding.`
          );
          return;
        }
        throw new Error(`PoW pool startup timed out after ${this.readyTimeoutMs}ms.`);
      }

      await new Promise<void>((resolve) => setTimeout(resolve, 50));
    }
  }

  private spawnWorker(index: number) {
    const worker = new Worker(this.workerScriptPath, {
      workerData: {
        wasmPath: this.wasmPath
      }
    });

    const slot: PowWorkerSlot = {
      index,
      worker,
      ready: false,
      busy: false,
      inFlightTaskId: null
    };
    this.workers[index] = slot;

    worker.on('message', (message: PowWorkerResponse) => {
      this.handleWorkerMessage(index, message);
    });

    worker.on('error', (error: any) => {
      console.error(
        `[DeepSeekAPI] PoW worker ${index + 1} error: ${error?.message || String(error)}`
      );
    });

    worker.on('exit', (code) => {
      const current = this.workers[index];
      if (!current || current.worker !== worker) {
        return;
      }

      const inFlightTaskId = current.inFlightTaskId;
      if (inFlightTaskId !== null) {
        const task = this.tasksById.get(inFlightTaskId);
        if (task) {
          this.tasksById.delete(inFlightTaskId);
          const error = new Error(
            `PoW worker ${index + 1} exited during challenge solve (code=${code}).`
          );
          task.reject(error);
        }
      }

      this.workers[index] = {
        index,
        worker,
        ready: false,
        busy: false,
        inFlightTaskId: null
      };

      if (this.shuttingDown) {
        return;
      }

      setTimeout(() => {
        if (this.shuttingDown) return;
        this.spawnWorker(index);
      }, this.restartDelayMs).unref?.();
    });
  }

  private handleWorkerMessage(index: number, message: PowWorkerResponse) {
    const slot = this.workers[index];
    if (!slot) {
      return;
    }

    if ((message as any)?.type === 'ready') {
      slot.ready = true;
      slot.busy = false;
      slot.inFlightTaskId = null;
      this.dispatch();
      return;
    }

    if ((message as any)?.type === 'fatal') {
      const detail = String((message as any)?.error || 'unknown error');
      console.error(`[DeepSeekAPI] PoW worker ${index + 1} fatal: ${detail}`);
      return;
    }

    const taskId = Number((message as any)?.id);
    if (!Number.isFinite(taskId)) {
      return;
    }

    const task = this.tasksById.get(taskId);
    if (!task) {
      slot.busy = false;
      slot.inFlightTaskId = null;
      this.dispatch();
      return;
    }

    this.tasksById.delete(taskId);
    slot.busy = false;
    slot.inFlightTaskId = null;

    const errorText = String((message as any)?.error || '');
    const powResponse = String((message as any)?.powResponse || '');
    if (errorText) {
      task.reject(new Error(errorText));
    } else if (!powResponse) {
      task.reject(new Error('PoW worker returned empty response.'));
    } else {
      task.resolve(powResponse);
    }

    this.dispatch();
  }

  private dispatch() {
    for (const slot of this.workers) {
      if (!slot || !slot.ready || slot.busy) {
        continue;
      }
      const task = this.queue.shift();
      if (!task) {
        return;
      }

      slot.busy = true;
      slot.inFlightTaskId = task.id;
      task.workerIndex = slot.index;

      try {
        slot.worker.postMessage({
          id: task.id,
          challenge: task.challenge
        });
      } catch (error: any) {
        slot.busy = false;
        slot.inFlightTaskId = null;
        this.tasksById.delete(task.id);
        task.reject(new Error(error?.message || String(error)));
      }
    }
  }

  private async initFallbackPow() {
    if (!this.fallbackPowInitPromise) {
      this.fallbackPowInitPromise = this.fallbackPow.init().catch((error) => {
        this.fallbackPowInitPromise = null;
        throw error;
      });
    }
    await this.fallbackPowInitPromise;
  }

  private async solveWithFallback(challenge: any) {
    await this.initFallbackPow();
    return this.fallbackPow.solveChallenge(challenge);
  }
}
