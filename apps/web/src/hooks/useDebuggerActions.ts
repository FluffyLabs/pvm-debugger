import { useCallback } from "react";
import type { Orchestrator } from "@pvmdbg/orchestrator";
import type { PvmLifecycle } from "@pvmdbg/types";
import { isTerminal } from "@pvmdbg/types";

interface UseDebuggerActionsParams {
  orchestrator: Orchestrator | null;
  isStepInProgress: boolean;
  setIsStepInProgress: (value: boolean) => void;
  selectedLifecycle: PvmLifecycle | null;
}

interface DebuggerActions {
  next: () => void;
  canStep: boolean;
}

export function useDebuggerActions({
  orchestrator,
  isStepInProgress,
  setIsStepInProgress,
  selectedLifecycle,
}: UseDebuggerActionsParams): DebuggerActions {
  const canStep =
    !!orchestrator &&
    !isStepInProgress &&
    !!selectedLifecycle &&
    !isTerminal(selectedLifecycle);

  const next = useCallback(() => {
    if (!orchestrator || isStepInProgress) return;
    if (selectedLifecycle && isTerminal(selectedLifecycle)) return;

    setIsStepInProgress(true);
    orchestrator.step(1).catch(() => {
      // Errors are handled via the orchestrator error event,
      // which sets isStepInProgress to false in useOrchestratorState.
    });
  }, [orchestrator, isStepInProgress, selectedLifecycle, setIsStepInProgress]);

  return { next, canStep };
}
