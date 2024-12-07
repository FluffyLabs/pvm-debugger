import { Status } from "@/types/pvm.ts";
import * as wasm from "./wasmBindgenInit";

export interface WasmPvmShellInterface {
  __wbg_set_wasm(val: unknown): void;
  getProgramCounter(): number;
  setNextProgramCounter?(pc: number): void;
  getGasLeft(): bigint;
  setGasLeft?(gas: bigint): void;
  resetGeneric(program: Uint8Array, registers: Uint8Array, gas: bigint): void;
  resetGenericWithMemory?(
    program: Uint8Array,
    registers: Uint8Array,
    pageMap: Uint8Array,
    chunks: Uint8Array,
    gas: bigint,
  ): void;
  nextStep(): boolean;
  run(steps: number): boolean;
  getExitArg(): number;
  getStatus(): Status;
  getRegisters(): Uint8Array;
  setRegisters(registers: Uint8Array): void;
  getPageDump(index: number): Uint8Array;
  setMemory(address: number, data: Uint8Array): void;
}

export function createWasmPvmShell(): WasmPvmShellInterface {
  const {
    __wbg_set_wasm,
    resetGeneric,
    resetGenericWithMemory,
    nextStep,
    run,
    getProgramCounter,
    setNextProgramCounter,
    getExitArg,
    getStatus,
    getGasLeft,
    setGasLeft,
    getRegisters,
    setRegisters,
    getPageDump,
    setMemory,
  } = wasm;
  return {
    __wbg_set_wasm,
    resetGeneric,
    resetGenericWithMemory,
    nextStep,
    run,
    getProgramCounter,
    setNextProgramCounter,
    getStatus,
    getExitArg,
    getGasLeft,
    setGasLeft,
    getRegisters,
    setRegisters,
    getPageDump,
    setMemory,
  };
}
