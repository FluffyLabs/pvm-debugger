import { useCallback, useRef } from "react";

/**
 * Returns a stable function identity that always calls the latest version of `fn`.
 * Useful to avoid re-triggering effects when a callback's identity changes
 * but its behavior should not cause re-renders.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useStableCallback<T extends (...args: any[]) => any>(fn: T): T {
  const ref = useRef<T>(fn);
  ref.current = fn;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return useCallback((...args: any[]) => ref.current(...args), []) as T;
}
