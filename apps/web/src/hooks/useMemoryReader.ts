import { useCallback, useRef, useState } from "react";
import type { Orchestrator } from "@pvmdbg/orchestrator";

const PAGE_SIZE = 4096;

interface CacheEntry {
  data: Uint8Array;
  version: number;
}

interface MemoryReaderResult {
  /** Get cached page data. Returns undefined only if never fetched. */
  getPage: (address: number) => Uint8Array | undefined;
  /** Whether a specific page is currently being fetched for the first time (no stale data). */
  isLoading: (address: number) => boolean;
  /** Expand a page — triggers fetch if not cached or stale. */
  expandPage: (address: number) => void;
}

/**
 * Hook that lazily fetches memory page contents via the orchestrator.
 * Keeps stale data visible while re-fetching on version change
 * to avoid flashing "Loading…" during execution.
 *
 * All callbacks are stable (do not change identity between renders)
 * to prevent re-render loops in consuming components.
 */
export function useMemoryReader(
  orchestrator: Orchestrator | null,
  pvmId: string | null,
  snapshotVersion: number,
): MemoryReaderResult {
  // Use refs for mutable state that callbacks read, and a single
  // render-trigger counter to tell React when the cache has changed.
  const cacheRef = useRef<Map<number, CacheEntry>>(new Map());
  const fetchingRef = useRef<Set<number>>(new Set());
  const versionRef = useRef(snapshotVersion);
  const orchestratorRef = useRef(orchestrator);
  const pvmIdRef = useRef(pvmId);
  const [, setTick] = useState(0);

  versionRef.current = snapshotVersion;
  orchestratorRef.current = orchestrator;
  pvmIdRef.current = pvmId;

  const bump = useCallback(() => setTick((t) => t + 1), []);

  const expandPage = useCallback(
    (address: number) => {
      const orch = orchestratorRef.current;
      const pId = pvmIdRef.current;
      if (!orch || !pId) return;

      const entry = cacheRef.current.get(address);
      const ver = versionRef.current;
      // Already fresh or already fetching
      if (entry && entry.version === ver) return;
      if (fetchingRef.current.has(address)) return;

      fetchingRef.current.add(address);

      orch.getMemory(pId, address, PAGE_SIZE).then(
        (data) => {
          fetchingRef.current.delete(address);
          // Only update if still current version
          if (versionRef.current === ver) {
            cacheRef.current.set(address, { data, version: ver });
            bump();
          }
        },
        () => {
          fetchingRef.current.delete(address);
        },
      );
    },
    [bump],
  );

  const getPage = useCallback(
    (address: number) => cacheRef.current.get(address)?.data,
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reads from ref, tick forces re-read
    [snapshotVersion],
  );

  const isLoading = useCallback(
    (address: number) => fetchingRef.current.has(address) && !cacheRef.current.has(address),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [snapshotVersion],
  );

  return { getPage, isLoading, expandPage };
}
