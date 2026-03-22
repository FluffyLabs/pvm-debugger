import type {
  PvmAdapter,
  PvmLifecycle,
  PvmStatus,
  MachineStateSnapshot,
  ProgramEnvelope,
  EcalliTrace,
  TraceEntry,
  TraceTermination,
  HostCallInfo,
  HostCallResumeEffects,
  PageMapEntry,
} from "@pvmdbg/types";
import { toHex } from "@pvmdbg/types";

/**
 * Per-PVM session — plain data object (not a class).
 * Stores all mutable state associated with one registered PVM.
 */
export interface Session {
  adapter: PvmAdapter;
  lifecycle: PvmLifecycle;
  lastSnapshot: MachineStateSnapshot;
  hostCallCounter: number;
  pendingHostCall: HostCallInfo | null;
  recordedTrace: EcalliTrace;
  referenceTrace?: EcalliTrace;
  loadedEnvelope?: ProgramEnvelope;
}

/** Create a fresh session for a newly-registered adapter. */
export function createSession(adapter: PvmAdapter): Session {
  return {
    adapter,
    lifecycle: "paused",
    lastSnapshot: {
      pc: 0,
      gas: 0n,
      status: "ok",
      registers: Array(13).fill(0n) as bigint[],
    },
    hostCallCounter: 0,
    pendingHostCall: null,
    recordedTrace: emptyTrace(),
  };
}

// ---------------------------------------------------------------------------
// Clone helpers — deep-copy on read/write boundaries
// ---------------------------------------------------------------------------

export function cloneSnapshot(s: MachineStateSnapshot): MachineStateSnapshot {
  return {
    pc: s.pc,
    gas: s.gas,
    status: s.status,
    registers: [...s.registers],
  };
}

export function cloneTrace(t: EcalliTrace): EcalliTrace {
  return {
    prelude: {
      programHex: t.prelude.programHex,
      memoryWrites: t.prelude.memoryWrites.map((mw) => ({
        address: mw.address,
        dataHex: mw.dataHex,
      })),
      startPc: t.prelude.startPc,
      startGas: t.prelude.startGas,
      startRegisters: new Map(t.prelude.startRegisters),
    },
    entries: t.entries.map(cloneTraceEntry),
    termination: t.termination ? cloneTermination(t.termination) : undefined,
  };
}

function cloneTraceEntry(e: TraceEntry): TraceEntry {
  return {
    index: e.index,
    pc: e.pc,
    gas: e.gas,
    registers: new Map(e.registers),
    memoryReads: e.memoryReads.map((mr) => ({
      address: mr.address,
      length: mr.length,
      dataHex: mr.dataHex,
    })),
    memoryWrites: e.memoryWrites.map((mw) => ({
      address: mw.address,
      dataHex: mw.dataHex,
    })),
    registerWrites: new Map(e.registerWrites),
    gasAfter: e.gasAfter,
  };
}

function cloneTermination(t: TraceTermination): TraceTermination {
  return {
    kind: t.kind,
    arg: t.arg,
    pc: t.pc,
    gas: t.gas,
    registers: new Map(t.registers),
  };
}

export function cloneEnvelope(e: ProgramEnvelope): ProgramEnvelope {
  return {
    programKind: e.programKind,
    programBytes: new Uint8Array(e.programBytes),
    initialState: cloneInitialState(e.initialState),
    metadata: e.metadata ? new Uint8Array(e.metadata) : undefined,
    spiEntrypoint: e.spiEntrypoint,
    loadContext: e.loadContext
      ? {
          spiProgram: e.loadContext.spiProgram
            ? {
                program: new Uint8Array(e.loadContext.spiProgram.program),
                hasMetadata: e.loadContext.spiProgram.hasMetadata,
              }
            : undefined,
          spiArgs: e.loadContext.spiArgs
            ? new Uint8Array(e.loadContext.spiArgs)
            : undefined,
        }
      : undefined,
    trace: e.trace ? cloneTrace(e.trace) : undefined,
    expectedState: e.expectedState
      ? {
          status: e.expectedState.status,
          pc: e.expectedState.pc,
          gas: e.expectedState.gas,
          registers: [...e.expectedState.registers],
          memory: e.expectedState.memory.map((m) => ({
            address: m.address,
            data: new Uint8Array(m.data),
          })),
        }
      : undefined,
    sourceMeta: { ...e.sourceMeta },
  };
}

function cloneInitialState(
  s: ProgramEnvelope["initialState"],
): ProgramEnvelope["initialState"] {
  return {
    pc: s.pc,
    gas: s.gas,
    registers: [...s.registers],
    pageMap: s.pageMap.map((p) => ({ ...p })),
    memoryChunks: s.memoryChunks.map((c) => ({
      address: c.address,
      data: new Uint8Array(c.data),
    })),
  };
}

export function cloneHostCallInfo(info: HostCallInfo): HostCallInfo {
  return {
    pvmId: info.pvmId,
    hostCallIndex: info.hostCallIndex,
    hostCallName: info.hostCallName,
    currentState: cloneSnapshot(info.currentState),
    resumeProposal: info.resumeProposal
      ? {
          registerWrites: new Map(info.resumeProposal.registerWrites),
          memoryWrites: info.resumeProposal.memoryWrites.map((mw) => ({
            address: mw.address,
            data: new Uint8Array(mw.data),
          })),
          gasAfter: info.resumeProposal.gasAfter,
          traceMatches: info.resumeProposal.traceMatches,
          mismatches: info.resumeProposal.mismatches.map((m) => ({ ...m })),
        }
      : undefined,
  };
}

export function clonePageMap(pm: PageMapEntry[]): PageMapEntry[] {
  return pm.map((p) => ({ ...p }));
}

// ---------------------------------------------------------------------------
// Trace prelude construction
// ---------------------------------------------------------------------------

/** Strip the "0x" prefix that toHex produces. */
function hexDigits(bytes: Uint8Array): string {
  return toHex(bytes).slice(2);
}

/** Build a register map from a bigint array (non-zero entries only). */
export function registersToMap(regs: bigint[]): Map<number, bigint> {
  const m = new Map<number, bigint>();
  for (let i = 0; i < regs.length; i++) {
    if (regs[i] !== 0n) m.set(i, regs[i]);
  }
  return m;
}

export function buildRecordedTracePrelude(
  envelope: ProgramEnvelope,
): EcalliTrace {
  const s = envelope.initialState;
  const programBytes = envelope.loadContext?.spiProgram?.program ?? envelope.programBytes;

  // For SPI programs, only include the SPI args at the arguments address (0xFEFF0000),
  // not all expanded memory chunks (stack, heap, RO data, etc.)
  const spiArgs = envelope.loadContext?.spiArgs;
  const memoryWrites =
    spiArgs && spiArgs.length > 0
      ? [{ address: 0xfeff0000, dataHex: hexDigits(spiArgs) }]
      : s.memoryChunks.map((c) => ({
          address: c.address,
          dataHex: hexDigits(c.data),
        }));

  return {
    prelude: {
      programHex: hexDigits(programBytes),
      memoryWrites,
      startPc: s.pc,
      startGas: s.gas,
      startRegisters: registersToMap(s.registers),
    },
    entries: [],
  };
}

// ---------------------------------------------------------------------------
// Trace recording helpers (mutate session.recordedTrace in place)
// ---------------------------------------------------------------------------

export function appendHostCallEntry(
  session: Session,
  effects: HostCallResumeEffects,
  hostCallInfo: HostCallInfo,
): void {
  // Copy memoryReads from the corresponding reference trace entry if available
  const refEntryIdx = session.recordedTrace.entries.length;
  const refEntry = session.referenceTrace?.entries[refEntryIdx];
  const memoryReads =
    refEntry && refEntry.index === hostCallInfo.hostCallIndex
      ? refEntry.memoryReads.map((mr) => ({
          address: mr.address,
          length: mr.length,
          dataHex: mr.dataHex,
        }))
      : [];

  const entry: TraceEntry = {
    index: hostCallInfo.hostCallIndex,
    pc: hostCallInfo.currentState.pc,
    gas: hostCallInfo.currentState.gas,
    registers: registersToMap(hostCallInfo.currentState.registers),
    memoryReads,
    memoryWrites:
      effects.memoryWrites?.map((mw) => ({
        address: mw.address,
        dataHex: hexDigits(mw.data),
      })) ?? [],
    registerWrites: effects.registerWrites
      ? new Map(effects.registerWrites)
      : new Map(),
    gasAfter: effects.gasAfter,
  };
  session.recordedTrace.entries.push(entry);
}

const TERMINATION_KIND_MAP: Partial<
  Record<PvmStatus, TraceTermination["kind"]>
> = {
  halt: "halt",
  panic: "panic",
  fault: "fault",
  out_of_gas: "oog",
};

export function appendTermination(
  session: Session,
  status: PvmStatus,
  snapshot: MachineStateSnapshot,
): void {
  const kind = TERMINATION_KIND_MAP[status];
  if (!kind) return;
  session.recordedTrace.termination = {
    kind,
    pc: snapshot.pc,
    gas: snapshot.gas,
    registers: registersToMap(snapshot.registers),
  };
}

function emptyTrace(): EcalliTrace {
  return {
    prelude: {
      programHex: "",
      memoryWrites: [],
      startPc: 0,
      startGas: 0n,
      startRegisters: new Map(),
    },
    entries: [],
  };
}
