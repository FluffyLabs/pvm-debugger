import { ExpectedState, Pvm as InternalPvm, RegistersArray, Status } from "@/types/pvm.ts";
import { Pvm as InternalPvmInstance } from "@typeberry/pvm-debugger-adapter";
import { createWasmPvmShell } from "@/packages/web-worker/wasmPvmShell.ts";
import "./goWasmExec.js";
import "./goWasmExec.d.ts";
import { createGoWasmPvmShell } from "@/packages/web-worker/wasmGoPvmShell.ts";
import { logger } from "@/utils/loggerService.tsx";
import { PvmApiInterface } from "./types.ts";

export enum SupportedLangs {
  Go = "Go",
  Rust = "Rust",
}

export function getState(pvm: PvmApiInterface): ExpectedState {
  let newState: ExpectedState;
  if (isInternalPvm(pvm)) {
    newState = {
      pc: pvm.getPC(),
      regs: Array.from(pvm.getRegisters()) as RegistersArray,
      gas: pvm.getGas(),
      status: pvm.getStatus(),
    };
  } else {
    newState = {
      pc: pvm.getProgramCounter(),
      regs: uint8asRegs(pvm.getRegisters()),
      gas: Number(pvm.getGasLeft()),
      status: pvm.getStatus() as Status,
    };
  }
  return newState;
}

export function regsAsUint8(regs?: RegistersArray): Uint8Array {
  const arr = new Uint8Array(13 * 4);
  if (!regs) {
    return arr;
  }

  let i = 0;
  for (const reg of regs) {
    arr[i] = reg & 0xff;
    arr[i + 1] = (reg >> 8) & 0xff;
    arr[i + 2] = (reg >> 16) & 0xff;
    arr[i + 3] = (reg >> 24) & 0xff;
    i += 4;
  }
  return arr;
}

export function uint8asRegs(arr: Uint8Array): RegistersArray {
  const regs: RegistersArray = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  const u32Regs = new Uint32Array(arr.buffer);
  for (const regIdx of regs) {
    regs[regIdx] = u32Regs[regIdx];
  }
  return regs;
}

export function isInternalPvm(pvm: PvmApiInterface): pvm is InternalPvm {
  return pvm instanceof InternalPvmInstance;
}

export async function loadArrayBufferAsWasm(bytes: ArrayBuffer, lang?: SupportedLangs): Promise<PvmApiInterface> {
  if (lang === SupportedLangs.Go) {
    const go = new Go();
    const wasmModule = await WebAssembly.instantiate(bytes, go.importObject);
    go.run(wasmModule.instance);
    logger.info("Go WASM module loaded", wasmModule.instance.exports);
    const wasmPvmShell = createGoWasmPvmShell();
    wasmPvmShell.__wbg_set_wasm(wasmModule.instance.exports);
    return wasmPvmShell;
  } else {
    const wasmModule = await WebAssembly.instantiate(bytes, {});
    logger.info("Rust WASM module loaded", wasmModule.instance.exports);
    const wasmPvmShell = createWasmPvmShell();
    wasmPvmShell.__wbg_set_wasm(wasmModule.instance.exports);
    return wasmPvmShell;
  }
}

export function getMemoryPage(pageNumber: number, pvm: PvmApiInterface | null) {
  if (!pvm) {
    return new Uint8Array();
  }

  if (isInternalPvm(pvm)) {
    return pvm.getMemoryPage(pageNumber) || new Uint8Array();
  }
  return pvm.getPageDump(pageNumber) || new Uint8Array();
}
