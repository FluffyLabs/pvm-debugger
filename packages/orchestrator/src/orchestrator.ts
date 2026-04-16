import type {
  AdapterStepResult,
  EcalliTrace,
  HostCallInfo,
  HostCallResumeEffects,
  MachineStateSnapshot,
  OrchestratorEvents,
  PageMapEntry,
  ProgramEnvelope,
  PvmAdapter,
  PvmLifecycle,
  PvmStatus,
  PvmStepReport,
  StepResult,
} from "@pvmdbg/types";
import { buildHostCallInfo } from "./host-call-handler.js";
import {
  appendHostCallEntry,
  appendTermination,
  buildRecordedTracePrelude,
  cloneEnvelope,
  cloneHostCallInfo,
  clonePageMap,
  cloneSnapshot,
  cloneTrace,
  createSession,
  type Session,
} from "./session.js";
import { TypedEventEmitter } from "./typed-event-emitter.js";

export interface OrchestratorConfig {
  stepTimeoutMs?: number;
}

const DEFAULT_STEP_TIMEOUT_MS = 10_000;

class StepTimeoutError extends Error {
  constructor() {
    super("Step timeout");
    this.name = "StepTimeoutError";
  }
}

export class Orchestrator extends TypedEventEmitter<OrchestratorEvents> {
  private sessions = new Map<string, Session>();
  private breakpoints = new Set<number>();
  private programBytes?: Uint8Array;
  private pageMap: PageMapEntry[] = [];
  private stepTimeoutMs: number;

  constructor(config?: OrchestratorConfig) {
    super();
    this.stepTimeoutMs = config?.stepTimeoutMs ?? DEFAULT_STEP_TIMEOUT_MS;
  }

  // -----------------------------------------------------------------------
  // PVM registration
  // -----------------------------------------------------------------------

  addPvm(adapter: PvmAdapter): void {
    this.sessions.set(adapter.pvmId, createSession(adapter));
  }

  removePvm(pvmId: string): void {
    this.sessions.delete(pvmId);
  }

  async shutdown(): Promise<void> {
    const promises: Promise<void>[] = [];
    for (const session of this.sessions.values()) {
      promises.push(session.adapter.shutdown());
    }
    await Promise.all(promises);
    this.sessions.clear();
    this.removeAllListeners();
  }

  // -----------------------------------------------------------------------
  // Load lifecycle
  // -----------------------------------------------------------------------

  async loadProgram(envelope: ProgramEnvelope): Promise<void> {
    this.programBytes = new Uint8Array(envelope.programBytes);
    this.pageMap = clonePageMap(envelope.initialState.pageMap);

    const promises: Promise<void>[] = [];
    for (const [pvmId, session] of this.sessions) {
      promises.push(this.loadSessionProgram(pvmId, session, envelope));
    }
    await Promise.all(promises);
  }

  private async loadSessionProgram(
    pvmId: string,
    session: Session,
    envelope: ProgramEnvelope,
  ): Promise<void> {
    const cloned = cloneEnvelope(envelope);
    await session.adapter.load(
      new Uint8Array(envelope.programBytes),
      {
        pc: envelope.initialState.pc,
        gas: envelope.initialState.gas,
        registers: [...envelope.initialState.registers],
        pageMap: clonePageMap(envelope.initialState.pageMap),
        memoryChunks: envelope.initialState.memoryChunks.map((c) => ({
          address: c.address,
          data: new Uint8Array(c.data),
        })),
      },
      envelope.loadContext
        ? {
            spiProgram: envelope.loadContext.spiProgram
              ? {
                  program: new Uint8Array(
                    envelope.loadContext.spiProgram.program,
                  ),
                  hasMetadata: envelope.loadContext.spiProgram.hasMetadata,
                }
              : undefined,
            spiArgs: envelope.loadContext.spiArgs
              ? new Uint8Array(envelope.loadContext.spiArgs)
              : undefined,
          }
        : undefined,
    );

    session.lifecycle = "paused";
    session.hostCallCounter = 0;
    session.pendingHostCall = null;
    session.loadedEnvelope = cloned;
    session.recordedTrace = buildRecordedTracePrelude(envelope);

    if (envelope.trace) {
      session.referenceTrace = cloneTrace(envelope.trace);
    }

    const snapshot = await session.adapter.getState();
    session.lastSnapshot = cloneSnapshot(snapshot);
    this.emit("pvmStateChanged", pvmId, cloneSnapshot(snapshot), "paused");
  }

  async reset(): Promise<void> {
    const promises: Promise<void>[] = [];
    for (const [pvmId, session] of this.sessions) {
      promises.push(this.resetSession(pvmId, session));
    }
    await Promise.all(promises);
  }

  private async resetSession(pvmId: string, session: Session): Promise<void> {
    await session.adapter.reset();
    session.lifecycle = "paused";
    session.hostCallCounter = 0;
    session.pendingHostCall = null;

    if (session.loadedEnvelope) {
      session.recordedTrace = buildRecordedTracePrelude(session.loadedEnvelope);
    }

    const snapshot = await session.adapter.getState();
    session.lastSnapshot = cloneSnapshot(snapshot);
    this.emit("pvmStateChanged", pvmId, cloneSnapshot(snapshot), "paused");
  }

  // -----------------------------------------------------------------------
  // Execution
  // -----------------------------------------------------------------------

  async step(numberOfSteps: number): Promise<StepResult> {
    const results = new Map<string, PvmStepReport>();
    const activeEntries: Array<[string, Session]> = [];

    // Include all PVMs — skipped ones get a zero-step report
    for (const [pvmId, session] of this.sessions) {
      if (session.lifecycle !== "paused") {
        results.set(pvmId, {
          pvmId,
          lifecycle: session.lifecycle,
          snapshot: cloneSnapshot(session.lastSnapshot),
          stepsExecuted: 0,
          hitBreakpoint: false,
        });
      } else {
        activeEntries.push([pvmId, session]);
      }
    }

    // Execute active PVMs concurrently, each with its own timeout
    const perPvmPromises = activeEntries.map(([, session]) =>
      this.stepWithTimeout(session, numberOfSteps),
    );
    const settled = await Promise.allSettled(perPvmPromises);

    for (let i = 0; i < settled.length; i++) {
      const [pvmId, session] = activeEntries[i];
      const outcome = settled[i];

      if (outcome.status === "fulfilled") {
        results.set(pvmId, outcome.value);
      } else {
        // Timeout or adapter failure
        const error =
          outcome.reason instanceof Error
            ? outcome.reason
            : new Error(String(outcome.reason));
        const isTimeout = outcome.reason instanceof StepTimeoutError;
        session.lifecycle = isTimeout ? "timed_out" : "failed";

        results.set(pvmId, {
          pvmId,
          lifecycle: session.lifecycle,
          snapshot: cloneSnapshot(session.lastSnapshot),
          stepsExecuted: 0,
          hitBreakpoint: false,
        });
        this.emit("error", pvmId, error);
      }
    }

    return { results };
  }

  private stepWithTimeout(session: Session, n: number): Promise<PvmStepReport> {
    return new Promise<PvmStepReport>((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new StepTimeoutError()),
        this.stepTimeoutMs,
      );
      this.stepSinglePvm(session, n)
        .then((report) => {
          clearTimeout(timer);
          resolve(report);
        })
        .catch((err) => {
          clearTimeout(timer);
          reject(err);
        });
    });
  }

  private async stepSinglePvm(
    session: Session,
    n: number,
  ): Promise<PvmStepReport> {
    const pvmId = session.adapter.pvmId;
    const hasBreakpoints = this.breakpoints.size > 0;

    let stepsExecuted = 0;
    let hitBreakpoint = false;
    let lastResult: AdapterStepResult | undefined;

    if (hasBreakpoints) {
      // Step one instruction at a time to check breakpoints
      for (let i = 0; i < n; i++) {
        lastResult = await session.adapter.step(1);
        stepsExecuted++;

        if (lastResult.status !== "ok") break;

        if (this.breakpoints.has(lastResult.pc)) {
          hitBreakpoint = true;
          break;
        }
      }
    } else {
      lastResult = await session.adapter.step(n);
      stepsExecuted = n;
    }

    // Refresh snapshot from the adapter
    const snapshot = await session.adapter.getState();
    session.lastSnapshot = cloneSnapshot(snapshot);

    // Determine lifecycle transition based on step result status
    return this.processStepOutcome(
      session,
      pvmId,
      lastResult as AdapterStepResult,
      snapshot,
      stepsExecuted,
      hitBreakpoint,
    );
  }

  private processStepOutcome(
    session: Session,
    pvmId: string,
    result: AdapterStepResult,
    snapshot: MachineStateSnapshot,
    stepsExecuted: number,
    hitBreakpoint: boolean,
  ): PvmStepReport {
    // Host call → paused_host_call
    if (result.status === "host") {
      const hcResult = buildHostCallInfo(
        pvmId,
        result.exitArg ?? 0,
        snapshot,
        session.referenceTrace,
        session.hostCallCounter,
      );
      session.hostCallCounter = hcResult.newHostCallCounter;
      session.pendingHostCall = hcResult.info;
      session.lifecycle = "paused_host_call";

      this.emit(
        "pvmStateChanged",
        pvmId,
        cloneSnapshot(snapshot),
        "paused_host_call",
      );
      this.emit("hostCallPaused", pvmId, cloneHostCallInfo(hcResult.info));

      return {
        pvmId,
        lifecycle: "paused_host_call",
        snapshot: cloneSnapshot(snapshot),
        stepsExecuted,
        hitBreakpoint: false,
        hostCall: cloneHostCallInfo(hcResult.info),
      };
    }

    // Terminal statuses → terminated
    if (isTerminalStatus(result.status)) {
      session.lifecycle = "terminated";
      appendTermination(session, result.status, snapshot, result.exitArg);

      this.emit(
        "pvmStateChanged",
        pvmId,
        cloneSnapshot(snapshot),
        "terminated",
      );
      this.emit("terminated", pvmId, result.status);

      return {
        pvmId,
        lifecycle: "terminated",
        snapshot: cloneSnapshot(snapshot),
        stepsExecuted,
        hitBreakpoint: false,
      };
    }

    // Normal completion or breakpoint hit
    session.lifecycle = "paused";
    this.emit("pvmStateChanged", pvmId, cloneSnapshot(snapshot), "paused");

    return {
      pvmId,
      lifecycle: "paused",
      snapshot: cloneSnapshot(snapshot),
      stepsExecuted,
      hitBreakpoint,
    };
  }

  // -----------------------------------------------------------------------
  // Breakpoints
  // -----------------------------------------------------------------------

  setBreakpoints(addresses: number[]): void {
    this.breakpoints = new Set(addresses);
  }

  getBreakpoints(): number[] {
    return [...this.breakpoints];
  }

  // -----------------------------------------------------------------------
  // Host call resume
  // -----------------------------------------------------------------------

  async resumeHostCall(
    pvmId: string,
    effects: HostCallResumeEffects,
  ): Promise<void> {
    const session = this.requireSession(pvmId);
    if (session.lifecycle !== "paused_host_call") {
      throw new Error(
        `Cannot resume host call: PVM ${pvmId} is not in paused_host_call state (current: ${session.lifecycle})`,
      );
    }

    // For log host calls (index 100), capture memory reads from the PVM
    // before applying effects. This provides memoryReads for the recorded
    // trace entry when no reference trace is available.
    const pendingHc = session.pendingHostCall as NonNullable<
      typeof session.pendingHostCall
    >;
    let capturedMemoryReads:
      | Array<{ address: number; length: number; dataHex: string }>
      | undefined;
    if (pendingHc.hostCallIndex === 100) {
      capturedMemoryReads = await this.captureLogMemoryReads(
        session,
        pendingHc.currentState.registers,
      );
    }

    // Apply effects through the adapter
    if (effects.registerWrites && effects.registerWrites.size > 0) {
      await session.adapter.setRegisters(effects.registerWrites);
    }
    if (effects.memoryWrites) {
      for (const mw of effects.memoryWrites) {
        await session.adapter.setMemory(mw.address, new Uint8Array(mw.data));
      }
    }
    if (effects.gasAfter !== undefined) {
      await session.adapter.setGas(effects.gasAfter);
    }

    // Refresh snapshot after applying effects
    const snapshot = await session.adapter.getState();
    session.lastSnapshot = cloneSnapshot(snapshot);

    // Record the trace entry using actual applied effects, not the proposal
    appendHostCallEntry(session, effects, pendingHc, capturedMemoryReads);

    // Clear pending host call and transition back to paused
    session.pendingHostCall = null;
    session.lifecycle = "paused";
    this.emit("pvmStateChanged", pvmId, cloneSnapshot(snapshot), "paused");
  }

  /**
   * Capture memory reads for log host calls (index 100) from the live PVM.
   * Log registers: φ8=target_ptr, φ9=target_len, φ10=msg_ptr, φ11=msg_len.
   */
  private async captureLogMemoryReads(
    session: Session,
    registers: bigint[],
  ): Promise<Array<{ address: number; length: number; dataHex: string }>> {
    const reads: Array<{ address: number; length: number; dataHex: string }> =
      [];
    const segments = [
      { ptr: Number(registers[8] ?? 0n), len: Number(registers[9] ?? 0n) }, // target
      { ptr: Number(registers[10] ?? 0n), len: Number(registers[11] ?? 0n) }, // message
    ];
    for (const { ptr, len } of segments) {
      if (len <= 0) continue;
      try {
        const data = await session.adapter.getMemory(ptr, len);
        const hex = Array.from(new Uint8Array(data), (b) =>
          b.toString(16).padStart(2, "0"),
        ).join("");
        reads.push({ address: ptr, length: len, dataHex: hex });
      } catch (err) {
        console.warn(
          `Failed to capture log memory at 0x${ptr.toString(16)} len=${len}:`,
          err,
        );
      }
    }
    return reads;
  }

  // -----------------------------------------------------------------------
  // Trace access
  // -----------------------------------------------------------------------

  setTrace(pvmId: string, trace: EcalliTrace): void {
    const session = this.requireSession(pvmId);
    session.referenceTrace = cloneTrace(trace);
  }

  getRecordedTrace(pvmId: string): EcalliTrace {
    const session = this.requireSession(pvmId);
    return cloneTrace(session.recordedTrace);
  }

  getReferenceTrace(pvmId: string): EcalliTrace | undefined {
    const session = this.requireSession(pvmId);
    return session.referenceTrace
      ? cloneTrace(session.referenceTrace)
      : undefined;
  }

  // -----------------------------------------------------------------------
  // State access
  // -----------------------------------------------------------------------

  getSnapshots(): Map<
    string,
    { snapshot: MachineStateSnapshot; lifecycle: PvmLifecycle }
  > {
    const result = new Map<
      string,
      { snapshot: MachineStateSnapshot; lifecycle: PvmLifecycle }
    >();
    for (const [pvmId, session] of this.sessions) {
      result.set(pvmId, {
        snapshot: cloneSnapshot(session.lastSnapshot),
        lifecycle: session.lifecycle,
      });
    }
    return result;
  }

  getSnapshot(
    pvmId: string,
  ): { snapshot: MachineStateSnapshot; lifecycle: PvmLifecycle } | undefined {
    const session = this.sessions.get(pvmId);
    if (!session) return undefined;
    return {
      snapshot: cloneSnapshot(session.lastSnapshot),
      lifecycle: session.lifecycle,
    };
  }

  getPendingHostCall(pvmId: string): HostCallInfo | null {
    const session = this.requireSession(pvmId);
    return session.pendingHostCall
      ? cloneHostCallInfo(session.pendingHostCall)
      : null;
  }

  // -----------------------------------------------------------------------
  // UI queries
  // -----------------------------------------------------------------------

  getPvmIds(): string[] {
    return [...this.sessions.keys()];
  }

  getProgramBytes(): Uint8Array | undefined {
    return this.programBytes ? new Uint8Array(this.programBytes) : undefined;
  }

  getPageMap(): PageMapEntry[] {
    return clonePageMap(this.pageMap);
  }

  // -----------------------------------------------------------------------
  // State editing
  // -----------------------------------------------------------------------

  async setRegisters(pvmId: string, regs: Map<number, bigint>): Promise<void> {
    const session = this.requireSession(pvmId);
    this.assertPaused(session, pvmId, "setRegisters");
    await session.adapter.setRegisters(regs);
    const snapshot = await session.adapter.getState();
    session.lastSnapshot = cloneSnapshot(snapshot);
    this.emit(
      "pvmStateChanged",
      pvmId,
      cloneSnapshot(snapshot),
      session.lifecycle,
    );
  }

  async setPc(pvmId: string, pc: number): Promise<void> {
    const session = this.requireSession(pvmId);
    this.assertPaused(session, pvmId, "setPc");
    await session.adapter.setPc(pc);
    const snapshot = await session.adapter.getState();
    session.lastSnapshot = cloneSnapshot(snapshot);
    this.emit(
      "pvmStateChanged",
      pvmId,
      cloneSnapshot(snapshot),
      session.lifecycle,
    );
  }

  async setGas(pvmId: string, gas: bigint): Promise<void> {
    const session = this.requireSession(pvmId);
    this.assertPaused(session, pvmId, "setGas");
    await session.adapter.setGas(gas);
    const snapshot = await session.adapter.getState();
    session.lastSnapshot = cloneSnapshot(snapshot);
    this.emit(
      "pvmStateChanged",
      pvmId,
      cloneSnapshot(snapshot),
      session.lifecycle,
    );
  }

  async getMemory(
    pvmId: string,
    address: number,
    length: number,
  ): Promise<Uint8Array> {
    const session = this.requireSession(pvmId);
    const data = await session.adapter.getMemory(address, length);
    return new Uint8Array(data);
  }

  async setMemory(
    pvmId: string,
    address: number,
    data: Uint8Array,
  ): Promise<void> {
    const session = this.requireSession(pvmId);
    this.assertPaused(session, pvmId, "setMemory");
    await session.adapter.setMemory(address, new Uint8Array(data));
    const snapshot = await session.adapter.getState();
    session.lastSnapshot = cloneSnapshot(snapshot);
    this.emit(
      "pvmStateChanged",
      pvmId,
      cloneSnapshot(snapshot),
      session.lifecycle,
    );
  }

  // -----------------------------------------------------------------------
  // Internal helpers
  // -----------------------------------------------------------------------

  private requireSession(pvmId: string): Session {
    const session = this.sessions.get(pvmId);
    if (!session) throw new Error(`Unknown PVM: ${pvmId}`);
    return session;
  }

  private assertPaused(
    session: Session,
    pvmId: string,
    operation: string,
  ): void {
    if (
      session.lifecycle !== "paused" &&
      session.lifecycle !== "paused_host_call"
    ) {
      throw new Error(
        `${operation} is only allowed while paused (PVM ${pvmId} is ${session.lifecycle})`,
      );
    }
  }
}

function isTerminalStatus(status: PvmStatus): boolean {
  return (
    status === "halt" ||
    status === "panic" ||
    status === "fault" ||
    status === "out_of_gas"
  );
}
