import { Status } from "@/types/pvm.ts";
import * as wasm from "./wasmBindgenInit";

export interface WasmPvmShellInterface {
  __wbg_set_wasm(val: unknown): void;
  setNextProgramCounter?(pc: number): void;
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
  getProgramCounter(): number;
  getStatus(): Status;
  getGasLeft(): bigint;
  getRegisters(): Uint8Array;
  getPageDump(index: number): Uint8Array;
}

export function createWasmPvmShell(): WasmPvmShellInterface {
  const {
    __wbg_set_wasm,
    resetGeneric,
    resetGenericWithMemory,
    nextStep,
    getProgramCounter,
    setNextProgramCounter,
    getStatus,
    getGasLeft,
    setGasLeft,
    getRegisters,
    getPageDump,
  } = wasm;
  return {
    __wbg_set_wasm,
    resetGeneric,
    resetGenericWithMemory,
    nextStep,
    getProgramCounter,
    setNextProgramCounter,
    getStatus,
    getGasLeft,
    setGasLeft,
    getRegisters,
    getPageDump,
  };
}