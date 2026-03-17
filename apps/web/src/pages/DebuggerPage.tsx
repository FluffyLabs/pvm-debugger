import { useCallback, useRef, useMemo } from "react";
import { Navigate, useNavigate } from "react-router";
import { useOrchestrator } from "../hooks/useOrchestrator";
import { useOrchestratorState } from "../hooks/useOrchestratorState";
import { useDebuggerActions } from "../hooks/useDebuggerActions";
import { useDebuggerSettings } from "../hooks/useDebuggerSettings";
import { stepTooltip } from "../lib/debugger-settings";
import { useDisassembly } from "../hooks/useDisassembly";
import { useStorageTable } from "../hooks/useStorageTable";
import { isTerminal } from "@pvmdbg/types";
import { InstructionsPanel } from "../components/debugger/InstructionsPanel";
import { RegistersPanel } from "../components/debugger/RegistersPanel";
import { MemoryPanel } from "../components/debugger/MemoryPanel";
import { ExecutionControls } from "../components/debugger/ExecutionControls";
import { DebuggerLayout } from "../components/debugger/DebuggerLayout";
import { BottomDrawer } from "../components/debugger/BottomDrawer";
import { DrawerProvider } from "../components/debugger/DrawerContext";
import { lifecycleLabel } from "../components/debugger/value-format";

export function DebuggerPage() {
  const { orchestrator, envelope, teardown, initialize, setEnvelope } = useOrchestrator();
  const navigate = useNavigate();
  const isReloadingRef = useRef(false);
  const { snapshots, selectedPvmId, hostCallInfo, isStepInProgress, setIsStepInProgress, snapshotVersion } =
    useOrchestratorState();
  const instructions = useDisassembly(envelope);

  // Derive a stable orchestrator identity for the storage table.
  // Each new orchestrator reference gets a unique id so storage resets.
  const orchIdCounter = useRef(0);
  const prevOrchRef = useRef<typeof orchestrator>(null);
  const orchestratorId = useMemo(() => {
    if (orchestrator !== prevOrchRef.current) {
      prevOrchRef.current = orchestrator;
      orchIdCounter.current++;
    }
    return orchestrator ? `orch-${orchIdCounter.current}` : null;
  }, [orchestrator]);

  const storageTable = useStorageTable(orchestratorId);

  // Get current PVM state (must be before early return — hooks below depend on it)
  const selectedEntry = selectedPvmId ? snapshots.get(selectedPvmId) : undefined;
  const selectedLifecycle = selectedEntry?.lifecycle ?? null;

  const { settings } = useDebuggerSettings();

  const onLoad = useCallback(() => {
    teardown();
    navigate("/load");
  }, [teardown, navigate]);

  /** Handle PVM selection changes: re-create orchestrator and reload program. */
  const onPvmChange = useCallback(
    (pvmIds: string[]) => {
      if (!envelope) return;
      // Capture envelope before teardown clears it
      const savedEnvelope = envelope;
      isReloadingRef.current = true;
      const orch = initialize(pvmIds);
      // Restore envelope in context (teardown clears it)
      setEnvelope(savedEnvelope);
      orch
        .loadProgram(savedEnvelope)
        .catch((err) => {
          console.error("Failed to reload program after PVM change:", err);
        })
        .finally(() => {
          isReloadingRef.current = false;
        });
    },
    [envelope, initialize, setEnvelope],
  );

  // useDebuggerActions must be called before any early return (React rules of hooks)
  const { next, step, run, pause, reset, load, canStep, isRunning, error, clearError } =
    useDebuggerActions({
      orchestrator,
      isStepInProgress,
      setIsStepInProgress,
      selectedLifecycle,
      onLoad,
      steppingMode: settings.steppingMode,
      nInstructionsCount: settings.nInstructionsCount,
      autoContinuePolicy: settings.autoContinuePolicy,
      storageTable,
    });

  // Route guard: redirect to /load when no program is loaded.
  // Skip during PVM reload to avoid a brief redirect.
  if (!isReloadingRef.current && (!orchestrator || !orchestrator.getProgramBytes())) {
    return <Navigate to="/load" replace />;
  }

  const currentPc = selectedEntry?.snapshot.pc ?? 0;

  // Check if all PVMs are in a terminal state
  const allTerminal =
    snapshots.size > 0 &&
    [...snapshots.values()].every(({ lifecycle }) => isTerminal(lifecycle));

  return (
    <DrawerProvider>
    <div data-testid="debugger-page" className="h-full">
      <DebuggerLayout
        toolbar={
          <>
            <h1 className="text-sm font-semibold text-foreground">Debugger</h1>
            <ExecutionControls
              onNext={next}
              onStep={step}
              onRun={run}
              onPause={pause}
              onReset={reset}
              onLoad={load}
              canStep={canStep}
              isRunning={isRunning}
              isTerminated={allTerminal}
              stepTooltip={stepTooltip(settings.steppingMode, settings.nInstructionsCount)}
            />
            <div className="flex items-center gap-2">
              {allTerminal && (
                <span
                  data-testid="execution-complete-badge"
                  className="rounded bg-green-800 px-2 py-0.5 text-xs font-semibold text-green-100"
                >
                  Execution Complete
                </span>
              )}
              {error && (
                <div
                  data-testid="error-alert"
                  className="flex items-center gap-2 rounded bg-destructive/20 border border-destructive px-2 py-0.5 text-xs text-destructive"
                >
                  <span>{error}</span>
                  <button
                    aria-label="Dismiss error"
                    onClick={clearError}
                    className="font-bold cursor-pointer hover:opacity-70"
                  >
                    ×
                  </button>
                </div>
              )}
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
        drawer={
          <BottomDrawer
            onPvmChange={onPvmChange}
            hostCallInfo={hostCallInfo}
            selectedPvmId={selectedPvmId}
            snapshots={snapshots}
            orchestrator={orchestrator}
            storageTable={storageTable}
          />
        }
      />
    </div>
    </DrawerProvider>
  );
}
