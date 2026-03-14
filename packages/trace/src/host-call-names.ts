/** Canonical host call index → name mapping. Single source of truth. */
export const HOST_CALL_NAMES: Record<number, string> = {
  0: "gas",
  1: "fetch",
  2: "lookup",
  3: "read",
  4: "write",
  5: "info",
  6: "bless",
  7: "checkpoint",
  8: "new",
  9: "upgrade",
  10: "transfer",
  11: "quit",
  12: "solicit",
  13: "forget",
  15: "historical_lookup",
  16: "import",
  17: "export",
  18: "machine",
  100: "log",
};

/** Resolve a host call name by index. Unknown indices return `"unknown(N)"`. */
export function getHostCallName(index: number): string {
  return HOST_CALL_NAMES[index] ?? `unknown(${index})`;
}
