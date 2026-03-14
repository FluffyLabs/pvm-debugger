import type { InitialMachineState, ProgramLoadContext, PageMapEntry, MemoryChunk } from "@pvmdbg/types";
import { getMemoryRange } from "../utils.js";
import type { SyncPvmInterpreter } from "./types.js";
import type { AnanasApi } from "./ananas-shell.js";

/** Encode page map to Uint8Array for ananas resetGenericWithMemory. */
function encodePageMap(pageMap: PageMapEntry[]): Uint8Array {
  // Each page entry: u32 address (4 bytes LE) + u32 length (4 bytes LE) + u8 access (1 byte)
  // Access: 1 = read-only, 3 = writable
  const result = new Uint8Array(pageMap.length * 9);
  const view = new DataView(result.buffer);
  for (let i = 0; i < pageMap.length; i++) {
    const offset = i * 9;
    view.setUint32(offset, pageMap[i].address, true);
    view.setUint32(offset + 4, pageMap[i].length, true);
    result[offset + 8] = pageMap[i].isWritable ? 3 : 1;
  }
  return result;
}

/** Encode memory chunks to Uint8Array for ananas resetGenericWithMemory. */
function encodeChunks(chunks: MemoryChunk[]): Uint8Array {
  // Each chunk: u32 address (4 bytes LE) + u32 length (4 bytes LE) + data bytes
  let totalSize = 0;
  for (const chunk of chunks) {
    totalSize += 8 + chunk.data.length;
  }
  const result = new Uint8Array(totalSize);
  const view = new DataView(result.buffer);
  let offset = 0;
  for (const chunk of chunks) {
    view.setUint32(offset, chunk.address, true);
    view.setUint32(offset + 4, chunk.data.length, true);
    result.set(chunk.data, offset + 8);
    offset += 8 + chunk.data.length;
  }
  return result;
}

/** Ananas PVM interpreter wrapper implementing SyncPvmInterpreter. */
export class AnanasSyncInterpreter implements SyncPvmInterpreter {
  private storedProgram: Uint8Array | null = null;
  private storedInitialState: InitialMachineState | null = null;
  private storedLoadContext: ProgramLoadContext | undefined = undefined;

  constructor(private api: AnanasApi) {}

  load(program: Uint8Array, initialState: InitialMachineState, loadContext?: ProgramLoadContext): void {
    this.storedProgram = program;
    this.storedInitialState = initialState;
    this.storedLoadContext = loadContext;
    this.doLoad(program, initialState, loadContext);
  }

  private doLoad(program: Uint8Array, initialState: InitialMachineState, loadContext?: ProgramLoadContext): void {
    if (loadContext?.spiProgram) {
      this.api.resetJAM(
        Array.from(loadContext.spiProgram.program),
        initialState.pc,
        initialState.gas,
        loadContext.spiArgs ? Array.from(loadContext.spiArgs) : [],
        loadContext.spiProgram.hasMetadata,
      );
    } else {
      // Use resetGenericWithMemory for all generic loads
      const regsBytes = new Uint8Array(13 * 8);
      const view = new DataView(regsBytes.buffer);
      for (let i = 0; i < 13; i++) {
        view.setBigUint64(i * 8, initialState.registers[i] ?? 0n, true);
      }
      const flatRegs = Array.from(regsBytes);
      const pageMapBytes = encodePageMap(initialState.pageMap);
      const chunksBytes = encodeChunks(initialState.memoryChunks);
      this.api.resetGenericWithMemory(
        Array.from(program),
        flatRegs,
        pageMapBytes,
        chunksBytes,
        initialState.gas,
      );
    }

    // After every reset: set PC, gas, and prime with nextStep()
    this.api.setNextProgramCounter(initialState.pc);
    this.api.setGasLeft(initialState.gas);
    this.api.nextStep();
  }

  reset(): void {
    if (!this.storedProgram || !this.storedInitialState) {
      throw new Error("Cannot reset: no program has been loaded");
    }
    this.doLoad(this.storedProgram, this.storedInitialState, this.storedLoadContext);
  }

  step(n: number): { finished: boolean } {
    if (n === 1) {
      const running = this.api.nextStep();
      return { finished: !running };
    }
    const running = this.api.nSteps(n);
    return { finished: !running };
  }

  getStatus(): number {
    return this.api.getStatus();
  }

  getPc(): number {
    return this.api.getProgramCounter();
  }

  setPc(pc: number): void {
    this.api.setNextProgramCounter(pc);
  }

  getGas(): bigint {
    return this.api.getGasLeft();
  }

  getRegisters(): Uint8Array {
    return this.api.getRegisters();
  }

  setRegisters(data: Uint8Array): void {
    // Ananas expects Array<number>, not Uint8Array
    this.api.setRegisters(Array.from(data));
  }

  setGas(gas: bigint): void {
    this.api.setGasLeft(gas);
  }

  getMemory(address: number, length: number): Uint8Array {
    return getMemoryRange(
      (pageNumber) => this.api.getPageDump(pageNumber),
      address,
      length,
    );
  }

  setMemory(address: number, data: Uint8Array): void {
    this.api.setMemory(address, data);
  }

  getExitArg(): number {
    return this.api.getExitArg();
  }

  shutdown(): void {
    // No explicit resource release needed for ananas
  }
}
