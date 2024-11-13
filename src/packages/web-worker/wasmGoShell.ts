import { WasmPvmShellInterface } from "@/packages/web-worker/wasmBindgenShell.ts";

import * as wasm from "./wasmGoInit";

export function createGoWasmPvmShell(): WasmPvmShellInterface {
  const { __wbg_set_wasm, reset, nextStep, getProgramCounter, getStatus, getGasLeft, getRegisters, getPageDump } = wasm;

  return {
    __wbg_set_wasm,
    resetGeneric: reset,
    nextStep,
    getProgramCounter,
    getStatus,
    getGasLeft,
    getRegisters,
    getPageDump,
  };
}
