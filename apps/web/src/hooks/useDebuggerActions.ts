import type { Orchestrator } from "@pvmdbg/orchestrator";
import type {
  HostCallInfo,
  HostCallResumeEffects,
  HostCallResumeProposal,
  MachineStateSnapshot,
  PvmLifecycle,
  StepResult,
} from "@pvmdbg/types";
import { isTerminal, toHex } from "@pvmdbg/types";
import { useCallback, useEffect, useRef, useState } from "react";
import type {
  AutoContinuePolicy,
  SteppingMode,
} from "../lib/debugger-settings";
import { deriveKeyHex } from "../lib/storage-utils";
import {
  buildBlocksFromInstructions,
  computeMultiPvmBlockStepCount,
} from "./useBlockStepping";
import type { DecodedInstruction } from "./useDisassembly";
import type { UseStorageTable } from "./useStorageTable";

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
  /** Auto-continue policy for host calls during run mode. */
  autoContinuePolicy: AutoContinuePolicy;
  /** Session-scoped storage table for storage host call overrides. */
  storageTable: UseStorageTable;
  /** Decoded instructions for block stepping (from useDisassembly). */
  instructions?: DecodedInstruction[];
  /** Current PVM snapshots for multi-PVM block stepping. */
  snapshots?: Map<
    string,
    { snapshot: MachineStateSnapshot; lifecycle: PvmLifecycle }
  >;
  /** Get pending host-call effects from the usePendingChanges hook. */
  getHostCallEffects?: () => HostCallResumeEffects | null;
  /** Clear pending host-call effects (e.g. on reset). */
  clearHostCallEffects?: () => void;
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

/** Resolve stepping mode to the number of steps to execute.
 *  For block mode, use computeBlockStepSize() instead — it needs
 *  disassembly + snapshot data that this simple resolver doesn't have. */
export function stepsForMode(
  mode: SteppingMode,
  nInstructionsCount: number,
): number {
  switch (mode) {
    case "instruction":
      return 1;
    case "block":
      // Block mode is handled dynamically via computeBlockStepSize();
      // fall back to 1 if called without block context.
      return 1;
    case "n_instructions":
      return nInstructionsCount;
  }
}

/** Convert a trace-backed resume proposal to effects, or return empty effects. */
export function proposalToEffects(
  proposal?: HostCallResumeProposal,
): HostCallResumeEffects {
  if (!proposal) return {};
  return {
    registerWrites: proposal.registerWrites,
    memoryWrites: proposal.memoryWrites,
    gasAfter: proposal.gasAfter,
  };
}

/**
 * Build resume effects for a storage host call, merging custom storage values.
 *
 * For read (index 3): if the storage table has a custom value for the key,
 * override the trace proposal's memory write at the destination address.
 *
 * For write (index 4): after resume, the written k/v should be persisted to
 * the storage table (done in the caller after resume).
 */
export function storageAwareEffects(
  hc: HostCallInfo,
  storageTable: UseStorageTable,
  base?: HostCallResumeEffects,
): HostCallResumeEffects {
  const effectiveBase = base ?? proposalToEffects(hc.resumeProposal);

  // Only apply storage overrides for read/write host calls
  if (hc.hostCallIndex !== 3 && hc.hostCallIndex !== 4) {
    return effectiveBase;
  }

  // Try to derive the key hex for this host call
  const keyHex = deriveKeyHex(hc);
  if (!keyHex) return effectiveBase;

  // Check if there's a custom value in the storage table
  if (hc.hostCallIndex === 3 && storageTable.hasEntry(keyHex)) {
    // Destination address comes from the proposal's memory writes.
    // Without it we can't know where to write — skip the override.
    const destAddr = effectiveBase.memoryWrites?.[0]?.address;
    if (destAddr === undefined) return effectiveBase;

    const override = storageTable.store.buildReadOverride(keyHex, destAddr);
    if (override) {
      return {
        ...effectiveBase,
        memoryWrites: override.memoryWrites,
      };
    }
  }

  return effectiveBase;
}

/** Persist write host call data to the storage table after resume. */
export function persistWriteToStorage(
  hc: HostCallInfo,
  storageTable: UseStorageTable,
): void {
  if (hc.hostCallIndex !== 4) return;
  const proposal = hc.resumeProposal;
  if (!proposal) return;

  const keyHex = deriveKeyHex(hc);
  if (!keyHex) return;

  // For write, value is at ω9/ω10
  const valPtr = Number(hc.currentState.registers[9] ?? 0n);
  const valLen = Number(hc.currentState.registers[10] ?? 0n);

  for (const mw of proposal.memoryWrites) {
    if (mw.address === valPtr && mw.data.length >= valLen) {
      const valData = mw.data.slice(0, valLen);
      storageTable.setEntry(keyHex, toHex(valData));
      return;
    }
  }
}

/** Resume all PVMs that are currently paused on a host call. */
async function resumeAllHostCalls(
  orch: Orchestrator,
  storageTable: UseStorageTable,
  getEffects?: () => HostCallResumeEffects | null,
): Promise<void> {
  // User-edited pending effects (null during auto-continue -> falls back to proposal).
  const userEffects = getEffects?.() ?? null;
  for (const pvmId of orch.getPvmIds()) {
    const hc = orch.getPendingHostCall(pvmId);
    if (hc) {
      const base = userEffects ?? proposalToEffects(hc.resumeProposal);
      const effects = storageAwareEffects(hc, storageTable, base);
      await orch.resumeHostCall(pvmId, effects);
      // After write host call resumes, persist to storage table
      persistWriteToStorage(hc, storageTable);
    }
  }
}

/** Determine whether to auto-continue past host calls during run mode. */
export function shouldAutoContinue(
  policy: AutoContinuePolicy,
  result: StepResult,
): boolean {
  if (policy === "never") return false;
  if (policy === "always_continue") return true;

  // "continue_when_trace_matches" — only continue if all host-call-paused
  // PVMs have a matching trace proposal.
  for (const [, report] of result.results) {
    if (report.lifecycle === "paused_host_call" && report.hostCall) {
      if (!report.hostCall.resumeProposal?.traceMatches) {
        return false;
      }
    }
  }
  return true;
}

/** Check whether any PVM in the step result hit a breakpoint. */
export function hasBreakpointHit(result: StepResult): boolean {
  for (const [, report] of result.results) {
    if (report.hitBreakpoint) {
      return true;
    }
  }
  return false;
}

/** Check whether any PVM in the step result is paused on a host call. */
export function hasHostCallPause(result: StepResult): boolean {
  for (const [, report] of result.results) {
    if (report.lifecycle === "paused_host_call") {
      return true;
    }
  }
  return false;
}

export function useDebuggerActions({
  orchestrator,
  isStepInProgress,
  setIsStepInProgress,
  selectedLifecycle,
  onLoad,
  steppingMode,
  nInstructionsCount,
  autoContinuePolicy,
  storageTable,
  instructions,
  snapshots,
  getHostCallEffects,
  clearHostCallEffects,
}: UseDebuggerActionsParams): DebuggerActions {
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const stopFlagRef = useRef(false);
  // Synchronous running-state tracker for keyboard handler (avoids stale React state in closures).
  const isRunningRef = useRef(false);

  // Pre-compute blocks from instructions for block stepping (stable across renders via ref).
  const blocksRef = useRef(buildBlocksFromInstructions(instructions ?? []));
  blocksRef.current = buildBlocksFromInstructions(instructions ?? []);
  // Keep a ref to snapshots so the run loop can read the latest value.
  const snapshotsRef = useRef(snapshots);
  snapshotsRef.current = snapshots;

  /** Compute the step size for the current mode, using block data when in block mode. */
  function computeStepSize(): number {
    if (steppingMode === "block") {
      const snaps = snapshotsRef.current;
      if (!snaps || snaps.size === 0) return 1;
      return computeMultiPvmBlockStepCount(blocksRef.current, snaps);
    }
    return stepsForMode(steppingMode, nInstructionsCount);
  }

  // Note: isStepInProgress is intentionally excluded here to avoid a
  // disabled-flash on every step. The next/step callbacks already guard
  // against double-stepping via their own isStepInProgress check.
  const canStep =
    !!orchestrator &&
    !isRunning &&
    !!selectedLifecycle &&
    !isTerminal(selectedLifecycle);

  /** Next button: settings-dependent step count. */
  const next = useCallback(() => {
    if (!orchestrator || isStepInProgress || isRunning) return;
    if (selectedLifecycle && isTerminal(selectedLifecycle)) return;

    const n = computeStepSize();
    setIsStepInProgress(true);

    const doStep = async () => {
      await resumeAllHostCalls(orchestrator, storageTable, getHostCallEffects);
      await orchestrator.step(n);
    };

    doStep().catch((err) => {
      setError(err instanceof Error ? err.message : String(err));
      setIsStepInProgress(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    orchestrator,
    isStepInProgress,
    isRunning,
    selectedLifecycle,
    setIsStepInProgress,
    steppingMode,
    nInstructionsCount,
    storageTable,
    instructions,
    snapshots,
    getHostCallEffects,
  ]);

  /** Step button: always executes exactly one instruction. */
  const step = useCallback(() => {
    if (!orchestrator || isStepInProgress || isRunning) return;
    if (selectedLifecycle && isTerminal(selectedLifecycle)) return;

    setIsStepInProgress(true);

    const doStep = async () => {
      await resumeAllHostCalls(orchestrator, storageTable, getHostCallEffects);
      await orchestrator.step(1);
    };

    doStep().catch((err) => {
      setError(err instanceof Error ? err.message : String(err));
      setIsStepInProgress(false);
    });
  }, [
    orchestrator,
    isStepInProgress,
    isRunning,
    selectedLifecycle,
    setIsStepInProgress,
    storageTable,
    getHostCallEffects,
  ]);

  const run = useCallback(() => {
    if (!orchestrator || isRunning || isRunningRef.current) return;
    if (selectedLifecycle && isTerminal(selectedLifecycle)) return;

    stopFlagRef.current = false;
    isRunningRef.current = true;
    setIsRunning(true);

    const loop = async () => {
      try {
        // Resume any pending host calls before starting the run loop
        // (user explicitly clicked Run, so always resume).
        await resumeAllHostCalls(
          orchestrator,
          storageTable,
          getHostCallEffects,
        );

        while (!stopFlagRef.current) {
          // Batch multiple steps before yielding to React.
          // This reduces render frequency and keeps the Pause button
          // stable/clickable during continuous execution.
          const BATCH_SIZE = 100;
          for (let i = 0; i < BATCH_SIZE && !stopFlagRef.current; i++) {
            // Recalculate step size on every iteration for block mode
            // (block boundaries change as the PC moves).
            const stepSize = computeStepSize();
            const result = await orchestrator.step(stepSize);

            // Check if any PVM hit a breakpoint
            if (hasBreakpointHit(result)) {
              isRunningRef.current = false;
              setIsRunning(false);
              return;
            }

            // Handle host call pauses based on auto-continue policy
            if (hasHostCallPause(result)) {
              if (!shouldAutoContinue(autoContinuePolicy, result)) {
                // Policy says stop — exit the run loop
                isRunningRef.current = false;
                setIsRunning(false);
                return;
              }
              // Auto-continue: resume using trace proposals (not user-edited pending changes,
              // which may be stale from a previous host call's auto-apply).
              await resumeAllHostCalls(orchestrator, storageTable);
            }

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    orchestrator,
    isRunning,
    selectedLifecycle,
    steppingMode,
    nInstructionsCount,
    autoContinuePolicy,
    storageTable,
    getHostCallEffects,
  ]);

  const pause = useCallback(() => {
    stopFlagRef.current = true;
  }, []);

  const reset = useCallback(() => {
    if (!orchestrator) return;

    // Clear pending changes before async reset
    clearHostCallEffects?.();

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
  }, [orchestrator, setIsStepInProgress, clearHostCallEffects]);

  const load = useCallback(() => {
    stopFlagRef.current = true;
    isRunningRef.current = false;
    setIsRunning(false);
    onLoad();
  }, [onLoad]);

  const clearError = useCallback(() => setError(null), []);

  // Keyboard shortcuts — registered at document level.
  // Ctrl+Shift+N → Next, Ctrl+Shift+S → Step, Ctrl+Shift+P → Run/Pause, Ctrl+Shift+R → Reset
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Skip when focus is inside an input or textarea to avoid editing conflicts.
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;

      if (!e.ctrlKey || !e.shiftKey) return;

      if (e.key === "N") {
        e.preventDefault();
        next();
        return;
      }

      if (e.key === "S") {
        e.preventDefault();
        step();
        return;
      }

      if (e.key === "P") {
        e.preventDefault();
        if (isRunningRef.current) {
          pause();
        } else {
          run();
        }
        return;
      }

      if (e.key === "R") {
        e.preventDefault();
        reset();
        return;
      }
    };

    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [next, step, run, pause, reset]);

  return {
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
  };
}
