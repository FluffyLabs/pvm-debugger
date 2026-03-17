import { Navigate } from "react-router";
import { useOrchestrator } from "../hooks/useOrchestrator";
import { useOrchestratorState } from "../hooks/useOrchestratorState";
import { useDebuggerActions } from "../hooks/useDebuggerActions";
import { useDisassembly } from "../hooks/useDisassembly";
import { InstructionsPanel } from "../components/debugger/InstructionsPanel";
import { RegistersPanel } from "../components/debugger/RegistersPanel";
import { MemoryPanel } from "../components/debugger/MemoryPanel";
import { ExecutionControls } from "../components/debugger/ExecutionControls";
import { DebuggerLayout } from "../components/debugger/DebuggerLayout";
import { lifecycleLabel } from "../components/debugger/value-format";

export function DebuggerPage() {
  const { orchestrator, envelope } = useOrchestrator();
  const { snapshots, selectedPvmId, isStepInProgress, setIsStepInProgress, snapshotVersion } =
    useOrchestratorState();
  const instructions = useDisassembly(envelope);

  // Get current PVM state (must be before early return — hooks below depend on it)
  const selectedEntry = selectedPvmId ? snapshots.get(selectedPvmId) : undefined;
  const selectedLifecycle = selectedEntry?.lifecycle ?? null;

  // useDebuggerActions must be called before any early return (React rules of hooks)
  const { next, canStep } = useDebuggerActions({
    orchestrator,
    isStepInProgress,
    setIsStepInProgress,
    selectedLifecycle,
  });

  // Route guard: redirect to /load when no program is loaded
  if (!orchestrator || !orchestrator.getProgramBytes()) {
    return <Navigate to="/load" replace />;
  }

  const currentPc = selectedEntry?.snapshot.pc ?? 0;

  return (
    <div data-testid="debugger-page" className="h-full">
      <DebuggerLayout
        toolbar={
          <>
            <h1 className="text-sm font-semibold text-foreground">Debugger</h1>
            <ExecutionControls onNext={next} canStep={canStep} />
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
          </>
        }
        instructions={
          <InstructionsPanel instructions={instructions} currentPc={currentPc} />
        }
        registers={
          <RegistersPanel
            snapshot={selectedEntry?.snapshot ?? null}
            lifecycle={selectedEntry?.lifecycle ?? null}
          />
        }
        memory={
          <MemoryPanel
            orchestrator={orchestrator}
            pvmId={selectedPvmId}
            pageMap={orchestrator.getPageMap()}
            snapshotVersion={snapshotVersion}
          />
        }
      />
    </div>
  );
}
