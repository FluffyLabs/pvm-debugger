import type { MachineStateSnapshot } from "./machine-state.js";
import type { PvmLifecycle, PvmStatus } from "./pvm-status.js";

export interface HostCallMismatch {
  field: string;
  expected: string;
  actual: string;
}

export interface HostCallResumeEffects {
  registerWrites?: Map<number, bigint>;
  memoryWrites?: Array<{ address: number; data: Uint8Array }>;
  gasAfter?: bigint;
}

export interface HostCallResumeProposal {
  registerWrites: Map<number, bigint>;
  memoryWrites: Array<{ address: number; data: Uint8Array }>;
  gasAfter?: bigint;
  traceMatches: boolean;
  mismatches: HostCallMismatch[];
}

export interface HostCallInfo {
  pvmId: string;
  hostCallIndex: number;
  hostCallName: string;
  currentState: MachineStateSnapshot;
  resumeProposal?: HostCallResumeProposal;
}

export interface PvmStepReport {
  pvmId: string;
  lifecycle: PvmLifecycle;
  snapshot: MachineStateSnapshot;
  stepsExecuted: number;
  hitBreakpoint: boolean;
  hostCall?: HostCallInfo;
}

export interface StepResult {
  results: Map<string, PvmStepReport>;
}

export interface OrchestratorEvents {
  pvmStateChanged: (
    pvmId: string,
    snapshot: MachineStateSnapshot,
    lifecycle: PvmLifecycle,
  ) => void;
  hostCallPaused: (pvmId: string, info: HostCallInfo) => void;
  terminated: (pvmId: string, reason: PvmStatus) => void;
  error: (pvmId: string, error: Error) => void;
}
