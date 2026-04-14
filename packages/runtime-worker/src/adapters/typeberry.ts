import type { InitialMachineState, ProgramLoadContext } from "@pvmdbg/types";
import * as pvm from "@typeberry/lib/pvm-interpreter";
import { getMemoryRange, regsToUint8 } from "../utils.js";
import type { SyncPvmInterpreter } from "./types.js";

const {
  DebuggerAdapter,
  MemoryBuilder,
  Registers,
  tryAsMemoryIndex,
  tryAsSbrkIndex,
} = pvm;

const PAGE_SIZE = 4096;

/** Build typeberry Memory from our InitialMachineState page map and memory chunks. */
function buildMemory(
  initialState: InitialMachineState,
): pvm.Memory | undefined {
  if (
    initialState.pageMap.length === 0 &&
    initialState.memoryChunks.length === 0
  ) {
    return undefined;
  }

  const builder = new MemoryBuilder();

  for (const page of initialState.pageMap) {
    const start = tryAsMemoryIndex(page.address);
    const end = tryAsMemoryIndex(page.address + page.length);
    if (page.isWritable) {
      builder.setWriteablePages(start, end, new Uint8Array(page.length));
    } else {
      builder.setReadablePages(start, end, new Uint8Array(page.length));
    }
  }

  for (const chunk of initialState.memoryChunks) {
    const idx = tryAsMemoryIndex(chunk.address);
    builder.setData(idx, chunk.data);
  }

  // Derive heap placement from the largest non-reserved memory gap
  const maxAddressFromPageMap = initialState.pageMap.reduce(
    (max, page) => Math.max(max, page.address + page.length),
    0,
  );
  const heapStart =
    maxAddressFromPageMap > 0
      ? tryAsMemoryIndex(maxAddressFromPageMap + PAGE_SIZE)
      : tryAsMemoryIndex(0);
  const heapEnd = tryAsSbrkIndex(2 ** 32 - 2 * 2 ** 16 - 2 ** 24);

  return builder.finalize(heapStart, heapEnd);
}

// Typeberry fault status code (maps to "fault" via status-map)
const TYPEBERRY_STATUS_FAULT = 2;

/** Typeberry PVM interpreter wrapper implementing SyncPvmInterpreter. */
export class TypeberrySyncInterpreter implements SyncPvmInterpreter {
  private adapter: pvm.DebuggerAdapter;
  private storedProgram: Uint8Array | null = null;
  private storedInitialState: InitialMachineState | null = null;
  private storedLoadContext: ProgramLoadContext | undefined = undefined;
  // Workaround for typeberry assertion errors in fault-handling code paths
  // (e.g. getStartPageIndex using signed << on high addresses).
  // When set, overrides getStatus() to report fault instead of ok.
  private assertionFaultStatus: number | null = null;

  constructor() {
    this.adapter = new DebuggerAdapter();
  }

  load(
    program: Uint8Array,
    initialState: InitialMachineState,
    loadContext?: ProgramLoadContext,
  ): void {
    this.storedProgram = program;
    this.storedInitialState = initialState;
    this.storedLoadContext = loadContext;
    this.assertionFaultStatus = null;
    this.doLoad(program, initialState, loadContext);
  }

  private doLoad(
    program: Uint8Array,
    initialState: InitialMachineState,
    loadContext?: ProgramLoadContext,
  ): void {
    if (loadContext?.spiProgram) {
      this.adapter.resetJAM(
        loadContext.spiProgram.program,
        initialState.pc,
        initialState.gas,
        loadContext.spiArgs ?? new Uint8Array(),
        loadContext.spiProgram.hasMetadata,
      );
    } else {
      const memory = buildMemory(initialState);
      const registers = new Registers();
      registers.setAllEncoded(regsToUint8(initialState.registers));
      this.adapter.reset(
        program,
        initialState.pc,
        initialState.gas,
        registers,
        memory,
      );
    }
  }

  reset(): void {
    if (!this.storedProgram || !this.storedInitialState) {
      throw new Error("Cannot reset: no program has been loaded");
    }
    this.assertionFaultStatus = null;
    this.doLoad(
      this.storedProgram,
      this.storedInitialState,
      this.storedLoadContext,
    );
  }

  step(n: number): { finished: boolean } {
    try {
      if (n === 1) {
        const running = this.adapter.nextStep();
        return { finished: !running };
      }
      const running = this.adapter.nSteps(n);
      return { finished: !running };
    } catch (err) {
      // Typeberry has a known bug where its fault-handling code path throws
      // assertion errors (e.g. getStartPageIndex uses signed << on high
      // addresses, producing negative values that fail tryAsMemoryIndex).
      // The instruction itself was correctly identified as a fault, but the
      // error-reporting code crashed. Treat this as a fault.
      if (
        err instanceof Error &&
        err.message.includes("Assertion failure")
      ) {
        this.assertionFaultStatus = TYPEBERRY_STATUS_FAULT;
        return { finished: true };
      }
      throw err;
    }
  }

  getStatus(): number {
    if (this.assertionFaultStatus !== null) {
      return this.assertionFaultStatus;
    }
    return this.adapter.getStatus() as number;
  }

  getPc(): number {
    return this.adapter.getProgramCounter();
  }

  setPc(pc: number): void {
    this.adapter.setNextProgramCounter(pc);
  }

  getGas(): bigint {
    return this.adapter.getGasLeft();
  }

  getRegisters(): Uint8Array {
    return this.adapter.getRegisters();
  }

  setRegisters(data: Uint8Array): void {
    this.adapter.setRegisters(data);
  }

  setGas(gas: bigint): void {
    this.adapter.setGasLeft(gas);
  }

  getMemory(address: number, length: number): Uint8Array {
    return getMemoryRange(
      (pageNumber) => this.adapter.getPageDump(pageNumber),
      address,
      length,
    );
  }

  setMemory(address: number, data: Uint8Array): void {
    this.adapter.setMemory(address, data);
  }

  getExitArg(): number {
    return this.adapter.getExitArg();
  }

  shutdown(): void {
    // No explicit resource release needed for typeberry
  }
}
