import fs from 'fs';
import path from 'path';
import { WASI } from 'node:wasi';
import { env } from 'process';
import { config } from '../deep-config';

export class DeepSeekPOW {
  private instance: WebAssembly.Instance | null = null;
  private memory: WebAssembly.Memory | null = null;
  private readonly wasmPathOverride?: string;

  constructor(wasmPathOverride?: string) {
    this.wasmPathOverride = wasmPathOverride;
  }

  async init() {
    if (this.instance) return;

    const wasmPath = path.resolve(process.cwd(), this.wasmPathOverride || config.WASM_PATH);
    if (!fs.existsSync(wasmPath)) {
      throw new Error(`WASM file not found at: ${wasmPath}`);
    }

    const wasmBuffer = fs.readFileSync(wasmPath);
    const wasi = new WASI({ version: 'preview1', args: [], env });
    const wasmModule = await WebAssembly.compile(wasmBuffer);
    this.instance = await WebAssembly.instantiate(wasmModule, {
      wasi_snapshot_preview1: wasi.wasiImport
    });
    this.memory = this.instance.exports.memory as WebAssembly.Memory;
  }

  private writeToMemory(text: string): [number, number] {
    const encoder = new TextEncoder();
    const encoded = encoder.encode(text);
    const ptr = (this.instance!.exports.__wbindgen_export_0 as Function)(encoded.length, 1) as number;
    new Uint8Array(this.memory!.buffer).set(encoded, ptr);
    return [ptr, encoded.length];
  }

  solveChallenge(challengeConfig: any): string {
    if (!this.instance) {
      throw new Error('WASM not initialized');
    }

    const { salt, expire_at, difficulty, challenge, signature, target_path, algorithm } = challengeConfig;
    const prefix = `${salt}_${expire_at}_`;
    const retptr = (this.instance.exports.__wbindgen_add_to_stack_pointer as Function)(-16) as number;

    try {
      const [challengePtr, challengeLen] = this.writeToMemory(challenge);
      const [prefixPtr, prefixLen] = this.writeToMemory(prefix);

      (this.instance.exports.wasm_solve as Function)(
        retptr,
        challengePtr,
        challengeLen,
        prefixPtr,
        prefixLen,
        difficulty
      );

      const memoryView = new DataView(this.memory!.buffer);
      const status = memoryView.getInt32(retptr, true);
      if (status === 0) {
        return '';
      }

      const answer = memoryView.getFloat64(retptr + 8, true);
      return Buffer.from(
        JSON.stringify({
          algorithm,
          challenge,
          salt,
          answer: Number(answer),
          signature,
          target_path
        })
      ).toString('base64');
    } finally {
      (this.instance.exports.__wbindgen_add_to_stack_pointer as Function)(16);
    }
  }
}
