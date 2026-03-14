/** Type-safe interface for the ananas WASM module exports we use. */
export interface AnanasApi {
  resetJAM(program: Array<number>, pc: number, initialGas: bigint, args: Array<number>, hasMetadata?: boolean): void;
  resetGeneric(program: Array<number>, flatRegisters: Array<number>, initialGas: bigint, hasMetadata?: boolean): void;
  resetGenericWithMemory(program: Array<number>, flatRegisters: Array<number>, pageMap: Uint8Array, chunks: Uint8Array, initialGas: bigint, hasMetadata?: boolean): void;
  nextStep(): boolean;
  nSteps(steps: number): boolean;
  getProgramCounter(): number;
  setNextProgramCounter(pc: number): void;
  getStatus(): number;
  getExitArg(): number;
  getGasLeft(): bigint;
  setGasLeft(gas: bigint): void;
  getRegisters(): Uint8Array;
  setRegisters(flatRegisters: Array<number>): void;
  getPageDump(index: number): Uint8Array;
  setMemory(address: number, data: Uint8Array): boolean;
}
