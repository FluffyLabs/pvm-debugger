import { useCallback, useRef } from "react";

/**
 * Returns a stable function identity that always calls the latest version of `fn`.
 * Useful to avoid re-triggering effects when a callback's identity changes
 * but its behavior should not cause re-renders.
 */
export function useStableCallback<T extends (...args: unknown[]) => unknown>(
  fn: T,
): T {
  const ref = useRef<T>(fn);
  ref.current = fn;
  return useCallback((...args: unknown[]) => ref.current(...args), []) as T;
}
