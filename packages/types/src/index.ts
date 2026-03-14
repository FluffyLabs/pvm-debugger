// PVM status and lifecycle
export {
  type PvmStatus,
  PVM_STATUSES,
  type PvmLifecycle,
  TERMINAL_LIFECYCLES,
  isTerminal,
} from "./pvm-status.js";

// Machine state
export {
  type InitialMachineState,
  type PageMapEntry,
  type MemoryChunk,
  type MachineStateSnapshot,
} from "./machine-state.js";

// PVM adapter
export {
  type PvmAdapter,
  type AdapterStepResult,
} from "./pvm-adapter.js";

// Program envelope and related types
export {
  type SpiProgram,
  type ProgramLoadContext,
  type ExpectedState,
  type SpiEntrypoint,
  type LoadSourceKind,
  type ProgramEnvelope,
} from "./program.js";

// Trace types
export {
  type TracePrelude,
  type TraceEntry,
  type TraceTermination,
  type EcalliTrace,
} from "./trace-types.js";

// Orchestrator types
export {
  type HostCallMismatch,
  type HostCallResumeEffects,
  type HostCallResumeProposal,
  type HostCallInfo,
  type PvmStepReport,
  type StepResult,
  type OrchestratorEvents,
} from "./orchestrator.js";

// Encoding helpers
export {
  toHex,
  fromHex,
  bigintToDecStr,
  decStrToBigint,
  encodeVarU32,
  decodeVarU32,
  regsToUint8,
  uint8ToRegs,
} from "./encoding.js";
