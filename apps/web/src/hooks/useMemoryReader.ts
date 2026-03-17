import { useCallback, useRef, useState } from "react";
import type { Orchestrator } from "@pvmdbg/orchestrator";

const PAGE_SIZE = 4096;

interface MemoryReaderResult {
  /** Get cached page data or fetch it. Returns undefined while loading. */
  getPage: (address: number) => Uint8Array | undefined;
  /** Whether a specific page is currently loading. */
  isLoading: (address: number) => boolean;
  /** Expand a page — triggers fetch if not cached. */
  expandPage: (address: number) => void;
}

/**
 * Hook that lazily fetches memory page contents via the orchestrator.
 * Caches results by base address and invalidates when `snapshotVersion` changes.
 */
export function useMemoryReader(
  orchestrator: Orchestrator | null,
  pvmId: string | null,
  snapshotVersion: number,
): MemoryReaderResult {
  const [cache, setCache] = useState<Map<number, Uint8Array>>(new Map());
  const [loading, setLoading] = useState<Set<number>>(new Set());
  const lastVersion = useRef<number>(-1);

  // Invalidate cache when snapshot version changes
  if (snapshotVersion !== lastVersion.current) {
    lastVersion.current = snapshotVersion;
    if (cache.size > 0) setCache(new Map());
    if (loading.size > 0) setLoading(new Set());
  }

  const expandPage = useCallback(
    (address: number) => {
      if (!orchestrator || !pvmId) return;
      if (cache.has(address)) return;

      setLoading((prev) => {
        if (prev.has(address)) return prev;
        const next = new Set(prev);
        next.add(address);
        return next;
      });

      orchestrator.getMemory(pvmId, address, PAGE_SIZE).then(
        (data) => {
          setCache((prev) => {
            const next = new Map(prev);
            next.set(address, data);
            return next;
          });
          setLoading((prev) => {
            const next = new Set(prev);
            next.delete(address);
            return next;
          });
        },
        () => {
          // On error, stop loading indicator but don't cache
          setLoading((prev) => {
            const next = new Set(prev);
            next.delete(address);
            return next;
          });
        },
      );
    },
    [orchestrator, pvmId, cache],
  );

  const getPage = useCallback(
    (address: number) => cache.get(address),
    [cache],
  );

  const isLoading = useCallback(
    (address: number) => loading.has(address),
    [loading],
  );

  return { getPage, isLoading, expandPage };
}
