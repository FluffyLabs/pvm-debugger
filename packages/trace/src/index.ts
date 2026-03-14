// Types — re-exported from @pvmdbg/types and local
export type {
  EcalliTrace,
  TracePrelude,
  TraceEntry,
  TraceTermination,
} from "./types.js";
export type { TraceMismatch } from "./types.js";

// Host call names — single source of truth
export { HOST_CALL_NAMES, getHostCallName } from "./host-call-names.js";

// Parser
export { parseTrace } from "./parser.js";

// Serializer
export { serializeTrace } from "./serializer.js";

// Comparator + helper
export { compareTraces, traceMemoryWriteToBytes } from "./comparator.js";
