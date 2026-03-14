import type { PvmStatus } from "./pvm-status.js";
import type { InitialMachineState, MachineStateSnapshot } from "./machine-state.js";
import type { ProgramLoadContext } from "./program.js";

/** Async adapter interface — wraps a PVM interpreter (may run in a web worker or directly). */
export interface PvmAdapter {
  readonly pvmId: string;
  readonly pvmName: string;

  /** Load program and set initial state. */
  load(program: Uint8Array, initialState: InitialMachineState, loadContext?: ProgramLoadContext): Promise<void>;

  /** Reset to initial state (equivalent to load with same program). */
  reset(): Promise<void>;

  /** Execute n steps. Returns the state after stepping. */
  step(n: number): Promise<AdapterStepResult>;

  /** Get current machine state snapshot. */
  getState(): Promise<MachineStateSnapshot>;

  /** Get memory contents for a range. */
  getMemory(address: number, length: number): Promise<Uint8Array>;

  /** Set register values. */
  setRegisters(regs: Map<number, bigint>): Promise<void>;

  /** Set program counter. */
  setPc(pc: number): Promise<void>;

  /** Set gas value. */
  setGas(gas: bigint): Promise<void>;

  /** Write to memory. */
  setMemory(address: number, data: Uint8Array): Promise<void>;

  /** Shut down the adapter and release resources. */
  shutdown(): Promise<void>;
}

export interface AdapterStepResult {
  status: PvmStatus;
  pc: number;
  gas: bigint;
  /** Set when status is HOST — the ecalli operand index. */
  exitArg?: number;
}
