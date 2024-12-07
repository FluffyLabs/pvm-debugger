import { WasmPvmShellInterface } from "@/packages/web-worker/wasmBindgenShell.ts";

import { instantiate } from "./wasmAsInit";

export async function createAssemblyScriptWasmPvmShell(module: WebAssembly.Module): Promise<WasmPvmShellInterface> {
  const imports = {};
  const instance = await instantiate(module, imports);
  const {
    // memory,
    // InputKind,
    // disassemble,
    // runProgram,
    // runVm,
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
  } = instance;

  return {
    __wbg_set_wasm: () => {},
    resetGeneric,
    resetGenericWithMemory,
    nextStep,
    run,
    getProgramCounter,
    setNextProgramCounter,
    setGasLeft,
    getStatus,
    getExitArg,
    getGasLeft,
    getRegisters,
    setRegisters,
    getPageDump,
    setMemory,
  };
}
