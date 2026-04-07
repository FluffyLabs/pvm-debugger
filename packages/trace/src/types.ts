// Re-export canonical trace types from @pvmdbg/types
export type {
  EcalliTrace,
  TraceEntry,
  TracePrelude,
  TraceTermination,
} from "@pvmdbg/types";

/** Describes a single mismatch found when comparing two traces. */
export interface TraceMismatch {
  /** Stable dot-path identifying the mismatched field, e.g. "entries[3].memoryReads[0].dataHex" */
  path: string;
  /** Human-readable description of the mismatch. */
  message: string;
  /** Value from trace A. */
  expected: unknown;
  /** Value from trace B. */
  actual: unknown;
}
