/** Canonical host call index → name mapping. Single source of truth. */
export const HOST_CALL_NAMES: ReadonlyMap<number, string> = new Map([
  [0, "gas"],
  [1, "fetch"],
  [2, "lookup"],
  [3, "read"],
  [4, "write"],
  [100, "log"],
]);

/** Resolve a host call name by index, returning "unknown" for unmapped indices. */
export function hostCallName(index: number): string {
  return HOST_CALL_NAMES.get(index) ?? "unknown";
}
