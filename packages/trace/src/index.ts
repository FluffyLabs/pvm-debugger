// Types — re-exported from @pvmdbg/types and local

// Comparator + helper
export { compareTraces, traceMemoryWriteToBytes } from "./comparator.js";
// Host call names — single source of truth
export { getHostCallName, HOST_CALL_NAMES } from "./host-call-names.js";
// Parser
export { parseTrace } from "./parser.js";
// Serializer
export { serializeTrace } from "./serializer.js";
export type {
  EcalliTrace,
  TraceEntry,
  TraceMismatch,
  TracePrelude,
  TraceTermination,
} from "./types.js";
