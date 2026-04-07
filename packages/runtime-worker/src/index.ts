// Public API for @pvmdbg/runtime-worker

export { AnanasSyncInterpreter } from "./adapters/ananas.js";
export { initAnanas, resetAnanasCache } from "./adapters/ananas-init.js";
export type { AnanasApi } from "./adapters/ananas-shell.js";
// Interpreter implementations
export { TypeberrySyncInterpreter } from "./adapters/typeberry.js";
// Sync interpreter interface
export type { SyncPvmInterpreter } from "./adapters/types.js";
// Blob encoder
export { encodePvmBlob } from "./blob-encoder.js";
// Worker protocol types
export type {
  WorkerErrorResponse,
  WorkerOkResponse,
  WorkerRequest,
  WorkerResponse,
  WorkerResponsePayload,
} from "./commands.js";
// Adapters
export { DirectAdapter } from "./direct-adapter.js";

// Status mapping
export { mapStatus } from "./status-map.js";
export type { SerializedInitialMachineState } from "./utils.js";
// Utilities
export {
  applyRegisterPatch,
  deserializeInitialState,
  getMemoryRange,
  regsToUint8,
  serializeInitialState,
  uint8ToRegs,
  validateRegisterIndices,
} from "./utils.js";
export { TimeoutError, WorkerBridge } from "./worker-bridge.js";
// Worker entry
export {
  createWorkerCommandHandler,
  installWorkerEntry,
} from "./worker-entry.js";
