import { useEffect, useState } from "react";
import type { MachineStateSnapshot, PvmLifecycle, PvmStatus, HostCallInfo } from "@pvmdbg/types";
import { useOrchestrator } from "./useOrchestrator";

export interface OrchestratorReactiveState {
  snapshots: Map<string, { snapshot: MachineStateSnapshot; lifecycle: PvmLifecycle }>;
  selectedPvmId: string | null;
  hostCallInfo: Map<string, HostCallInfo>;
  isStepInProgress: boolean;
  setIsStepInProgress: (value: boolean) => void;
}

/**
 * Shared reactive hook for orchestrator state. Call this once at the page level
 * (e.g. in DebuggerPage) and pass results down via props — do NOT call from
 * individual panels, as each call creates independent event subscriptions.
 *
 * `isStepInProgress` is set to false by event handlers and set to true by
 * `useDebuggerActions` when initiating a step via the exposed `setIsStepInProgress`.
 */
export function useOrchestratorState(): OrchestratorReactiveState {
  const { orchestrator } = useOrchestrator();
  const [snapshots, setSnapshots] = useState<
    Map<string, { snapshot: MachineStateSnapshot; lifecycle: PvmLifecycle }>
  >(new Map());
  const [selectedPvmId, setSelectedPvmId] = useState<string | null>(null);
  const [hostCallInfo, setHostCallInfo] = useState<Map<string, HostCallInfo>>(new Map());
  const [isStepInProgress, setIsStepInProgress] = useState(false);

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
      setSnapshots((prev) => {
        const next = new Map(prev);
        next.set(pvmId, { snapshot, lifecycle });
        return next;
      });
      // Keep selectedPvmId stable — only set if null
      setSelectedPvmId((prev) => prev ?? pvmId);
      setIsStepInProgress(false);
    };

    const onHostCallPaused = (_pvmId: string, info: HostCallInfo) => {
      setHostCallInfo((prev) => {
        const next = new Map(prev);
        next.set(info.pvmId, info);
        return next;
      });
      setIsStepInProgress(false);
    };

    const onTerminated = (pvmId: string, reason: PvmStatus) => {
      setSnapshots((prev) => {
        const entry = prev.get(pvmId);
        if (!entry) return prev;
        const next = new Map(prev);
        next.set(pvmId, {
          snapshot: { ...entry.snapshot, status: reason },
          lifecycle: "terminated",
        });
        return next;
      });
      setIsStepInProgress(false);
    };

    const onError = (pvmId: string, _error: Error) => {
      setSnapshots((prev) => {
        const entry = prev.get(pvmId);
        if (!entry) return prev;
        const next = new Map(prev);
        next.set(pvmId, {
          snapshot: entry.snapshot,
          lifecycle: "failed",
        });
        return next;
      });
      setIsStepInProgress(false);
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
    };
  }, [orchestrator]);

  return { snapshots, selectedPvmId, hostCallInfo, isStepInProgress, setIsStepInProgress };
}
