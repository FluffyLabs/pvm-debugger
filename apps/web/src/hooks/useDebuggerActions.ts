import { useCallback, useRef, useState } from "react";
import type { Orchestrator } from "@pvmdbg/orchestrator";
import type { PvmLifecycle } from "@pvmdbg/types";
import { isTerminal } from "@pvmdbg/types";

interface UseDebuggerActionsParams {
  orchestrator: Orchestrator | null;
  isStepInProgress: boolean;
  setIsStepInProgress: (value: boolean) => void;
  selectedLifecycle: PvmLifecycle | null;
  /** Called when the user clicks Load to navigate + teardown. */
  onLoad: () => void;
}

interface DebuggerActions {
  next: () => void;
  run: () => void;
  pause: () => void;
  reset: () => void;
  load: () => void;
  canStep: boolean;
  isRunning: boolean;
  error: string | null;
  clearError: () => void;
}

export function useDebuggerActions({
  orchestrator,
  isStepInProgress,
  setIsStepInProgress,
  selectedLifecycle,
  onLoad,
}: UseDebuggerActionsParams): DebuggerActions {
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const stopFlagRef = useRef(false);

  const canStep =
    !!orchestrator &&
    !isStepInProgress &&
    !isRunning &&
    !!selectedLifecycle &&
    !isTerminal(selectedLifecycle);

  const next = useCallback(() => {
    if (!orchestrator || isStepInProgress || isRunning) return;
    if (selectedLifecycle && isTerminal(selectedLifecycle)) return;

    setIsStepInProgress(true);
    orchestrator.step(1).catch((err) => {
      setError(err instanceof Error ? err.message : String(err));
      setIsStepInProgress(false);
    });
  }, [orchestrator, isStepInProgress, isRunning, selectedLifecycle, setIsStepInProgress]);

  const run = useCallback(() => {
    if (!orchestrator || isRunning) return;
    if (selectedLifecycle && isTerminal(selectedLifecycle)) return;

    stopFlagRef.current = false;
    setIsRunning(true);

    const loop = async () => {
      try {
        while (!stopFlagRef.current) {
          // Batch multiple steps before yielding to React.
          // This reduces render frequency and keeps the Pause button
          // stable/clickable during continuous execution.
          const BATCH_SIZE = 100;
          for (let i = 0; i < BATCH_SIZE && !stopFlagRef.current; i++) {
            const result = await orchestrator.step(1);

            // Check if all PVMs are terminal
            let allTerminal = true;
            for (const [, report] of result.results) {
              if (!isTerminal(report.lifecycle)) {
                allTerminal = false;
                break;
              }
            }
            if (allTerminal) {
              setIsRunning(false);
              return;
            }
          }

          // Yield to React for UI updates between batches
          await new Promise<void>((resolve) => setTimeout(resolve, 0));
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setIsRunning(false);
      }
    };

    loop();
  }, [orchestrator, isRunning, selectedLifecycle]);

  const pause = useCallback(() => {
    stopFlagRef.current = true;
  }, []);

  const reset = useCallback(() => {
    if (!orchestrator) return;

    stopFlagRef.current = true;
    setIsRunning(false);
    setIsStepInProgress(true);

    orchestrator
      .reset()
      .then(() => {
        setError(null);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => {
        setIsStepInProgress(false);
      });
  }, [orchestrator, setIsStepInProgress]);

  const load = useCallback(() => {
    stopFlagRef.current = true;
    setIsRunning(false);
    onLoad();
  }, [onLoad]);

  const clearError = useCallback(() => setError(null), []);

  return { next, run, pause, reset, load, canStep, isRunning, error, clearError };
}
