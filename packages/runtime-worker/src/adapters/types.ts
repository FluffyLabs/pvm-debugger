import type { InitialMachineState, ProgramLoadContext } from "@pvmdbg/types";

/** Synchronous PVM interpreter abstraction — used by both DirectAdapter and worker entry. */
export interface SyncPvmInterpreter {
  load(program: Uint8Array, initialState: InitialMachineState, loadContext?: ProgramLoadContext): void;
  reset(): void;
  step(n: number): { finished: boolean };
  getStatus(): number;
  getPc(): number;
  setPc(pc: number): void;
  getGas(): bigint;
  getRegisters(): Uint8Array;
  setRegisters(data: Uint8Array): void;
  setGas(gas: bigint): void;
  getMemory(address: number, length: number): Uint8Array;
  setMemory(address: number, data: Uint8Array): void;
  getExitArg(): number;
  shutdown(): void;
}
