import type {
  HostCallInfo,
  HostCallMismatch,
  HostCallResumeProposal,
  MachineStateSnapshot,
  EcalliTrace,
} from "@pvmdbg/types";
import { getHostCallName, traceMemoryWriteToBytes, serializeTrace } from "@pvmdbg/trace";
import { cloneSnapshot } from "./session.js";

export interface BuildHostCallResult {
  info: HostCallInfo;
  newHostCallCounter: number;
}

/**
 * Build a HostCallInfo from the current session state.
 *
 * Rules:
 * - match reference trace entries by sequential host-call position only
 * - derive hostCallName via getHostCallName()
 * - convert trace memory writes with traceMemoryWriteToBytes()
 * - compute structured mismatches for host call index, PC, and gas
 * - increment the counter in the returned result
 */
export function buildHostCallInfo(
  pvmId: string,
  exitArg: number,
  currentState: MachineStateSnapshot,
  referenceTrace: EcalliTrace | undefined,
  hostCallCounter: number,
): BuildHostCallResult {
  const hostCallName = getHostCallName(exitArg);
  const traceEntry = referenceTrace?.entries[hostCallCounter];

  let resumeProposal: HostCallResumeProposal | undefined;

  if (traceEntry) {
    const mismatches: HostCallMismatch[] = [];

    if (traceEntry.index !== exitArg) {
      mismatches.push({
        field: "hostCallIndex",
        expected: String(traceEntry.index),
        actual: String(exitArg),
      });
    }

    if (traceEntry.pc !== currentState.pc) {
      mismatches.push({
        field: "pc",
        expected: String(traceEntry.pc),
        actual: String(currentState.pc),
      });
    }

    if (traceEntry.gas !== currentState.gas) {
      mismatches.push({
        field: "gas",
        expected: traceEntry.gas.toString(),
        actual: currentState.gas.toString(),
      });
    }

    resumeProposal = {
      registerWrites: new Map(traceEntry.registerWrites),
      memoryWrites: traceEntry.memoryWrites.map((mw) =>
        traceMemoryWriteToBytes(mw),
      ),
      gasAfter: traceEntry.gasAfter,
      traceMatches: traceEntry.index === exitArg,
      mismatches,
    };
  }

  const info: HostCallInfo = {
    pvmId,
    hostCallIndex: exitArg,
    hostCallName,
    currentState: cloneSnapshot(currentState),
    resumeProposal,
  };

  return {
    info,
    newHostCallCounter: hostCallCounter + 1,
  };
}

/**
 * Serialize a recorded EcalliTrace to canonical JIP-6 text.
 * Thin wrapper over serializeTrace from @pvmdbg/trace.
 */
export function serializeRecordedTrace(trace: EcalliTrace): string {
  return serializeTrace(trace);
}
