import { Navigate } from "react-router";
import { useOrchestrator } from "../hooks/useOrchestrator";
import { useOrchestratorState } from "../hooks/useOrchestratorState";
import { useDisassembly } from "../hooks/useDisassembly";
import { InstructionsPanel } from "../components/debugger/InstructionsPanel";
import { RegistersPanel } from "../components/debugger/RegistersPanel";
import { lifecycleLabel } from "../components/debugger/value-format";

export function DebuggerPage() {
  const { orchestrator, envelope } = useOrchestrator();
  const { snapshots, selectedPvmId } = useOrchestratorState();
  const instructions = useDisassembly(envelope);

  // Route guard: redirect to /load when no program is loaded
  if (!orchestrator || !orchestrator.getProgramBytes()) {
    return <Navigate to="/load" replace />;
  }

  // Get current PVM state
  const selectedEntry = selectedPvmId ? snapshots.get(selectedPvmId) : undefined;
  const currentPc = selectedEntry?.snapshot.pc ?? 0;

  return (
    <div data-testid="debugger-page" className="flex flex-col h-full">
      <div className="flex items-center gap-4 px-4 py-2 border-b border-border shrink-0">
        <h1 className="text-sm font-semibold text-foreground">Debugger</h1>
        <div className="flex gap-2">
          {[...snapshots.entries()].map(([pvmId, { lifecycle, snapshot }]) => (
            <div
              key={pvmId}
              className="flex items-center gap-1.5 rounded border border-border px-2 py-0.5 text-xs"
            >
              <span className="font-mono text-muted-foreground">{pvmId}</span>
              <span
                data-testid={`pvm-status-${pvmId}`}
                className="font-semibold text-foreground"
              >
                {lifecycleLabel(lifecycle, snapshot.status)}
              </span>
            </div>
          ))}
        </div>
      </div>
      <div className="flex flex-1 min-h-0">
        <div className="w-72 border-r border-border">
          <InstructionsPanel instructions={instructions} currentPc={currentPc} />
        </div>
        <div className="w-72 border-r border-border">
          <RegistersPanel
            snapshot={selectedEntry?.snapshot ?? null}
            lifecycle={selectedEntry?.lifecycle ?? null}
          />
        </div>
        <div className="flex-1" />
      </div>
    </div>
  );
}
