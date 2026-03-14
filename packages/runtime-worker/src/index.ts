// Public API for @pvmdbg/runtime-worker

// Sync interpreter interface
export type { SyncPvmInterpreter } from "./adapters/types.js";

// Interpreter implementations
export { TypeberrySyncInterpreter } from "./adapters/typeberry.js";
export { AnanasSyncInterpreter } from "./adapters/ananas.js";
export type { AnanasApi } from "./adapters/ananas-shell.js";
export { initAnanas, resetAnanasCache } from "./adapters/ananas-init.js";

// Adapters
export { DirectAdapter } from "./direct-adapter.js";
export { WorkerBridge, TimeoutError } from "./worker-bridge.js";

// Worker entry
export { createWorkerCommandHandler, installWorkerEntry } from "./worker-entry.js";

// Status mapping
export { mapStatus } from "./status-map.js";

// Utilities
export {
  regsToUint8,
  uint8ToRegs,
  getMemoryRange,
  serializeInitialState,
  deserializeInitialState,
  validateRegisterIndices,
  applyRegisterPatch,
} from "./utils.js";
export type { SerializedInitialMachineState } from "./utils.js";

// Blob encoder
export { encodePvmBlob } from "./blob-encoder.js";

// Worker protocol types
export type {
  WorkerRequest,
  WorkerResponse,
  WorkerOkResponse,
  WorkerErrorResponse,
  WorkerResponsePayload,
} from "./commands.js";
