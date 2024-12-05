import { WasmPvmShellInterface } from "@/packages/web-worker/wasmBindgenShell.ts";

import { instantiate } from "./wasmAsInit";

export async function createAssemblyScriptWasmPvmShell(module: WebAssembly.Module): Promise<WasmPvmShellInterface> {
  const imports = {};
  const instance = await instantiate(module, imports);
  const {
    // memory,
    // example,
    resetGeneric,
    resetGenericWithMemory,
    nextStep,
    getProgramCounter,
    setNextProgramCounter,
    getStatus,
    // getExitArg,
    getGasLeft,
    setGasLeft,
    getRegisters,
    getPageDump,
  } = instance;

  return {
    __wbg_set_wasm: () => {},
    resetGeneric,
    resetGenericWithMemory,
    nextStep,
    getProgramCounter,
    setNextProgramCounter,
    setGasLeft,
    getStatus,
    getGasLeft,
    getRegisters,
    getPageDump,
  };
}
