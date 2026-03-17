import { useEffect, useRef, useState, useCallback } from "react";
import type { MachineStateSnapshot, PvmLifecycle, PvmStatus, HostCallInfo } from "@pvmdbg/types";
import { useOrchestrator } from "./useOrchestrator";

export interface OrchestratorReactiveState {
  snapshots: Map<string, { snapshot: MachineStateSnapshot; lifecycle: PvmLifecycle }>;
  selectedPvmId: string | null;
  hostCallInfo: Map<string, HostCallInfo>;
  isStepInProgress: boolean;
  setIsStepInProgress: (value: boolean) => void;
  /** Monotonic counter incremented on every snapshot change. Useful for cache invalidation. */
  snapshotVersion: number;
}

/**
 * Shared reactive hook for orchestrator state. Call this once at the page level
 * (e.g. in DebuggerPage) and pass results down via props — do NOT call from
 * individual panels, as each call creates independent event subscriptions.
 *
 * State updates from rapid-fire events (e.g. during Run) are buffered in refs
 * and flushed to React state on the next animation frame to avoid exceeding
 * React's max update depth.
 */
export function useOrchestratorState(): OrchestratorReactiveState {
  const { orchestrator } = useOrchestrator();
  const [snapshots, setSnapshots] = useState<
    Map<string, { snapshot: MachineStateSnapshot; lifecycle: PvmLifecycle }>
  >(new Map());
  const [selectedPvmId, setSelectedPvmId] = useState<string | null>(null);
  const [hostCallInfo, setHostCallInfo] = useState<Map<string, HostCallInfo>>(new Map());
  const [isStepInProgress, setIsStepInProgress] = useState(false);
  const [snapshotVersion, setSnapshotVersion] = useState(0);
  const versionRef = useRef(0);

  // --- Buffered flush mechanism ---
  // Events write into these refs; a single rAF flushes to React state.
  const pendingSnapshots = useRef<Map<string, { snapshot: MachineStateSnapshot; lifecycle: PvmLifecycle }> | null>(null);
  const pendingSelectedPvmId = useRef<string | null>(null);
  const pendingHostCallInfo = useRef<Map<string, HostCallInfo> | null>(null);
  const pendingStepDone = useRef(false);
  const rafId = useRef<number | null>(null);

  const scheduleFlush = useCallback(() => {
    if (rafId.current !== null) return;
    rafId.current = requestAnimationFrame(() => {
      rafId.current = null;
      if (pendingSnapshots.current) {
        setSnapshots(pendingSnapshots.current);
        pendingSnapshots.current = null;
      }
      if (pendingSelectedPvmId.current !== null) {
        setSelectedPvmId((prev) => prev ?? pendingSelectedPvmId.current);
        pendingSelectedPvmId.current = null;
      }
      if (pendingHostCallInfo.current) {
        setHostCallInfo(pendingHostCallInfo.current);
        pendingHostCallInfo.current = null;
      }
      if (pendingStepDone.current) {
        setIsStepInProgress(false);
        pendingStepDone.current = false;
      }
      setSnapshotVersion(versionRef.current);
    });
  }, []);

  useEffect(() => {
    if (!orchestrator) {
      setSnapshots(new Map());
      setSelectedPvmId(null);
      setHostCallInfo(new Map());
      setIsStepInProgress(false);
      return;
    }

    // Seed from current orchestrator state
    const initial = orchestrator.getSnapshots();
    setSnapshots(initial);

    // Select first PVM if none selected
    const firstId = initial.keys().next();
    if (!firstId.done) {
      setSelectedPvmId(firstId.value);
    }

    const onStateChanged = (pvmId: string, snapshot: MachineStateSnapshot, lifecycle: PvmLifecycle) => {
      // Accumulate into the pending map (latest wins per pvmId)
      const base = pendingSnapshots.current ?? new Map(snapshots);
      base.set(pvmId, { snapshot, lifecycle });
      pendingSnapshots.current = base;
      pendingSelectedPvmId.current = pvmId;
      pendingStepDone.current = true;
      versionRef.current += 1;
      scheduleFlush();
    };

    const onHostCallPaused = (_pvmId: string, info: HostCallInfo) => {
      const base = pendingHostCallInfo.current ?? new Map(hostCallInfo);
      base.set(info.pvmId, info);
      pendingHostCallInfo.current = base;
      pendingStepDone.current = true;
      scheduleFlush();
    };

    const onTerminated = (pvmId: string, reason: PvmStatus) => {
      const base = pendingSnapshots.current ?? new Map(snapshots);
      const entry = base.get(pvmId);
      if (entry) {
        base.set(pvmId, {
          snapshot: { ...entry.snapshot, status: reason },
          lifecycle: "terminated",
        });
        pendingSnapshots.current = base;
      }
      pendingStepDone.current = true;
      versionRef.current += 1;
      scheduleFlush();
    };

    const onError = (pvmId: string, _error: Error) => {
      const base = pendingSnapshots.current ?? new Map(snapshots);
      const entry = base.get(pvmId);
      if (entry) {
        base.set(pvmId, {
          snapshot: entry.snapshot,
          lifecycle: "failed",
        });
        pendingSnapshots.current = base;
      }
      pendingStepDone.current = true;
      scheduleFlush();
    };

    orchestrator.on("pvmStateChanged", onStateChanged);
    orchestrator.on("hostCallPaused", onHostCallPaused);
    orchestrator.on("terminated", onTerminated);
    orchestrator.on("error", onError);

    return () => {
      orchestrator.off("pvmStateChanged", onStateChanged);
      orchestrator.off("hostCallPaused", onHostCallPaused);
      orchestrator.off("terminated", onTerminated);
      orchestrator.off("error", onError);
      if (rafId.current !== null) {
        cancelAnimationFrame(rafId.current);
        rafId.current = null;
      }
    };
    // We intentionally capture `snapshots` and `hostCallInfo` at subscription
    // time as base values for accumulation. The pending refs take over from there.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orchestrator, scheduleFlush]);

  return { snapshots, selectedPvmId, hostCallInfo, isStepInProgress, setIsStepInProgress, snapshotVersion };
}
