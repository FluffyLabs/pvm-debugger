import * as fs from "node:fs/promises";
import type {
  PvmLifecycle,
  MachineStateSnapshot,
  HostCallMismatch,
  EcalliTrace,
  ProgramEnvelope,
  HostCallResumeEffects,
} from "@pvmdbg/types";
import { isTerminal } from "@pvmdbg/types";
import { parseTrace, getHostCallName } from "@pvmdbg/trace";
import { decodeTrace } from "@pvmdbg/content";
import { Orchestrator } from "@pvmdbg/orchestrator";
import {
  DirectAdapter,
  TypeberrySyncInterpreter,
  AnanasSyncInterpreter,
  initAnanas,
} from "@pvmdbg/runtime-worker";

export type Logger = (message: string) => void;

export interface ReplayOptions {
  pvms: Array<"typeberry" | "ananas">;
  timeoutMs: number;
  verbose: boolean;
  logger?: Logger;
}

export interface ReplayResult {
  tracePath: string;
  trace: EcalliTrace;
  envelope: ProgramEnvelope;
  results: Map<string, ReplayPvmResult>;
}

export interface ReplayPvmResult {
  pvmId: string;
  pvmName: string;
  lifecycle: PvmLifecycle;
  snapshot: MachineStateSnapshot;
  passed: boolean;
  mismatches: HostCallMismatch[];
}

/**
 * Check if all sessions in the orchestrator are in a terminal state.
 */
export function allSessionsTerminal(
  snapshots: Map<string, { snapshot: MachineStateSnapshot; lifecycle: PvmLifecycle }>,
): boolean {
  for (const { lifecycle } of snapshots.values()) {
    if (!isTerminal(lifecycle)) {
      return false;
    }
  }
  return true;
}

/**
 * Compare a PVM's final state against the trace termination entry.
 * Produces structured HostCallMismatch[] for any differences.
 */
export function compareFinalState(
  snapshotWithLifecycle: { snapshot: MachineStateSnapshot; lifecycle: PvmLifecycle },
  trace: EcalliTrace,
): HostCallMismatch[] {
  const mismatches: HostCallMismatch[] = [];
  const { snapshot, lifecycle } = snapshotWithLifecycle;

  // Non-terminated PVMs fail immediately
  if (!isTerminal(lifecycle)) {
    mismatches.push({
      field: "lifecycle",
      expected: "terminated",
      actual: lifecycle,
    });
    return mismatches;
  }

  if (!trace.termination) {
    // No termination in trace — cannot compare
    return mismatches;
  }

  // Map trace termination kind to PvmStatus
  const expectedStatus = traceKindToStatus(trace.termination.kind);
  if (snapshot.status !== expectedStatus) {
    mismatches.push({
      field: "status",
      expected: expectedStatus,
      actual: snapshot.status,
    });
  }

  // Compare PC
  if (snapshot.pc !== trace.termination.pc) {
    mismatches.push({
      field: "pc",
      expected: String(trace.termination.pc),
      actual: String(snapshot.pc),
    });
  }

  // Compare gas exactly
  if (snapshot.gas !== trace.termination.gas) {
    mismatches.push({
      field: "gas",
      expected: trace.termination.gas.toString(),
      actual: snapshot.gas.toString(),
    });
  }

  // Compare all 13 registers
  for (let i = 0; i < 13; i++) {
    const expected = trace.termination.registers.get(i) ?? 0n;
    const actual = snapshot.registers[i] ?? 0n;
    if (actual !== expected) {
      mismatches.push({
        field: `register[${i}]`,
        expected: expected.toString(),
        actual: actual.toString(),
      });
    }
  }

  return mismatches;
}

function traceKindToStatus(kind: "halt" | "panic" | "fault" | "oog"): string {
  switch (kind) {
    case "halt":
      return "halt";
    case "panic":
      return "panic";
    case "fault":
      return "fault";
    case "oog":
      return "out_of_gas";
  }
}

/**
 * Replay a trace file through the orchestrator with real PVM adapters.
 */
export async function replay(
  tracePath: string,
  options: ReplayOptions,
): Promise<ReplayResult> {
  const log: Logger = options.logger ?? (() => {});

  // 1. Read trace file
  const content = await fs.readFile(tracePath, "utf-8");

  // 2. Parse trace
  const trace = parseTrace(content);

  // 3. Build program envelope
  const envelope = decodeTrace(content, "example", tracePath);

  // 4. Create orchestrator
  const orchestrator = new Orchestrator({ stepTimeoutMs: options.timeoutMs });

  // 5. Create adapters for each requested PVM
  for (const pvmKind of options.pvms) {
    let adapter: DirectAdapter;
    if (pvmKind === "typeberry") {
      const interpreter = new TypeberrySyncInterpreter();
      adapter = new DirectAdapter("typeberry", "Typeberry", interpreter);
    } else {
      const ananasApi = await initAnanas();
      const interpreter = new AnanasSyncInterpreter(ananasApi);
      adapter = new DirectAdapter("ananas", "Ananas", interpreter);
    }
    orchestrator.addPvm(adapter);
  }

  // 6. Load program
  await orchestrator.loadProgram(envelope);

  // 7. Attach reference trace to every PVM session
  for (const pvmId of orchestrator.getPvmIds()) {
    orchestrator.setTrace(pvmId, trace);
  }

  // 8. Replay loop: step(1) until all sessions are terminal
  let stepCount = 0;
  const MAX_STEPS = 100_000_000;

  while (!allSessionsTerminal(orchestrator.getSnapshots())) {
    stepCount++;
    if (stepCount > MAX_STEPS) {
      throw new Error(`Replay exceeded maximum step count (${MAX_STEPS})`);
    }

    const stepResult = await orchestrator.step(1);

    // Check for host calls and resume them
    for (const [pvmId, report] of stepResult.results) {
      if (report.lifecycle === "paused_host_call" && report.hostCall) {
        const hcInfo = report.hostCall;
        if (options.verbose) {
          log(
            `[${pvmId}] Host call #${hcInfo.hostCallIndex} (${hcInfo.hostCallName}) ` +
            `trace=${hcInfo.resumeProposal ? (hcInfo.resumeProposal.traceMatches ? "match" : "MISMATCH") : "no-proposal"}`,
          );
        }

        if (!hcInfo.resumeProposal) {
          throw new Error(
            `[${pvmId}] Missing host-call resume proposal at host call #${hcInfo.hostCallIndex} (${hcInfo.hostCallName})`,
          );
        }

        const effects: HostCallResumeEffects = {
          registerWrites: hcInfo.resumeProposal.registerWrites,
          memoryWrites: hcInfo.resumeProposal.memoryWrites,
          gasAfter: hcInfo.resumeProposal.gasAfter,
        };
        await orchestrator.resumeHostCall(pvmId, effects);
      }
    }
  }

  if (options.verbose) {
    log(`Replay completed after ${stepCount} steps`);
  }

  // 9. Compare final state for each PVM
  const results = new Map<string, ReplayPvmResult>();
  const snapshots = orchestrator.getSnapshots();

  for (const [pvmId, snapshotEntry] of snapshots) {
    const mismatches = compareFinalState(snapshotEntry, trace);
    const passed = mismatches.length === 0;

    if (options.verbose) {
      log(
        `[${pvmId}] ${passed ? "PASS" : "FAIL"} — ` +
        `status=${snapshotEntry.snapshot.status} pc=${snapshotEntry.snapshot.pc} gas=${snapshotEntry.snapshot.gas}`,
      );
      if (!passed) {
        for (const m of mismatches) {
          log(`  ${m.field}: expected=${m.expected} actual=${m.actual}`);
        }
      }
    }

    // Find the PVM name from the adapter
    const pvmName = pvmId.charAt(0).toUpperCase() + pvmId.slice(1);

    results.set(pvmId, {
      pvmId,
      pvmName,
      lifecycle: snapshotEntry.lifecycle,
      snapshot: snapshotEntry.snapshot,
      passed,
      mismatches,
    });
  }

  // Cleanup
  await orchestrator.shutdown();

  return {
    tracePath,
    trace,
    envelope,
    results,
  };
}
