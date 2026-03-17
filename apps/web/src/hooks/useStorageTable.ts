import { useCallback, useMemo, useRef, useSyncExternalStore } from "react";
import type { HostCallResumeEffects } from "@pvmdbg/types";

export interface StorageEntry {
  key: string;
  value: string;
}

/**
 * Session-scoped storage table that persists across host calls.
 *
 * The store lives outside React to avoid snapshot churn. A revision counter
 * is incremented on every mutation so that `useSyncExternalStore` picks up
 * changes efficiently.
 */
class StorageStore {
  private entries = new Map<string, string>();
  private revision = 0;
  private snapshot: StorageEntry[] = [];
  private listeners = new Set<() => void>();

  getSnapshot = (): StorageEntry[] => this.snapshot;

  subscribe = (cb: () => void): (() => void) => {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  };

  private notify() {
    this.revision++;
    this.snapshot = [...this.entries.entries()].map(([key, value]) => ({ key, value }));
    for (const cb of this.listeners) cb();
  }

  set(key: string, value: string) {
    this.entries.set(key, value);
    this.notify();
  }

  get(key: string): string | undefined {
    return this.entries.get(key);
  }

  remove(key: string) {
    if (this.entries.delete(key)) {
      this.notify();
    }
  }

  clear() {
    if (this.entries.size > 0) {
      this.entries.clear();
      this.notify();
    }
  }

  has(key: string): boolean {
    return this.entries.has(key);
  }

  /** Apply write effects: after a storage-write host call resumes, persist the written k/v. */
  applyWriteEffect(key: string, value: string) {
    this.set(key, value);
  }

  /**
   * Build override resume effects for a storage-read host call.
   *
   * If the user has a custom value in the table for the given key, return
   * memory-write effects that override the trace proposal's memory writes.
   * Otherwise return undefined (use trace proposal as-is).
   */
  buildReadOverride(
    key: string,
    destinationAddress: number,
  ): HostCallResumeEffects | undefined {
    const customValue = this.entries.get(key);
    if (customValue === undefined) return undefined;

    const bytes = hexToBytes(customValue);
    return {
      memoryWrites: [{ address: destinationAddress, data: bytes }],
    };
  }
}

/** Decode a hex string (with or without 0x prefix) to Uint8Array. */
function hexToBytes(hex: string): Uint8Array {
  const clean = hex.startsWith("0x") ? hex.slice(2) : hex;
  const padded = clean.length % 2 === 1 ? "0" + clean : clean;
  const bytes = new Uint8Array(padded.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(padded.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

export interface UseStorageTable {
  entries: StorageEntry[];
  setEntry: (key: string, value: string) => void;
  removeEntry: (key: string) => void;
  hasEntry: (key: string) => boolean;
  clear: () => void;
  /** Get the underlying store for use in resume logic. */
  store: StorageStore;
}

/**
 * Execution-scoped storage table hook.
 *
 * Creates a new StorageStore per orchestrator instance (resets when
 * orchestrator changes). Exposes reactive entries via useSyncExternalStore.
 */
export function useStorageTable(orchestratorId: string | null): UseStorageTable {
  // Keep one store ref per orchestrator identity. When orchestratorId changes
  // (i.e. orchestrator is replaced), we create a fresh store.
  const storeRef = useRef<{ id: string | null; store: StorageStore }>({
    id: null,
    store: new StorageStore(),
  });

  if (storeRef.current.id !== orchestratorId) {
    storeRef.current = {
      id: orchestratorId,
      store: new StorageStore(),
    };
  }

  const store = storeRef.current.store;

  const entries = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);

  const setEntry = useCallback(
    (key: string, value: string) => store.set(key, value),
    [store],
  );

  const removeEntry = useCallback((key: string) => store.remove(key), [store]);

  const hasEntry = useCallback((key: string) => store.has(key), [store]);

  const clear = useCallback(() => store.clear(), [store]);

  return useMemo(
    () => ({ entries, setEntry, removeEntry, hasEntry, clear, store }),
    [entries, setEntry, removeEntry, hasEntry, clear, store],
  );
}
