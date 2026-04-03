import { useState, useCallback, useRef } from "react";
import type { HostCallInfo, HostCallResumeEffects } from "@pvmdbg/types";

export interface PendingChangesData {
  registerWrites: Map<number, bigint>;
  memoryWrites: Array<{ address: number; data: Uint8Array }>;
  gasAfter?: bigint;
}

export interface UsePendingChanges {
  /** Current pending changes, or null if no host call is active. */
  pending: PendingChangesData | null;
  /** Update a pending register write. */
  setRegister: (index: number, value: bigint) => void;
  /** Update the pending gas value. */
  setGas: (gas: bigint) => void;
  /** Add or replace a pending memory write at the given address. */
  writeMemory: (address: number, data: Uint8Array) => void;
  /** Remove a pending memory write by start address. No-op if not found. */
  removeMemoryWrite: (address: number) => void;
  /**
   * Get the current pending effects for host-call resume.
   * Returns null when no pending state exists (e.g. during auto-continue
   * before React has processed the host-call event).
   */
  getEffects: () => HostCallResumeEffects | null;
  /** Immediately clear all pending changes (e.g. on reset). */
  clear: () => void;
}

/**
 * Manages mutable pending changes for host-call pauses.
 *
 * When a host call is detected for the selected PVM, the pending state is
 * initialized from the resume proposal (if available) or starts empty.
 * The user can then edit registers, gas, and memory — those edits accumulate
 * here and are applied on resume.
 */
export function usePendingChanges(
  hostCallInfo: Map<string, HostCallInfo>,
  selectedPvmId: string | null,
): UsePendingChanges {
  const [pending, setPending] = useState<PendingChangesData | null>(null);
  // Ref mirrors state so getEffects() always reads the latest value
  // (avoids stale closures in async resume paths).
  const pendingRef = useRef<PendingChangesData | null>(null);

  // Derive the active host call for the selected PVM.
  const activeInfo = selectedPvmId ? hostCallInfo.get(selectedPvmId) : undefined;
  const prevInfoRef = useRef<HostCallInfo | undefined>(undefined);

  // Re-initialize pending state when the active host call changes.
  // This runs during render (not useEffect) so the state is available
  // on the very first render after a host-call transition.
  if (activeInfo !== prevInfoRef.current) {
    prevInfoRef.current = activeInfo;
    let next: PendingChangesData | null = null;
    if (activeInfo) {
      const proposal = activeInfo.resumeProposal;
      next = proposal
        ? {
            registerWrites: new Map(proposal.registerWrites),
            memoryWrites: proposal.memoryWrites.map((mw) => ({
              address: mw.address,
              data: new Uint8Array(mw.data),
            })),
            gasAfter: proposal.gasAfter,
          }
        : { registerWrites: new Map(), memoryWrites: [] };
    }
    setPending(next);
    pendingRef.current = next;
  }

  const setRegister = useCallback((index: number, value: bigint) => {
    setPending((prev) => {
      if (!prev) return prev;
      const newWrites = new Map(prev.registerWrites);
      newWrites.set(index, value);
      const next = { ...prev, registerWrites: newWrites };
      pendingRef.current = next;
      return next;
    });
  }, []);

  const setGas = useCallback((gas: bigint) => {
    setPending((prev) => {
      if (!prev) return prev;
      const next = { ...prev, gasAfter: gas };
      pendingRef.current = next;
      return next;
    });
  }, []);

  const writeMemory = useCallback((address: number, data: Uint8Array) => {
    setPending((prev) => {
      if (!prev) return prev;
      // Replace any existing write at the exact same start address; append otherwise.
      // User writes are always at the end so they take precedence over proposal writes
      // at overlapping (but not identical) addresses when applied in order.
      const newWrites = prev.memoryWrites.filter((mw) => mw.address !== address);
      newWrites.push({ address, data: new Uint8Array(data) });
      const next = { ...prev, memoryWrites: newWrites };
      pendingRef.current = next;
      return next;
    });
  }, []);

  const removeMemoryWrite = useCallback((address: number) => {
    setPending((prev) => {
      if (!prev) return prev;
      const filtered = prev.memoryWrites.filter((mw) => mw.address !== address);
      if (filtered.length === prev.memoryWrites.length) return prev; // no-op
      const next = { ...prev, memoryWrites: filtered };
      pendingRef.current = next;
      return next;
    });
  }, []);

  const getEffects = useCallback((): HostCallResumeEffects | null => {
    const p = pendingRef.current;
    if (!p) return null;
    return {
      registerWrites: p.registerWrites.size > 0 ? p.registerWrites : undefined,
      memoryWrites: p.memoryWrites.length > 0 ? p.memoryWrites : undefined,
      gasAfter: p.gasAfter,
    };
  }, []);

  const clear = useCallback(() => {
    setPending(null);
    pendingRef.current = null;
  }, []);

  return { pending, setRegister, setGas, writeMemory, removeMemoryWrite, getEffects, clear };
}
