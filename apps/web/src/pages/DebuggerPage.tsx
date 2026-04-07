import { Button } from "@fluffylabs/shared-ui";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@fluffylabs/shared-ui/ui/tooltip";
import { isTerminal } from "@pvmdbg/types";
import { Settings } from "lucide-react";
import { useCallback, useRef } from "react";
import { Navigate, useNavigate } from "react-router";
import { BottomDrawer } from "../components/debugger/BottomDrawer";
import { DebuggerLayout } from "../components/debugger/DebuggerLayout";
import {
  DrawerProvider,
  useDrawer,
} from "../components/debugger/DrawerContext";
import { ExecutionControls } from "../components/debugger/ExecutionControls";
import { InstructionsPanel } from "../components/debugger/InstructionsPanel";
import { MemoryPanel } from "../components/debugger/MemoryPanel";
import { PvmTabs } from "../components/debugger/PvmTabs";
import { RegistersPanel } from "../components/debugger/RegistersPanel";
import { useDebuggerActions } from "../hooks/useDebuggerActions";
import { useDebuggerSettings } from "../hooks/useDebuggerSettings";
import { useDisassembly } from "../hooks/useDisassembly";
import { useDivergenceCheck } from "../hooks/useDivergenceCheck";
import { useOrchestrator } from "../hooks/useOrchestrator";
import { useOrchestratorState } from "../hooks/useOrchestratorState";
import { usePendingChanges } from "../hooks/usePendingChanges";
import { clearProgramSession } from "../hooks/usePersistence";
import { useStorageTable } from "../hooks/useStorageTable";
import { AVAILABLE_PVMS } from "../lib/debugger-settings";

function DebuggerPageInner() {
  const { orchestrator, envelope, teardown, initialize, setEnvelope } =
    useOrchestrator();
  const navigate = useNavigate();
  const isReloadingRef = useRef(false);
  const {
    snapshots,
    selectedPvmId,
    setSelectedPvmId,
    hostCallInfo,
    isStepInProgress,
    setIsStepInProgress,
    snapshotVersion,
    perPvmErrors,
  } = useOrchestratorState();
  const { summary: divergenceSummary, details: divergenceDetails } =
    useDivergenceCheck(snapshots, selectedPvmId, snapshotVersion);
  const instructions = useDisassembly(envelope);

  const { activeTab, openToTab, setActiveTab } = useDrawer();

  // Derive a stable orchestrator identity for the storage table.
  const orchIdRef = useRef<{ orch: typeof orchestrator; id: number }>({
    orch: null,
    id: 0,
  });
  if (orchestrator !== orchIdRef.current.orch) {
    orchIdRef.current = {
      orch: orchestrator,
      id: orchIdRef.current.id + 1,
    };
  }
  const orchestratorId = orchestrator ? `orch-${orchIdRef.current.id}` : null;

  const storageTable = useStorageTable(orchestratorId);

  // Get current PVM state (must be before early return — hooks below depend on it)
  const selectedEntry = selectedPvmId
    ? snapshots.get(selectedPvmId)
    : undefined;
  const selectedLifecycle = selectedEntry?.lifecycle ?? null;

  // Pending changes for host-call pause editing
  const pendingChanges = usePendingChanges(hostCallInfo, selectedPvmId);

  const { settings } = useDebuggerSettings();

  const onLoad = useCallback(() => {
    clearProgramSession();
    teardown();
    navigate("/load");
  }, [teardown, navigate]);

  /** Handle PVM selection changes: re-create orchestrator and reload program. */
  const onPvmChange = useCallback(
    (pvmIds: string[]) => {
      if (!envelope) return;
      const savedEnvelope = envelope;
      isReloadingRef.current = true;
      const orch = initialize(pvmIds);
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

  const {
    next,
    step,
    run,
    pause,
    reset,
    load,
    canStep,
    isRunning,
    error,
    clearError,
  } = useDebuggerActions({
    orchestrator,
    isStepInProgress,
    setIsStepInProgress,
    selectedLifecycle,
    onLoad,
    steppingMode: settings.steppingMode,
    nInstructionsCount: settings.nInstructionsCount,
    autoContinuePolicy: settings.autoContinuePolicy,
    storageTable,
    instructions,
    snapshots,
    getHostCallEffects: pendingChanges.getEffects,
    clearHostCallEffects: pendingChanges.clear,
  });

  // Route guard: redirect to /load when no program is loaded.
  if (
    !isReloadingRef.current &&
    (!orchestrator || !orchestrator.getProgramBytes())
  ) {
    return <Navigate to="/load" replace />;
  }

  const currentPc = selectedEntry?.snapshot.pc ?? 0;

  // Check if all PVMs are in a terminal state
  const allTerminal =
    snapshots.size > 0 &&
    [...snapshots.values()].every(({ lifecycle }) => isTerminal(lifecycle));

  // Editing allowed when all active PVMs are paused with ok/host status
  const allPausedOk =
    snapshots.size > 0 &&
    [...snapshots.values()].every(
      ({ lifecycle, snapshot }) =>
        (lifecycle === "paused" && snapshot.status === "ok") ||
        (lifecycle === "paused_host_call" &&
          (snapshot.status === "ok" || snapshot.status === "host")),
    );

  // Collect active PVM ids from snapshots
  const activePvmIds = new Set(snapshots.keys());

  // During host-call pause, memory writes should also update pending changes
  const isHostCallPaused = selectedLifecycle === "paused_host_call";

  // Settings cog toggle
  const settingsOpen = activeTab === "settings";
  const toggleSettings = useCallback(() => {
    if (settingsOpen) {
      setActiveTab(null);
    } else {
      openToTab("settings");
    }
  }, [settingsOpen, setActiveTab, openToTab]);

  return (
    <div data-testid="debugger-page" className="h-full">
      <DebuggerLayout
        toolbar={
          <>
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
              steppingMode={settings.steppingMode}
              nInstructionsCount={settings.nInstructionsCount}
            />
            <div className="flex items-center gap-2 ml-auto">
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
              <PvmTabs
                snapshots={snapshots}
                selectedPvmId={selectedPvmId}
                onSelect={setSelectedPvmId}
                divergenceSummary={divergenceSummary}
                divergenceDetails={divergenceDetails}
                perPvmErrors={perPvmErrors}
                activePvmIds={activePvmIds}
              />
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    data-testid="settings-cog"
                    aria-label="Settings"
                    onClick={toggleSettings}
                    className={`cursor-pointer shadow-none border-0 h-auto p-1 text-muted-foreground ${settingsOpen ? "bg-accent" : ""}`}
                  >
                    <Settings className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Settings</TooltipContent>
              </Tooltip>
            </div>
          </>
        }
        instructions={
          <InstructionsPanel
            instructions={instructions}
            currentPc={currentPc}
            orchestrator={orchestrator}
          />
        }
        registers={
          <RegistersPanel
            snapshot={selectedEntry?.snapshot ?? null}
            lifecycle={selectedEntry?.lifecycle ?? null}
            orchestrator={orchestrator}
            selectedPvmId={selectedPvmId}
            snapshots={snapshots}
            pendingChanges={pendingChanges}
          />
        }
        memory={
          <MemoryPanel
            orchestrator={orchestrator}
            pvmId={selectedPvmId}
            pageMap={orchestrator?.getPageMap() ?? []}
            snapshotVersion={snapshotVersion}
            programKind={envelope?.programKind ?? "generic"}
            memoryChunks={envelope?.initialState.memoryChunks ?? []}
            editable={allPausedOk}
            onPendingWrite={
              isHostCallPaused ? pendingChanges.writeMemory : undefined
            }
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
            pendingChanges={pendingChanges}
            snapshotVersion={snapshotVersion}
          />
        }
      />
    </div>
  );
}

export function DebuggerPage() {
  return (
    <DrawerProvider>
      <DebuggerPageInner />
    </DrawerProvider>
  );
}
