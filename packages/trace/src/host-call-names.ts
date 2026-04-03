/** Canonical host call index → name mapping (GP 0.7.2). Single source of truth. */
export const HOST_CALL_NAMES: Record<number, string> = {
  // General (0-5)
  0: "gas",
  1: "fetch",
  2: "lookup",
  3: "read",
  4: "write",
  5: "info",
  // Refine (6-13)
  6: "historical_lookup",
  7: "export",
  8: "machine",
  9: "peek",
  10: "poke",
  11: "pages",
  12: "invoke",
  13: "expunge",
  // Accumulate (14-26)
  14: "bless",
  15: "assign",
  16: "designate",
  17: "checkpoint",
  18: "new_service",
  19: "upgrade",
  20: "transfer",
  21: "eject",
  22: "query",
  23: "solicit",
  24: "forget",
  25: "yield_result",
  26: "provide",
  // JIP
  100: "log",
};

/** Resolve a host call name by index. Unknown indices return `"unknown(N)"`. */
export function getHostCallName(index: number): string {
  return HOST_CALL_NAMES[index] ?? `unknown(${index})`;
}
