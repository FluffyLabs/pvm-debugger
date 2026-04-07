// PVM status and lifecycle

// Encoding helpers
export {
  bigintToDecStr,
  decodeVarU32,
  decStrToBigint,
  encodePvmBlob,
  encodeVarU32,
  fromHex,
  regsToUint8,
  toHex,
  uint8ToRegs,
} from "./encoding.js";
// JAM codec
export {
  type DecodeResult,
  decodeBytes32,
  decodeBytesVarLen,
  decodeSequenceVarLen,
  decodeU8,
  decodeU16LE,
  decodeU32LE,
  decodeU64LE,
  decodeVarU64,
  encodeBytes32,
  encodeBytesVarLen,
  encodeSequenceVarLen,
  encodeU8,
  encodeU16LE,
  encodeU32LE,
  encodeU64LE,
  encodeVarU64,
  tryDecode,
} from "./jam-codec.js";
// Machine state
export type {
  InitialMachineState,
  MachineStateSnapshot,
  MemoryChunk,
  PageMapEntry,
} from "./machine-state.js";
// Orchestrator types
export type {
  HostCallInfo,
  HostCallMismatch,
  HostCallResumeEffects,
  HostCallResumeProposal,
  OrchestratorEvents,
  PvmStepReport,
  StepResult,
} from "./orchestrator.js";
// Program envelope and related types
export type {
  ExpectedState,
  LoadSourceKind,
  ProgramEnvelope,
  ProgramLoadContext,
  SpiEntrypoint,
  SpiProgram,
} from "./program.js";
// PVM adapter
export type {
  AdapterStepResult,
  PvmAdapter,
} from "./pvm-adapter.js";
export {
  isTerminal,
  PVM_STATUSES,
  type PvmLifecycle,
  type PvmStatus,
  TERMINAL_LIFECYCLES,
} from "./pvm-status.js";
// Trace types
export type {
  EcalliTrace,
  TraceEntry,
  TracePrelude,
  TraceTermination,
} from "./trace-types.js";
