import { useEffect, useState } from "react";
import { Navigate } from "react-router";
import type { PvmLifecycle, MachineStateSnapshot } from "@pvmdbg/types";
import { useOrchestrator } from "../hooks/useOrchestrator";

function lifecycleLabel(lifecycle: PvmLifecycle): string {
  switch (lifecycle) {
    case "paused":
      return "OK";
    case "running":
      return "Running";
    case "paused_host_call":
      return "Host Call";
    case "terminated":
      return "Terminated";
    case "failed":
      return "Failed";
    case "timed_out":
      return "Timed Out";
  }
}

export function DebuggerPage() {
  const { orchestrator } = useOrchestrator();
  const [pvmStates, setPvmStates] = useState<
    Map<string, { snapshot: MachineStateSnapshot; lifecycle: PvmLifecycle }>
  >(new Map());

  useEffect(() => {
    if (!orchestrator) return;

    // Initial state
    setPvmStates(orchestrator.getSnapshots());

    // Listen for state changes
    const handler = (pvmId: string, snapshot: MachineStateSnapshot, lifecycle: PvmLifecycle) => {
      setPvmStates((prev) => {
        const next = new Map(prev);
        next.set(pvmId, { snapshot, lifecycle });
        return next;
      });
    };
    orchestrator.on("pvmStateChanged", handler);
    return () => {
      orchestrator.off("pvmStateChanged", handler);
    };
  }, [orchestrator]);

  // Route guard: redirect to /load when no program is loaded
  if (!orchestrator || !orchestrator.getProgramBytes()) {
    return <Navigate to="/load" replace />;
  }

  return (
    <div data-testid="debugger-page" className="flex flex-col h-full p-4">
      <h1 className="text-lg font-semibold text-foreground mb-4">Debugger</h1>
      <div className="flex flex-wrap gap-4">
        {[...pvmStates.entries()].map(([pvmId, { lifecycle }]) => (
          <div
            key={pvmId}
            className="flex items-center gap-2 rounded border border-border px-3 py-2 text-sm"
          >
            <span className="font-mono text-muted-foreground">{pvmId}</span>
            <span
              data-testid={`pvm-status-${pvmId}`}
              className="font-semibold text-foreground"
            >
              {lifecycleLabel(lifecycle)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
