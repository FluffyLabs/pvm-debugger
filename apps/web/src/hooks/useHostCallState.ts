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
): HostCallState {
  const { openToTab } = useDrawer();

  const activeHostCall = useMemo(() => {
    if (!selectedPvmId) return null;
    const entry = snapshots.get(selectedPvmId);
    if (entry?.lifecycle !== "paused_host_call") return null;
    return hostCallInfo.get(selectedPvmId) ?? null;
  }, [hostCallInfo, selectedPvmId, snapshots]);

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
