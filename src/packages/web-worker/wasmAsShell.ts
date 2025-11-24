import { WasmPvmShellInterface } from "@/packages/web-worker/wasmBindgenShell.ts";

import { instantiate } from "./wasmAsInit";

export async function createAssemblyScriptWasmPvmShell(module: WebAssembly.Module): Promise<WasmPvmShellInterface> {
  const imports = {};
  const instance = await instantiate(module, imports);

  const {
    // memory,
    // InputKind,
    // HasMetadata,
    // disassemble,
    // prepareProgram,
    // runProgram,
    // runVm,
    // getAssembly,
    // wrapAsProgram,
    resetJAM,
    resetGeneric,
    resetGenericWithMemory,
    nextStep,
    nSteps,
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
    resetJAM,
    resetGeneric,
    resetGenericWithMemory,
    nextStep,
    nSteps,
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
