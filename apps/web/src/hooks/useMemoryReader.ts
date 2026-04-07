import type { Orchestrator } from "@pvmdbg/orchestrator";
import { useCallback, useRef, useState } from "react";

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
  /** Get the set of byte offsets (within the page) that changed since the previous snapshot. */
  getChangedOffsets: (address: number) => Set<number> | undefined;
}

/** Compare two page buffers and return the set of byte offsets that differ. */
export function computeChangedOffsets(
  prev: Uint8Array,
  curr: Uint8Array,
): Set<number> {
  const changed = new Set<number>();
  const len = Math.min(prev.length, curr.length);
  for (let i = 0; i < len; i++) {
    if (prev[i] !== curr[i]) {
      changed.add(i);
    }
  }
  // Bytes beyond the shorter array are considered changed
  const maxLen = Math.max(prev.length, curr.length);
  for (let i = len; i < maxLen; i++) {
    changed.add(i);
  }
  return changed;
}

/**
 * Hook that lazily fetches memory page contents via the orchestrator.
 * Keeps stale data visible while re-fetching on version change
 * to avoid flashing "Loading…" during execution.
 *
 * Tracks changed byte offsets between consecutive page snapshots
 * so that consumers can highlight bytes that changed after a step/edit.
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
  const prevCacheRef = useRef<Map<number, Uint8Array>>(new Map());
  const changedOffsetsRef = useRef<Map<number, Set<number>>>(new Map());
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
            // Promote the stale cached page to the previous-snapshot slot
            const oldEntry = cacheRef.current.get(address);
            if (oldEntry && oldEntry.version !== ver) {
              prevCacheRef.current.set(address, oldEntry.data);
            }

            // Compute changed offsets by comparing against the previous snapshot
            const prevData = prevCacheRef.current.get(address);
            if (prevData) {
              changedOffsetsRef.current.set(
                address,
                computeChangedOffsets(prevData, data),
              );
            } else {
              // First fetch — no previous data, so no highlights
              changedOffsetsRef.current.delete(address);
            }

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
    (address: number) =>
      fetchingRef.current.has(address) && !cacheRef.current.has(address),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [snapshotVersion],
  );

  const getChangedOffsets = useCallback(
    (address: number) => changedOffsetsRef.current.get(address),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [snapshotVersion],
  );

  return { getPage, isLoading, expandPage, getChangedOffsets };
}
