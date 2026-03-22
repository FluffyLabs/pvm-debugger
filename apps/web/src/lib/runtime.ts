import type { PvmAdapter } from "@pvmdbg/types";
import { WorkerBridge } from "@pvmdbg/runtime-worker";
import TypeberryWorker from "../workers/typeberry.worker.ts?worker";
import AnanasWorker from "../workers/ananas.worker.ts?worker";

/**
 * Create a PVM adapter for the given PVM id.
 * Supported: "typeberry" (reference interpreter), "ananas" (alternative WASM interpreter).
 */
export function createPvmAdapter(pvmId: string): PvmAdapter {
  switch (pvmId) {
    case "typeberry": {
      const worker = new TypeberryWorker();
      return new WorkerBridge("typeberry", "Typeberry", worker);
    }
    case "ananas": {
      const worker = new AnanasWorker();
      return new WorkerBridge("ananas", "Ananas", worker);
    }
    default:
      throw new Error(`Unknown PVM: ${pvmId}`);
  }
}
