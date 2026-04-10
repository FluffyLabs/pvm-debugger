import type {
  HostCallInfo,
  MachineStateSnapshot,
  PvmLifecycle,
} from "@pvmdbg/types";
import { useEffect, useMemo, useRef } from "react";
import { useDrawer } from "../components/debugger/DrawerContext";

export interface HostCallState {
  activeHostCall: HostCallInfo | null;
}

/**
 * Derives the active host call for the selected PVM and auto-opens the drawer
 * to the Host Call tab when a new host call is detected.
 *
 * Must be called inside DrawerProvider.
 */
export function useHostCallState(
  hostCallInfo: Map<string, HostCallInfo>,
  selectedPvmId: string | null,
  snapshots: Map<
    string,
    { snapshot: MachineStateSnapshot; lifecycle: PvmLifecycle }
  >,
  isRunning: boolean,
): HostCallState {
  const { openToTab } = useDrawer();

  // Suppress host call state while running. During auto-continue the rAF
  // can fire between host-call detection and resume (Worker postMessage is
  // a macrotask). Exposing the transient paused_host_call to React causes
  // the HostCallTab to mount and trigger cascading state updates that
  // exceed React's max update depth.
  const activeHostCall = useMemo(() => {
    if (isRunning) return null;
    if (!selectedPvmId) return null;
    const entry = snapshots.get(selectedPvmId);
    if (entry?.lifecycle !== "paused_host_call") return null;
    return hostCallInfo.get(selectedPvmId) ?? null;
  }, [hostCallInfo, selectedPvmId, snapshots, isRunning]);

  // Auto-open drawer when transitioning from no host call to active host call.
  const prevRef = useRef<HostCallInfo | null>(null);
  useEffect(() => {
    if (activeHostCall && !prevRef.current) {
      openToTab("host_call");
    }
    prevRef.current = activeHostCall;
  }, [activeHostCall, openToTab]);

  return { activeHostCall };
}
