import { WasmPvmShellInterface } from "@/packages/web-worker/wasmBindgenShell.ts";

import * as wasm from "./wasmGoInit";

export function createGoWasmPvmShell(): WasmPvmShellInterface {
  const { __wbg_set_wasm, reset, nextStep, getProgramCounter, getStatus, getGasLeft, getRegisters, getPageDump } = wasm;

  return {
    __wbg_set_wasm,
    resetGeneric: reset,
    nextStep,
    run: (steps: number) => {
      for (let i = 0; i < steps; i++) {
        if (!nextStep()) {
          return false;
        }
      }
      return true;
    },
    getProgramCounter,
    getStatus,
    getExitArg: () => 0,
    getGasLeft,
    getRegisters,
    setRegisters: (/*_registers: Uint8Array*/) => {},
    getPageDump,
    setMemory: (/*_address: number, _data: Uint8Array*/) => {},
  };
}
