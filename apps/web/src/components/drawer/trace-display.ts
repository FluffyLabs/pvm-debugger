import type { TraceEntry, TraceTermination, EcalliTrace } from "@pvmdbg/types";
import { getHostCallName, compareTraces, type TraceMismatch } from "@pvmdbg/trace";

/** A displayable row — either a host-call entry or a termination. */
export type TraceDisplayRow =
  | { kind: "entry"; entry: TraceEntry; index: number }
  | { kind: "termination"; termination: TraceTermination };

/** Build an ordered list of display rows from a trace. */
export function traceToRows(trace: EcalliTrace): TraceDisplayRow[] {
  const rows: TraceDisplayRow[] = trace.entries.map((entry, i) => ({
    kind: "entry" as const,
    entry,
    index: i,
  }));
  if (trace.termination) {
    rows.push({ kind: "termination", termination: trace.termination });
  }
  return rows;
}

/** Set of entry indices that have mismatches between two traces. */
export function mismatchedEntryIndices(
  recorded: EcalliTrace,
  reference: EcalliTrace,
): Set<number> {
  const mismatches = compareTraces(recorded, reference);
  return mismatchPathsToEntryIndices(mismatches);
}

/** Extract entry indices from mismatch paths like "entries[3].pc". */
function mismatchPathsToEntryIndices(mismatches: TraceMismatch[]): Set<number> {
  const indices = new Set<number>();
  for (const m of mismatches) {
    const match = m.path.match(/^entries\[(\d+)\]/);
    if (match) {
      indices.add(Number(match[1]));
    }
    // "entries.length" means count differs — mark all beyond the shorter trace
    if (m.path === "entries.length") {
      // The mismatch itself doesn't tell us which are extra, but the
      // per-entry mismatches (entries[N] missing) will catch those.
    }
  }
  return indices;
}

/** Format a single trace entry as human-readable lines. */
export function formatEntryLines(entry: TraceEntry): string[] {
  const name = getHostCallName(entry.index);
  const lines: string[] = [];

  lines.push(`ecalli ${entry.index}, ω7 = ${entry.gas}`);

  // Memory reads
  for (const mr of entry.memoryReads) {
    lines.push(`  mem read [0x${mr.address.toString(16)}] len=${mr.length} ${mr.dataHex}`);
  }

  // Memory writes
  for (const mw of entry.memoryWrites) {
    lines.push(`  mem write [0x${mw.address.toString(16)}] ${mw.dataHex}`);
  }

  // Register writes
  for (const [reg, val] of entry.registerWrites) {
    lines.push(`  ω${reg} ← ${val}`);
  }

  // Gas update
  if (entry.gasAfter !== undefined) {
    lines.push(`  gas ← ${entry.gasAfter}`);
  }

  // Log decode: for index 100, try decoding the longest memory read as UTF-8
  if (name === "log" && entry.memoryReads.length > 0) {
    const logText = decodeLogMessage(entry);
    if (logText !== null) {
      lines.push(`  → "${logText}"`);
    }
  }

  return lines;
}

/** Format a termination row. */
export function formatTerminationLines(term: TraceTermination): string[] {
  const lines: string[] = [`${term.kind}${term.arg !== undefined ? ` ${term.arg}` : ""}`];
  lines.push(`  pc = ${term.pc}, gas = ${term.gas}`);
  return lines;
}

/** Decode log message from the longest memory read as UTF-8. Falls back to hex. */
export function decodeLogMessage(entry: TraceEntry): string | null {
  if (entry.memoryReads.length === 0) return null;

  // Find the longest memory read (message body)
  let longest = entry.memoryReads[0];
  for (const mr of entry.memoryReads) {
    if (mr.dataHex.length > longest.dataHex.length) {
      longest = mr;
    }
  }

  const bytes = hexToUint8(longest.dataHex);
  if (bytes.length === 0) return null;

  try {
    const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    return text;
  } catch {
    return `0x${longest.dataHex}`;
  }
}

function hexToUint8(hex: string): Uint8Array {
  const clean = hex.startsWith("0x") ? hex.slice(2) : hex;
  if (clean.length === 0) return new Uint8Array(0);
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}
