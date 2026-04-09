import { parseTrace } from "@pvmdbg/trace";
import type {
  AdapterStepResult,
  EcalliTrace,
  InitialMachineState,
  MachineStateSnapshot,
  ProgramEnvelope,
  PvmAdapter,
  PvmLifecycle,
} from "@pvmdbg/types";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildHostCallInfo,
  serializeRecordedTrace,
} from "./host-call-handler.js";
import { Orchestrator } from "./orchestrator.js";
import { TypedEventEmitter } from "./typed-event-emitter.js";

// ---------------------------------------------------------------------------
// Mock PvmAdapter — controllable behavior for orchestrator tests
// ---------------------------------------------------------------------------

function defaultSnapshot(
  overrides?: Partial<MachineStateSnapshot>,
): MachineStateSnapshot {
  return {
    pc: 0,
    gas: 1_000_000n,
    status: "ok",
    registers: Array(13).fill(0n) as bigint[],
    ...overrides,
  };
}

class MockAdapter implements PvmAdapter {
  readonly pvmId: string;
  readonly pvmName: string;

  private _state: MachineStateSnapshot;
  private _stepBehavior: (n: number) => AdapterStepResult;
  private _memory = new Map<string, Uint8Array>();
  loadCalled = false;
  resetCalled = false;
  shutdownCalled = false;
  stepCount = 0;
  private _stepSequence: AdapterStepResult[] | null = null;
  private _stepIndex = 0;

  constructor(
    id: string,
    name: string,
    opts?: {
      stepBehavior?: (n: number) => AdapterStepResult;
      initialSnapshot?: Partial<MachineStateSnapshot>;
    },
  ) {
    this.pvmId = id;
    this.pvmName = name;
    this._state = defaultSnapshot(opts?.initialSnapshot);
    this._stepBehavior =
      opts?.stepBehavior ??
      (() => ({
        status: "ok" as const,
        pc: this._state.pc,
        gas: this._state.gas,
      }));
  }

  /** Configure a sequence of step results (one per step(1) call). */
  setStepSequence(results: AdapterStepResult[]): void {
    this._stepSequence = results;
    this._stepIndex = 0;
  }

  setStepBehavior(fn: (n: number) => AdapterStepResult): void {
    this._stepBehavior = fn;
    this._stepSequence = null;
  }

  setSnapshot(s: Partial<MachineStateSnapshot>): void {
    this._state = { ...this._state, ...s };
  }

  async load(
    _program: Uint8Array,
    _initialState: InitialMachineState,
  ): Promise<void> {
    this.loadCalled = true;
    this._stepIndex = 0;
  }

  async reset(): Promise<void> {
    this.resetCalled = true;
    this._stepIndex = 0;
  }

  async step(n: number): Promise<AdapterStepResult> {
    this.stepCount += n;
    if (this._stepSequence) {
      const result = this._stepSequence[this._stepIndex] ?? {
        status: "ok" as const,
        pc: 0,
        gas: 0n,
      };
      this._stepIndex++;
      // Update internal state to match step result
      this._state = {
        ...this._state,
        pc: result.pc,
        gas: result.gas,
        status: result.status,
      };
      return result;
    }
    const result = this._stepBehavior(n);
    this._state = {
      ...this._state,
      pc: result.pc,
      gas: result.gas,
      status: result.status,
    };
    return result;
  }

  async getState(): Promise<MachineStateSnapshot> {
    return { ...this._state, registers: [...this._state.registers] };
  }

  async getMemory(address: number, length: number): Promise<Uint8Array> {
    const key = `${address}:${length}`;
    return this._memory.get(key) ?? new Uint8Array(length);
  }

  async setRegisters(regs: Map<number, bigint>): Promise<void> {
    for (const [idx, val] of regs) {
      this._state.registers[idx] = val;
    }
  }

  async setPc(pc: number): Promise<void> {
    this._state.pc = pc;
  }

  async setGas(gas: bigint): Promise<void> {
    this._state.gas = gas;
  }

  async setMemory(address: number, data: Uint8Array): Promise<void> {
    this._memory.set(`${address}:${data.length}`, new Uint8Array(data));
  }

  async shutdown(): Promise<void> {
    this.shutdownCalled = true;
  }
}

function makeEnvelope(overrides?: Partial<ProgramEnvelope>): ProgramEnvelope {
  return {
    programKind: "generic",
    programBytes: new Uint8Array([0x00, 0x01, 0x02]),
    initialState: {
      pc: 0,
      gas: 1_000_000n,
      registers: Array(13).fill(0n) as bigint[],
      pageMap: [],
      memoryChunks: [],
    },
    sourceMeta: { sourceKind: "manual_input", sourceId: "test" },
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// TypedEventEmitter tests
// ---------------------------------------------------------------------------

describe("TypedEventEmitter", () => {
  interface TestEvents {
    message: (text: string) => void;
    count: (n: number) => void;
  }

  class TestEmitter extends TypedEventEmitter<TestEvents> {
    public testEmit<K extends keyof TestEvents>(
      event: K,
      ...args: Parameters<TestEvents[K]>
    ): void {
      this.emit(event, ...args);
    }
  }

  it("calls registered listeners on emit", () => {
    const emitter = new TestEmitter();
    const received: string[] = [];
    emitter.on("message", (text) => received.push(text));
    emitter.testEmit("message", "hello");
    emitter.testEmit("message", "world");
    expect(received).toEqual(["hello", "world"]);
  });

  it("supports multiple listeners per event", () => {
    const emitter = new TestEmitter();
    const a: number[] = [];
    const b: number[] = [];
    emitter.on("count", (n) => a.push(n));
    emitter.on("count", (n) => b.push(n * 2));
    emitter.testEmit("count", 5);
    expect(a).toEqual([5]);
    expect(b).toEqual([10]);
  });

  it("removes listeners with off()", () => {
    const emitter = new TestEmitter();
    const received: string[] = [];
    const listener = (text: string) => received.push(text);
    emitter.on("message", listener);
    emitter.testEmit("message", "before");
    emitter.off("message", listener);
    emitter.testEmit("message", "after");
    expect(received).toEqual(["before"]);
  });

  it("removeAllListeners clears everything", () => {
    const emitter = new TestEmitter();
    const received: string[] = [];
    emitter.on("message", (text) => received.push(text));
    emitter.removeAllListeners();
    emitter.testEmit("message", "gone");
    expect(received).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Orchestrator tests
// ---------------------------------------------------------------------------

describe("Orchestrator", () => {
  let orchestrator: Orchestrator;

  beforeEach(() => {
    orchestrator = new Orchestrator({ stepTimeoutMs: 500 });
  });

  // -----------------------------------------------------------------------
  // PVM registration
  // -----------------------------------------------------------------------

  describe("PVM registration", () => {
    it("addPvm and getPvmIds track registered PVMs", () => {
      const a = new MockAdapter("pvm-a", "A");
      const b = new MockAdapter("pvm-b", "B");
      orchestrator.addPvm(a);
      orchestrator.addPvm(b);
      expect(orchestrator.getPvmIds()).toEqual(["pvm-a", "pvm-b"]);
    });

    it("removePvm removes the PVM", () => {
      orchestrator.addPvm(new MockAdapter("pvm-a", "A"));
      orchestrator.removePvm("pvm-a");
      expect(orchestrator.getPvmIds()).toEqual([]);
    });

    it("shutdown calls adapter.shutdown for all PVMs", async () => {
      const a = new MockAdapter("pvm-a", "A");
      const b = new MockAdapter("pvm-b", "B");
      orchestrator.addPvm(a);
      orchestrator.addPvm(b);
      await orchestrator.shutdown();
      expect(a.shutdownCalled).toBe(true);
      expect(b.shutdownCalled).toBe(true);
      expect(orchestrator.getPvmIds()).toEqual([]);
    });
  });

  // -----------------------------------------------------------------------
  // loadProgram and reset
  // -----------------------------------------------------------------------

  describe("loadProgram", () => {
    it("loads the program into all PVMs and emits pvmStateChanged", async () => {
      const a = new MockAdapter("pvm-a", "A");
      const b = new MockAdapter("pvm-b", "B");
      orchestrator.addPvm(a);
      orchestrator.addPvm(b);

      const events: Array<[string, PvmLifecycle]> = [];
      orchestrator.on("pvmStateChanged", (pvmId, _snap, lifecycle) => {
        events.push([pvmId, lifecycle]);
      });

      await orchestrator.loadProgram(makeEnvelope());

      expect(a.loadCalled).toBe(true);
      expect(b.loadCalled).toBe(true);

      // Both should have emitted pvmStateChanged("paused")
      expect(events).toContainEqual(["pvm-a", "paused"]);
      expect(events).toContainEqual(["pvm-b", "paused"]);
    });

    it("deep-clones the envelope (mutations don't leak)", async () => {
      const adapter = new MockAdapter("pvm-a", "A");
      orchestrator.addPvm(adapter);

      const envelope = makeEnvelope();
      const originalBytes = new Uint8Array(envelope.programBytes);
      await orchestrator.loadProgram(envelope);

      // Mutate the original envelope
      envelope.programBytes[0] = 0xff;

      // Orchestrator's stored copy should be unchanged
      const storedBytes = orchestrator.getProgramBytes()!;
      expect(storedBytes[0]).toBe(originalBytes[0]);
    });

    it("stores pageMap accessible via getPageMap", async () => {
      const adapter = new MockAdapter("pvm-a", "A");
      orchestrator.addPvm(adapter);

      const envelope = makeEnvelope({
        initialState: {
          pc: 0,
          gas: 1_000_000n,
          registers: Array(13).fill(0n) as bigint[],
          pageMap: [{ address: 0x10000, length: 4096, isWritable: true }],
          memoryChunks: [],
        },
      });
      await orchestrator.loadProgram(envelope);

      const pm = orchestrator.getPageMap();
      expect(pm).toEqual([
        { address: 0x10000, length: 4096, isWritable: true },
      ]);
    });
  });

  describe("reset", () => {
    it("resets all PVMs and emits pvmStateChanged before resolving", async () => {
      const a = new MockAdapter("pvm-a", "A");
      orchestrator.addPvm(a);
      await orchestrator.loadProgram(makeEnvelope());

      const events: PvmLifecycle[] = [];
      orchestrator.on("pvmStateChanged", (_id, _snap, lifecycle) => {
        events.push(lifecycle);
      });

      await orchestrator.reset();
      expect(a.resetCalled).toBe(true);
      expect(events).toContain("paused");
    });

    it("rebuilds recorded trace prelude from loaded envelope", async () => {
      const adapter = new MockAdapter("pvm-a", "A");
      orchestrator.addPvm(adapter);
      await orchestrator.loadProgram(makeEnvelope());

      // Step to change state, then reset
      await orchestrator.step(1);
      await orchestrator.reset();

      const trace = orchestrator.getRecordedTrace("pvm-a");
      expect(trace.entries).toEqual([]);
      expect(trace.prelude.programHex).toBe("000102");
    });
  });

  // -----------------------------------------------------------------------
  // Concurrent step (2 PVMs)
  // -----------------------------------------------------------------------

  describe("step — concurrent execution", () => {
    it("steps 2 PVMs concurrently and returns results for both", async () => {
      const a = new MockAdapter("pvm-a", "A", {
        stepBehavior: () => ({ status: "ok", pc: 10, gas: 999_990n }),
      });
      const b = new MockAdapter("pvm-b", "B", {
        stepBehavior: () => ({ status: "ok", pc: 20, gas: 999_980n }),
      });
      orchestrator.addPvm(a);
      orchestrator.addPvm(b);
      await orchestrator.loadProgram(makeEnvelope());

      const result = await orchestrator.step(5);

      expect(result.results.size).toBe(2);
      expect(result.results.get("pvm-a")?.lifecycle).toBe("paused");
      expect(result.results.get("pvm-a")?.snapshot.pc).toBe(10);
      expect(result.results.get("pvm-b")?.lifecycle).toBe("paused");
      expect(result.results.get("pvm-b")?.snapshot.pc).toBe(20);
    });

    it("skips non-paused PVMs but still includes them in StepResult", async () => {
      const a = new MockAdapter("pvm-a", "A", {
        stepBehavior: () => ({ status: "halt", pc: 5, gas: 0n }),
      });
      const b = new MockAdapter("pvm-b", "B", {
        stepBehavior: () => ({ status: "ok", pc: 10, gas: 999_990n }),
      });
      orchestrator.addPvm(a);
      orchestrator.addPvm(b);
      await orchestrator.loadProgram(makeEnvelope());

      // First step terminates PVM A
      await orchestrator.step(1);

      // Second step — A is terminated (skipped), B still runs
      const result = await orchestrator.step(1);
      expect(result.results.size).toBe(2);
      expect(result.results.get("pvm-a")?.lifecycle).toBe("terminated");
      expect(result.results.get("pvm-a")?.stepsExecuted).toBe(0);
      expect(result.results.get("pvm-b")?.lifecycle).toBe("paused");
    });
  });

  // -----------------------------------------------------------------------
  // Breakpoint stop at exact PC
  // -----------------------------------------------------------------------

  describe("step — breakpoints", () => {
    it("stops exactly when PC matches a breakpoint", async () => {
      const adapter = new MockAdapter("pvm-a", "A");
      // Step sequence: PC goes 1, 2, 3, 4, 5
      adapter.setStepSequence([
        { status: "ok", pc: 1, gas: 999n },
        { status: "ok", pc: 2, gas: 998n },
        { status: "ok", pc: 3, gas: 997n },
        { status: "ok", pc: 4, gas: 996n },
        { status: "ok", pc: 5, gas: 995n },
      ]);

      orchestrator.addPvm(adapter);
      await orchestrator.loadProgram(makeEnvelope());

      orchestrator.setBreakpoints([3]);
      const result = await orchestrator.step(10);

      const report = result.results.get("pvm-a")!;
      expect(report.hitBreakpoint).toBe(true);
      expect(report.snapshot.pc).toBe(3);
      expect(report.stepsExecuted).toBe(3);
      expect(report.lifecycle).toBe("paused");
    });

    it("emits pvmStateChanged('paused') on breakpoint hit", async () => {
      const adapter = new MockAdapter("pvm-a", "A");
      adapter.setStepSequence([{ status: "ok", pc: 5, gas: 999n }]);

      orchestrator.addPvm(adapter);
      await orchestrator.loadProgram(makeEnvelope());

      const events: PvmLifecycle[] = [];
      orchestrator.on("pvmStateChanged", (_id, _snap, lc) => events.push(lc));

      orchestrator.setBreakpoints([5]);
      await orchestrator.step(1);

      expect(events).toContain("paused");
    });

    it("getBreakpoints returns current breakpoints", () => {
      orchestrator.setBreakpoints([10, 20, 30]);
      expect(orchestrator.getBreakpoints().sort()).toEqual([10, 20, 30]);
    });
  });

  // -----------------------------------------------------------------------
  // Terminal statuses
  // -----------------------------------------------------------------------

  describe("step — terminal statuses", () => {
    for (const status of ["halt", "panic", "fault", "out_of_gas"] as const) {
      it(`transitions to terminated on ${status}`, async () => {
        const adapter = new MockAdapter("pvm-a", "A", {
          stepBehavior: () => ({ status, pc: 42, gas: 0n }),
        });
        orchestrator.addPvm(adapter);
        await orchestrator.loadProgram(makeEnvelope());

        const terminatedEvents: string[] = [];
        orchestrator.on("terminated", (pvmId) => terminatedEvents.push(pvmId));

        const result = await orchestrator.step(1);

        expect(result.results.get("pvm-a")?.lifecycle).toBe("terminated");
        expect(terminatedEvents).toEqual(["pvm-a"]);
      });
    }

    it("emits pvmStateChanged('terminated') before 'terminated' event", async () => {
      const adapter = new MockAdapter("pvm-a", "A", {
        stepBehavior: () => ({ status: "halt", pc: 0, gas: 0n }),
      });
      orchestrator.addPvm(adapter);
      await orchestrator.loadProgram(makeEnvelope());

      const order: string[] = [];
      orchestrator.on("pvmStateChanged", (_id, _s, lc) => {
        if (lc === "terminated") order.push("pvmStateChanged:terminated");
      });
      orchestrator.on("terminated", () => order.push("terminated"));

      await orchestrator.step(1);

      expect(order).toEqual(["pvmStateChanged:terminated", "terminated"]);
    });

    it("records termination in the trace", async () => {
      const adapter = new MockAdapter("pvm-a", "A", {
        stepBehavior: () => ({ status: "halt", pc: 42, gas: 100n }),
      });
      adapter.setSnapshot({ pc: 42, gas: 100n, status: "halt" });
      orchestrator.addPvm(adapter);
      await orchestrator.loadProgram(makeEnvelope());
      await orchestrator.step(1);

      const trace = orchestrator.getRecordedTrace("pvm-a");
      expect(trace.termination).toBeDefined();
      expect(trace.termination?.kind).toBe("halt");
      expect(trace.termination?.pc).toBe(42);
    });
  });

  // -----------------------------------------------------------------------
  // Host call pause/resume with trace matching
  // -----------------------------------------------------------------------

  describe("host call pause/resume", () => {
    it("transitions to paused_host_call on host status", async () => {
      const adapter = new MockAdapter("pvm-a", "A", {
        stepBehavior: () => ({ status: "host", pc: 10, gas: 900n, exitArg: 0 }),
      });
      orchestrator.addPvm(adapter);
      await orchestrator.loadProgram(makeEnvelope());

      const result = await orchestrator.step(1);

      expect(result.results.get("pvm-a")?.lifecycle).toBe("paused_host_call");
      expect(result.results.get("pvm-a")?.hostCall).toBeDefined();
      expect(result.results.get("pvm-a")?.hostCall?.hostCallName).toBe("gas");
    });

    it("emits pvmStateChanged('paused_host_call') before hostCallPaused", async () => {
      const adapter = new MockAdapter("pvm-a", "A", {
        stepBehavior: () => ({ status: "host", pc: 10, gas: 900n, exitArg: 1 }),
      });
      orchestrator.addPvm(adapter);
      await orchestrator.loadProgram(makeEnvelope());

      const order: string[] = [];
      orchestrator.on("pvmStateChanged", (_id, _s, lc) => {
        if (lc === "paused_host_call") order.push("pvmStateChanged");
      });
      orchestrator.on("hostCallPaused", () => order.push("hostCallPaused"));

      await orchestrator.step(1);
      expect(order).toEqual(["pvmStateChanged", "hostCallPaused"]);
    });

    it("builds proposal from reference trace with correct matching", async () => {
      const adapter = new MockAdapter("pvm-a", "A", {
        stepBehavior: () => ({ status: "host", pc: 10, gas: 900n, exitArg: 0 }),
      });
      adapter.setSnapshot({ pc: 10, gas: 900n });
      orchestrator.addPvm(adapter);

      const referenceTrace: EcalliTrace = {
        prelude: {
          programHex: "000102",
          memoryWrites: [],
          startPc: 0,
          startGas: 1_000_000n,
          startRegisters: new Map(),
        },
        entries: [
          {
            index: 0, // matches exitArg
            pc: 10,
            gas: 900n,
            registers: new Map(),
            memoryReads: [],
            memoryWrites: [{ address: 0x1000, dataHex: "deadbeef" }],
            registerWrites: new Map([[7, 42n]]),
            gasAfter: 800n,
          },
        ],
      };

      await orchestrator.loadProgram(makeEnvelope({ trace: referenceTrace }));
      const result = await orchestrator.step(1);

      const info = result.results.get("pvm-a")!.hostCall;
      expect(info.resumeProposal).toBeDefined();
      expect(info.resumeProposal?.traceMatches).toBe(true);
      expect(info.resumeProposal?.mismatches).toEqual([]);
      expect(info.resumeProposal?.registerWrites.get(7)).toBe(42n);
      expect(info.resumeProposal?.memoryWrites[0].address).toBe(0x1000);
      expect(info.resumeProposal?.gasAfter).toBe(800n);
    });

    it("reports mismatches when trace entry index differs", async () => {
      const adapter = new MockAdapter("pvm-a", "A", {
        stepBehavior: () => ({ status: "host", pc: 10, gas: 900n, exitArg: 1 }),
      });
      adapter.setSnapshot({ pc: 10, gas: 900n });
      orchestrator.addPvm(adapter);

      const referenceTrace: EcalliTrace = {
        prelude: {
          programHex: "000102",
          memoryWrites: [],
          startPc: 0,
          startGas: 1_000_000n,
          startRegisters: new Map(),
        },
        entries: [
          {
            index: 0, // does NOT match exitArg (1)
            pc: 10,
            gas: 900n,
            registers: new Map(),
            memoryReads: [],
            memoryWrites: [],
            registerWrites: new Map(),
          },
        ],
      };

      await orchestrator.loadProgram(makeEnvelope({ trace: referenceTrace }));
      const result = await orchestrator.step(1);

      const proposal = result.results.get("pvm-a")!.hostCall!.resumeProposal;
      expect(proposal.traceMatches).toBe(false);
      expect(proposal.mismatches.some((m) => m.field === "hostCallIndex")).toBe(
        true,
      );
    });

    it("resumeHostCall applies effects and transitions to paused", async () => {
      const adapter = new MockAdapter("pvm-a", "A", {
        stepBehavior: () => ({ status: "host", pc: 10, gas: 900n, exitArg: 0 }),
      });
      orchestrator.addPvm(adapter);
      await orchestrator.loadProgram(makeEnvelope());
      await orchestrator.step(1);

      // Verify PVM is in paused_host_call
      expect(orchestrator.getSnapshot("pvm-a")?.lifecycle).toBe(
        "paused_host_call",
      );

      const events: PvmLifecycle[] = [];
      orchestrator.on("pvmStateChanged", (_id, _s, lc) => events.push(lc));

      await orchestrator.resumeHostCall("pvm-a", {
        registerWrites: new Map([[7, 42n]]),
        gasAfter: 800n,
      });

      expect(orchestrator.getSnapshot("pvm-a")?.lifecycle).toBe("paused");
      expect(events).toContain("paused");
    });

    it("resumeHostCall rejects when not in paused_host_call", async () => {
      const adapter = new MockAdapter("pvm-a", "A");
      orchestrator.addPvm(adapter);
      await orchestrator.loadProgram(makeEnvelope());

      await expect(orchestrator.resumeHostCall("pvm-a", {})).rejects.toThrow(
        "paused_host_call",
      );
    });

    it("resumeHostCall records trace entry using actual applied effects", async () => {
      const adapter = new MockAdapter("pvm-a", "A", {
        stepBehavior: () => ({ status: "host", pc: 10, gas: 900n, exitArg: 0 }),
      });
      adapter.setSnapshot({ pc: 10, gas: 900n });
      orchestrator.addPvm(adapter);
      await orchestrator.loadProgram(makeEnvelope());
      await orchestrator.step(1);

      await orchestrator.resumeHostCall("pvm-a", {
        registerWrites: new Map([[7, 42n]]),
        memoryWrites: [{ address: 0x1000, data: new Uint8Array([0xaa, 0xbb]) }],
        gasAfter: 800n,
      });

      const trace = orchestrator.getRecordedTrace("pvm-a");
      expect(trace.entries).toHaveLength(1);
      expect(trace.entries[0].index).toBe(0);
      expect(trace.entries[0].registerWrites.get(7)).toBe(42n);
      expect(trace.entries[0].memoryWrites[0].dataHex).toBe("aabb");
      expect(trace.entries[0].gasAfter).toBe(800n);
    });

    it("getPendingHostCall returns cloned info while in paused_host_call", async () => {
      const adapter = new MockAdapter("pvm-a", "A", {
        stepBehavior: () => ({ status: "host", pc: 10, gas: 900n, exitArg: 0 }),
      });
      orchestrator.addPvm(adapter);
      await orchestrator.loadProgram(makeEnvelope());
      await orchestrator.step(1);

      const pending = orchestrator.getPendingHostCall("pvm-a");
      expect(pending).not.toBeNull();
      expect(pending?.hostCallIndex).toBe(0);
      expect(pending?.hostCallName).toBe("gas");
    });

    it("host call counter increments for sequential host calls", async () => {
      let callNum = 0;
      const adapter = new MockAdapter("pvm-a", "A");
      orchestrator.addPvm(adapter);

      const referenceTrace: EcalliTrace = {
        prelude: {
          programHex: "000102",
          memoryWrites: [],
          startPc: 0,
          startGas: 1_000_000n,
          startRegisters: new Map(),
        },
        entries: [
          {
            index: 0,
            pc: 10,
            gas: 900n,
            registers: new Map(),
            memoryReads: [],
            memoryWrites: [],
            registerWrites: new Map([[7, 1n]]),
          },
          {
            index: 1,
            pc: 20,
            gas: 800n,
            registers: new Map(),
            memoryReads: [],
            memoryWrites: [],
            registerWrites: new Map([[7, 2n]]),
          },
        ],
      };

      await orchestrator.loadProgram(makeEnvelope({ trace: referenceTrace }));

      // First host call
      adapter.setStepBehavior(() => {
        callNum++;
        return {
          status: "host" as const,
          pc: callNum === 1 ? 10 : 20,
          gas: callNum === 1 ? 900n : 800n,
          exitArg: callNum === 1 ? 0 : 1,
        };
      });
      adapter.setSnapshot({ pc: 10, gas: 900n });

      const r1 = await orchestrator.step(1);
      const info1 = r1.results.get("pvm-a")!.hostCall;
      expect(info1.resumeProposal?.registerWrites.get(7)).toBe(1n);

      await orchestrator.resumeHostCall("pvm-a", {});

      // Second host call
      adapter.setSnapshot({ pc: 20, gas: 800n });
      const r2 = await orchestrator.step(1);
      const info2 = r2.results.get("pvm-a")!.hostCall;
      expect(info2.resumeProposal?.registerWrites.get(7)).toBe(2n);
    });
  });

  // -----------------------------------------------------------------------
  // Breakpoint + terminal interplay
  // -----------------------------------------------------------------------

  describe("step — breakpoints with terminal status", () => {
    it("terminal status during breakpoint stepping transitions correctly", async () => {
      const adapter = new MockAdapter("pvm-a", "A");
      adapter.setStepSequence([
        { status: "ok", pc: 1, gas: 999n },
        { status: "halt", pc: 2, gas: 998n },
      ]);

      orchestrator.addPvm(adapter);
      await orchestrator.loadProgram(makeEnvelope());
      orchestrator.setBreakpoints([5]); // breakpoint that won't be reached

      const result = await orchestrator.step(10);
      const report = result.results.get("pvm-a")!;

      expect(report.lifecycle).toBe("terminated");
      expect(report.hitBreakpoint).toBe(false);
      expect(report.stepsExecuted).toBe(2);
    });

    it("host call during breakpoint stepping pauses correctly", async () => {
      const adapter = new MockAdapter("pvm-a", "A");
      adapter.setStepSequence([
        { status: "ok", pc: 1, gas: 999n },
        { status: "host", pc: 2, gas: 998n, exitArg: 0 },
      ]);

      orchestrator.addPvm(adapter);
      await orchestrator.loadProgram(makeEnvelope());
      orchestrator.setBreakpoints([5]);

      const result = await orchestrator.step(10);
      const report = result.results.get("pvm-a")!;

      expect(report.lifecycle).toBe("paused_host_call");
      expect(report.stepsExecuted).toBe(2);
    });
  });

  // -----------------------------------------------------------------------
  // Error isolation
  // -----------------------------------------------------------------------

  describe("step — error isolation", () => {
    it("one PVM failing does not affect the other", async () => {
      const good = new MockAdapter("good", "Good", {
        stepBehavior: () => ({ status: "ok", pc: 10, gas: 999n }),
      });
      const bad = new MockAdapter("bad", "Bad", {
        stepBehavior: () => {
          throw new Error("adapter crash");
        },
      });

      orchestrator.addPvm(good);
      orchestrator.addPvm(bad);
      await orchestrator.loadProgram(makeEnvelope());

      const errors: Array<[string, string]> = [];
      orchestrator.on("error", (pvmId, err) =>
        errors.push([pvmId, err.message]),
      );

      const result = await orchestrator.step(1);

      expect(result.results.get("good")?.lifecycle).toBe("paused");
      expect(result.results.get("good")?.snapshot.pc).toBe(10);
      expect(result.results.get("bad")?.lifecycle).toBe("failed");
      expect(errors).toEqual([["bad", "adapter crash"]]);
    });

    it("timeout is reported as timed_out lifecycle", async () => {
      const slow = new MockAdapter("slow", "Slow", {
        stepBehavior: () => {
          // Simulate a hanging adapter by never returning
          return new Promise(() => {}) as never;
        },
      });

      // Override step to actually hang
      slow.step = () => new Promise(() => {});

      const fast = new MockAdapter("fast", "Fast", {
        stepBehavior: () => ({ status: "ok", pc: 5, gas: 999n }),
      });

      orchestrator.addPvm(fast);
      orchestrator.addPvm(slow);
      await orchestrator.loadProgram(makeEnvelope());

      const errors: string[] = [];
      orchestrator.on("error", (pvmId) => errors.push(pvmId));

      const result = await orchestrator.step(1);

      expect(result.results.get("fast")?.lifecycle).toBe("paused");
      expect(result.results.get("slow")?.lifecycle).toBe("timed_out");
      expect(errors).toContain("slow");
    });
  });

  // -----------------------------------------------------------------------
  // State editing
  // -----------------------------------------------------------------------

  describe("state editing", () => {
    it("setRegisters updates adapter and emits pvmStateChanged", async () => {
      const adapter = new MockAdapter("pvm-a", "A");
      orchestrator.addPvm(adapter);
      await orchestrator.loadProgram(makeEnvelope());

      const events: PvmLifecycle[] = [];
      orchestrator.on("pvmStateChanged", (_id, _s, lc) => events.push(lc));

      await orchestrator.setRegisters("pvm-a", new Map([[0, 42n]]));

      const snap = orchestrator.getSnapshot("pvm-a")!;
      expect(snap.snapshot.registers[0]).toBe(42n);
      expect(events).toContain("paused");
    });

    it("setPc calls adapter.setPc (not just cached snapshot)", async () => {
      const adapter = new MockAdapter("pvm-a", "A");
      const setPcSpy = vi.spyOn(adapter, "setPc");
      orchestrator.addPvm(adapter);
      await orchestrator.loadProgram(makeEnvelope());

      await orchestrator.setPc("pvm-a", 100);

      expect(setPcSpy).toHaveBeenCalledWith(100);
      expect(orchestrator.getSnapshot("pvm-a")?.snapshot.pc).toBe(100);
    });

    it("setGas updates adapter and refreshes snapshot", async () => {
      const adapter = new MockAdapter("pvm-a", "A");
      orchestrator.addPvm(adapter);
      await orchestrator.loadProgram(makeEnvelope());

      await orchestrator.setGas("pvm-a", 500n);

      expect(orchestrator.getSnapshot("pvm-a")?.snapshot.gas).toBe(500n);
    });

    it("setMemory delegates to adapter and emits event", async () => {
      const adapter = new MockAdapter("pvm-a", "A");
      const setMemSpy = vi.spyOn(adapter, "setMemory");
      orchestrator.addPvm(adapter);
      await orchestrator.loadProgram(makeEnvelope());

      const data = new Uint8Array([0xaa, 0xbb]);
      await orchestrator.setMemory("pvm-a", 0x1000, data);

      expect(setMemSpy).toHaveBeenCalled();
    });

    it("getMemory returns data from adapter", async () => {
      const adapter = new MockAdapter("pvm-a", "A");
      orchestrator.addPvm(adapter);
      await orchestrator.loadProgram(makeEnvelope());

      const data = await orchestrator.getMemory("pvm-a", 0, 4);
      expect(data).toBeInstanceOf(Uint8Array);
      expect(data.length).toBe(4);
    });

    it("editing rejects when not paused", async () => {
      const adapter = new MockAdapter("pvm-a", "A", {
        stepBehavior: () => ({ status: "halt", pc: 0, gas: 0n }),
      });
      orchestrator.addPvm(adapter);
      await orchestrator.loadProgram(makeEnvelope());
      await orchestrator.step(1);

      await expect(
        orchestrator.setRegisters("pvm-a", new Map([[0, 1n]])),
      ).rejects.toThrow("only allowed while paused");
      await expect(orchestrator.setPc("pvm-a", 0)).rejects.toThrow(
        "only allowed while paused",
      );
      await expect(orchestrator.setGas("pvm-a", 0n)).rejects.toThrow(
        "only allowed while paused",
      );
      await expect(
        orchestrator.setMemory("pvm-a", 0, new Uint8Array(1)),
      ).rejects.toThrow("only allowed while paused");
    });
  });

  // -----------------------------------------------------------------------
  // Trace recording roundtrip
  // -----------------------------------------------------------------------

  describe("trace recording roundtrip", () => {
    it("recorded trace with host call entry serializes to valid ECALLI text", async () => {
      const adapter = new MockAdapter("pvm-a", "A", {
        stepBehavior: () => ({ status: "host", pc: 10, gas: 900n, exitArg: 0 }),
      });
      adapter.setSnapshot({ pc: 10, gas: 900n });
      orchestrator.addPvm(adapter);
      await orchestrator.loadProgram(makeEnvelope());
      await orchestrator.step(1);

      // Resume with effects
      await orchestrator.resumeHostCall("pvm-a", {
        registerWrites: new Map([[7, 42n]]),
        gasAfter: 800n,
      });

      // Step to termination
      adapter.setStepBehavior(() => ({ status: "halt", pc: 20, gas: 700n }));
      adapter.setSnapshot({ pc: 20, gas: 700n, status: "halt" });
      await orchestrator.step(1);

      const trace = orchestrator.getRecordedTrace("pvm-a");
      const text = serializeRecordedTrace(trace);

      // Should contain key sections
      expect(text).toContain("program 0x000102");
      expect(text).toContain("ecalli=0");
      expect(text).toContain("setreg r07 <- 0x2a");
      expect(text).toContain("setgas <- 800");
      expect(text).toContain("HALT");

      // Roundtrip: parse → serialize should produce same text
      const reparsed = parseTrace(text);
      const reserialized = serializeRecordedTrace(reparsed);
      expect(reserialized).toBe(text);
    });

    it("recorded trace without host calls serializes correctly", async () => {
      const adapter = new MockAdapter("pvm-a", "A", {
        stepBehavior: () => ({ status: "halt", pc: 0, gas: 0n }),
      });
      adapter.setSnapshot({ status: "halt", pc: 0, gas: 0n });
      orchestrator.addPvm(adapter);
      await orchestrator.loadProgram(makeEnvelope());
      await orchestrator.step(1);

      const trace = orchestrator.getRecordedTrace("pvm-a");
      const text = serializeRecordedTrace(trace);

      expect(text).toContain("program 0x000102");
      expect(text).toContain("HALT");
      expect(trace.entries).toHaveLength(0);
    });
  });

  // -----------------------------------------------------------------------
  // Trace access
  // -----------------------------------------------------------------------

  describe("trace access", () => {
    it("setTrace / getReferenceTrace roundtrip", async () => {
      const adapter = new MockAdapter("pvm-a", "A");
      orchestrator.addPvm(adapter);

      const trace: EcalliTrace = {
        prelude: {
          programHex: "aabb",
          memoryWrites: [],
          startPc: 0,
          startGas: 100n,
          startRegisters: new Map(),
        },
        entries: [],
      };

      orchestrator.setTrace("pvm-a", trace);
      const retrieved = orchestrator.getReferenceTrace("pvm-a");
      expect(retrieved).toBeDefined();
      expect(retrieved?.prelude.programHex).toBe("aabb");

      // Mutation of original should not affect stored copy
      trace.prelude.programHex = "ccdd";
      expect(orchestrator.getReferenceTrace("pvm-a")?.prelude.programHex).toBe(
        "aabb",
      );
    });

    it("getReferenceTrace returns undefined when no trace is set", () => {
      const adapter = new MockAdapter("pvm-a", "A");
      orchestrator.addPvm(adapter);
      expect(orchestrator.getReferenceTrace("pvm-a")).toBeUndefined();
    });
  });

  // -----------------------------------------------------------------------
  // State access
  // -----------------------------------------------------------------------

  describe("state access", () => {
    it("getSnapshots returns all PVM states", async () => {
      const a = new MockAdapter("pvm-a", "A");
      const b = new MockAdapter("pvm-b", "B");
      orchestrator.addPvm(a);
      orchestrator.addPvm(b);
      await orchestrator.loadProgram(makeEnvelope());

      const snapshots = orchestrator.getSnapshots();
      expect(snapshots.size).toBe(2);
      expect(snapshots.get("pvm-a")?.lifecycle).toBe("paused");
      expect(snapshots.get("pvm-b")?.lifecycle).toBe("paused");
    });

    it("getSnapshot returns undefined for unknown PVM", () => {
      expect(orchestrator.getSnapshot("unknown")).toBeUndefined();
    });

    it("getProgramBytes returns undefined before load", () => {
      expect(orchestrator.getProgramBytes()).toBeUndefined();
    });

    it("requireSession throws for unknown pvmId", () => {
      expect(() => orchestrator.getRecordedTrace("ghost")).toThrow(
        "Unknown PVM",
      );
      expect(() => orchestrator.getPendingHostCall("ghost")).toThrow(
        "Unknown PVM",
      );
    });
  });

  // -----------------------------------------------------------------------
  // loadContext forwarding
  // -----------------------------------------------------------------------

  describe("loadProgram — loadContext forwarding", () => {
    it("forwards loadContext to adapter.load()", async () => {
      const adapter = new MockAdapter("pvm-a", "A");
      let receivedContext: unknown;
      adapter.load = async (_prog, _state, ctx) => {
        receivedContext = ctx;
      };
      orchestrator.addPvm(adapter);

      const envelope = makeEnvelope({
        loadContext: {
          spiProgram: {
            program: new Uint8Array([0x01, 0x02]),
            hasMetadata: false,
          },
          spiArgs: new Uint8Array([0x03]),
        },
      });
      await orchestrator.loadProgram(envelope);

      expect(receivedContext).toBeDefined();
      const ctx = receivedContext as {
        spiProgram: { program: Uint8Array };
        spiArgs: Uint8Array;
      };
      expect(ctx.spiProgram.program).toEqual(new Uint8Array([0x01, 0x02]));
      expect(ctx.spiArgs).toEqual(new Uint8Array([0x03]));

      // Verify deep clone — mutating original should not affect forwarded copy
      envelope.loadContext!.spiProgram!.program[0] = 0xff;
      expect(ctx.spiProgram.program[0]).toBe(0x01);
    });
  });

  // -----------------------------------------------------------------------
  // Host call edge cases
  // -----------------------------------------------------------------------

  describe("host call — edge cases", () => {
    it("host call beyond trace entries yields no proposal", async () => {
      const adapter = new MockAdapter("pvm-a", "A", {
        stepBehavior: () => ({ status: "host", pc: 10, gas: 900n, exitArg: 0 }),
      });
      adapter.setSnapshot({ pc: 10, gas: 900n });
      orchestrator.addPvm(adapter);

      // Reference trace with 0 entries
      const referenceTrace: EcalliTrace = {
        prelude: {
          programHex: "000102",
          memoryWrites: [],
          startPc: 0,
          startGas: 1_000_000n,
          startRegisters: new Map(),
        },
        entries: [], // empty — no entries at any counter position
      };

      await orchestrator.loadProgram(makeEnvelope({ trace: referenceTrace }));
      const result = await orchestrator.step(1);

      const info = result.results.get("pvm-a")!.hostCall;
      expect(info.resumeProposal).toBeUndefined();
    });

    it("reset clears host call counter for fresh trace matching", async () => {
      const adapter = new MockAdapter("pvm-a", "A");
      orchestrator.addPvm(adapter);

      const referenceTrace: EcalliTrace = {
        prelude: {
          programHex: "000102",
          memoryWrites: [],
          startPc: 0,
          startGas: 1_000_000n,
          startRegisters: new Map(),
        },
        entries: [
          {
            index: 0,
            pc: 10,
            gas: 900n,
            registers: new Map(),
            memoryReads: [],
            memoryWrites: [],
            registerWrites: new Map([[7, 99n]]),
          },
        ],
      };

      await orchestrator.loadProgram(makeEnvelope({ trace: referenceTrace }));

      // Trigger first host call — consumes entry[0]
      adapter.setStepBehavior(() => ({
        status: "host",
        pc: 10,
        gas: 900n,
        exitArg: 0,
      }));
      adapter.setSnapshot({ pc: 10, gas: 900n });
      await orchestrator.step(1);
      await orchestrator.resumeHostCall("pvm-a", {});

      // Reset — should reset counter to 0
      await orchestrator.reset();

      // Trigger host call again — should match entry[0] again
      adapter.setStepBehavior(() => ({
        status: "host",
        pc: 10,
        gas: 900n,
        exitArg: 0,
      }));
      adapter.setSnapshot({ pc: 10, gas: 900n });
      const result = await orchestrator.step(1);

      const info = result.results.get("pvm-a")!.hostCall;
      expect(info.resumeProposal).toBeDefined();
      expect(info.resumeProposal?.registerWrites.get(7)).toBe(99n);
    });

    it("getPendingHostCall returns null when not in host call state", async () => {
      const adapter = new MockAdapter("pvm-a", "A");
      orchestrator.addPvm(adapter);
      await orchestrator.loadProgram(makeEnvelope());

      expect(orchestrator.getPendingHostCall("pvm-a")).toBeNull();
    });
  });

  // -----------------------------------------------------------------------
  // Reload scenario
  // -----------------------------------------------------------------------

  describe("loadProgram — reload", () => {
    it("re-loading resets all session state", async () => {
      const adapter = new MockAdapter("pvm-a", "A", {
        stepBehavior: () => ({ status: "ok", pc: 50, gas: 500n }),
      });
      orchestrator.addPvm(adapter);
      await orchestrator.loadProgram(makeEnvelope());
      await orchestrator.step(1);

      // Re-load with different program
      const newEnvelope = makeEnvelope({
        programBytes: new Uint8Array([0xaa, 0xbb]),
      });
      await orchestrator.loadProgram(newEnvelope);

      expect(orchestrator.getProgramBytes()).toEqual(
        new Uint8Array([0xaa, 0xbb]),
      );
      expect(orchestrator.getSnapshot("pvm-a")?.lifecycle).toBe("paused");

      const trace = orchestrator.getRecordedTrace("pvm-a");
      expect(trace.prelude.programHex).toBe("aabb");
      expect(trace.entries).toEqual([]);
    });
  });
});

// ---------------------------------------------------------------------------
// buildHostCallInfo standalone tests
// ---------------------------------------------------------------------------

describe("buildHostCallInfo", () => {
  it("derives host call name from index", () => {
    const state = defaultSnapshot({ pc: 10, gas: 100n });
    const result = buildHostCallInfo("pvm-a", 100, state, undefined, 0);
    expect(result.info.hostCallName).toBe("log");
  });

  it("returns unknown name for unrecognized index", () => {
    const state = defaultSnapshot();
    const result = buildHostCallInfo("pvm-a", 999, state, undefined, 0);
    expect(result.info.hostCallName).toBe("unknown(999)");
  });

  it("increments hostCallCounter", () => {
    const state = defaultSnapshot();
    const result = buildHostCallInfo("pvm-a", 0, state, undefined, 5);
    expect(result.newHostCallCounter).toBe(6);
  });

  it("returns no proposal when no reference trace", () => {
    const state = defaultSnapshot();
    const result = buildHostCallInfo("pvm-a", 0, state, undefined, 0);
    expect(result.info.resumeProposal).toBeUndefined();
  });

  it("computes mismatches for pc and gas", () => {
    const state = defaultSnapshot({ pc: 20, gas: 500n });
    const trace: EcalliTrace = {
      prelude: {
        programHex: "",
        memoryWrites: [],
        startPc: 0,
        startGas: 0n,
        startRegisters: new Map(),
      },
      entries: [
        {
          index: 0,
          pc: 10,
          gas: 900n,
          registers: new Map(),
          memoryReads: [],
          memoryWrites: [],
          registerWrites: new Map(),
        },
      ],
    };

    const result = buildHostCallInfo("pvm-a", 0, state, trace, 0);
    const mismatches = result.info.resumeProposal?.mismatches;
    expect(mismatches.some((m) => m.field === "pc")).toBe(true);
    expect(mismatches.some((m) => m.field === "gas")).toBe(true);
  });
});
