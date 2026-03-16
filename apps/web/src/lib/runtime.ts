import type { PvmAdapter } from "@pvmdbg/types";
import { WorkerBridge } from "@pvmdbg/runtime-worker";
import TypeberryWorker from "../workers/typeberry.worker.ts?worker";

/**
 * Create a PVM adapter for the given PVM id.
 * Currently only "typeberry" is supported via the browser worker bridge.
 */
export function createPvmAdapter(pvmId: string): PvmAdapter {
  switch (pvmId) {
    case "typeberry": {
      const worker = new TypeberryWorker();
      return new WorkerBridge("typeberry", "Typeberry", worker);
    }
    default:
      throw new Error(`Unknown PVM: ${pvmId}`);
  }
}
