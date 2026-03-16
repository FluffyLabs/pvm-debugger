import { useEffect, useState } from "react";
import { Navigate } from "react-router";
import type { PvmLifecycle, MachineStateSnapshot } from "@pvmdbg/types";
import { useOrchestrator } from "../hooks/useOrchestrator";
import { useDisassembly } from "../hooks/useDisassembly";
import { InstructionsPanel } from "../components/debugger/InstructionsPanel";

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
  const { orchestrator, envelope } = useOrchestrator();
  const [pvmStates, setPvmStates] = useState<
    Map<string, { snapshot: MachineStateSnapshot; lifecycle: PvmLifecycle }>
  >(new Map());

  const instructions = useDisassembly(envelope);

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

  // Get current PC from the first PVM
  const firstEntry = pvmStates.values().next();
  const currentPc = firstEntry.done ? 0 : firstEntry.value.snapshot.pc;

  return (
    <div data-testid="debugger-page" className="flex flex-col h-full">
      <div className="flex items-center gap-4 px-4 py-2 border-b border-border shrink-0">
        <h1 className="text-sm font-semibold text-foreground">Debugger</h1>
        <div className="flex gap-2">
          {[...pvmStates.entries()].map(([pvmId, { lifecycle }]) => (
            <div
              key={pvmId}
              className="flex items-center gap-1.5 rounded border border-border px-2 py-0.5 text-xs"
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
      <div className="flex flex-1 min-h-0">
        <div className="w-72 border-r border-border">
          <InstructionsPanel instructions={instructions} currentPc={currentPc} />
        </div>
        <div className="flex-1" />
      </div>
    </div>
  );
}
