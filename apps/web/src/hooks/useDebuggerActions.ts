import { useCallback, useEffect, useRef, useState } from "react";
import type { Orchestrator } from "@pvmdbg/orchestrator";
import type { PvmLifecycle } from "@pvmdbg/types";
import { isTerminal } from "@pvmdbg/types";
import type { SteppingMode } from "../lib/debugger-settings";

interface UseDebuggerActionsParams {
  orchestrator: Orchestrator | null;
  isStepInProgress: boolean;
  setIsStepInProgress: (value: boolean) => void;
  selectedLifecycle: PvmLifecycle | null;
  /** Called when the user clicks Load to navigate + teardown. */
  onLoad: () => void;
  /** Current stepping mode from settings. */
  steppingMode: SteppingMode;
  /** Number of instructions for n_instructions mode. */
  nInstructionsCount: number;
}

interface DebuggerActions {
  next: () => void;
  step: () => void;
  run: () => void;
  pause: () => void;
  reset: () => void;
  load: () => void;
  canStep: boolean;
  isRunning: boolean;
  error: string | null;
  clearError: () => void;
}

/** Resolve stepping mode to the number of steps to execute. */
export function stepsForMode(mode: SteppingMode, nInstructionsCount: number): number {
  switch (mode) {
    case "instruction":
      return 1;
    case "block":
      return 10; // temporary placeholder until Sprint 33
    case "n_instructions":
      return nInstructionsCount;
  }
}

export function useDebuggerActions({
  orchestrator,
  isStepInProgress,
  setIsStepInProgress,
  selectedLifecycle,
  onLoad,
  steppingMode,
  nInstructionsCount,
}: UseDebuggerActionsParams): DebuggerActions {
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const stopFlagRef = useRef(false);
  // Synchronous running-state tracker for keyboard handler (avoids stale React state in closures).
  const isRunningRef = useRef(false);

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

  const step = useCallback(() => {
    if (!orchestrator || isStepInProgress || isRunning) return;
    if (selectedLifecycle && isTerminal(selectedLifecycle)) return;

    const n = stepsForMode(steppingMode, nInstructionsCount);
    setIsStepInProgress(true);
    orchestrator.step(n).catch((err) => {
      setError(err instanceof Error ? err.message : String(err));
      setIsStepInProgress(false);
    });
  }, [orchestrator, isStepInProgress, isRunning, selectedLifecycle, setIsStepInProgress, steppingMode, nInstructionsCount]);

  const run = useCallback(() => {
    if (!orchestrator || isRunning || isRunningRef.current) return;
    if (selectedLifecycle && isTerminal(selectedLifecycle)) return;

    stopFlagRef.current = false;
    isRunningRef.current = true;
    setIsRunning(true);

    const stepSize = stepsForMode(steppingMode, nInstructionsCount);

    const loop = async () => {
      try {
        while (!stopFlagRef.current) {
          // Batch multiple steps before yielding to React.
          // This reduces render frequency and keeps the Pause button
          // stable/clickable during continuous execution.
          const BATCH_SIZE = 100;
          for (let i = 0; i < BATCH_SIZE && !stopFlagRef.current; i++) {
            const result = await orchestrator.step(stepSize);

            // Check if all PVMs are terminal
            let allTerminal = true;
            for (const [, report] of result.results) {
              if (!isTerminal(report.lifecycle)) {
                allTerminal = false;
                break;
              }
            }
            if (allTerminal) {
              isRunningRef.current = false;
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
        isRunningRef.current = false;
        setIsRunning(false);
      }
    };

    loop();
  }, [orchestrator, isRunning, selectedLifecycle, steppingMode, nInstructionsCount]);

  const pause = useCallback(() => {
    stopFlagRef.current = true;
  }, []);

  const reset = useCallback(() => {
    if (!orchestrator) return;

    stopFlagRef.current = true;
    isRunningRef.current = false;
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
    isRunningRef.current = false;
    setIsRunning(false);
    onLoad();
  }, [onLoad]);

  const clearError = useCallback(() => setError(null), []);

  // Keyboard shortcuts — registered at document level.
  // F10 → Next, F5 → Run/Pause toggle, Ctrl+Shift+R → Reset
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Skip when focus is inside an input or textarea to avoid editing conflicts.
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;

      if (e.key === "F10") {
        e.preventDefault();
        next();
        return;
      }

      if (e.key === "F5") {
        e.preventDefault();
        if (isRunningRef.current) {
          pause();
        } else {
          run();
        }
        return;
      }

      if (e.key === "R" && e.ctrlKey && e.shiftKey) {
        e.preventDefault();
        reset();
        return;
      }
    };

    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [next, run, pause, reset]);

  return { next, step, run, pause, reset, load, canStep, isRunning, error, clearError };
}
