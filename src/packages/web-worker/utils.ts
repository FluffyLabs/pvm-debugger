import { ExpectedState, Pvm as InternalPvm, RegistersArray, Status } from "@/types/pvm.ts";
import { Pvm as InternalPvmInstance } from "@typeberry/pvm";
import { PvmApiInterface } from "@/packages/web-worker/worker.ts";
import * as wasmPvmShell from "@/packages/web-worker/wasmPvmShell.ts";

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
      gas: pvm.getGasLeft(),
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
  let idx = 0;
  for (const regIdx of regs) {
    let num = arr[idx + 3];
    num = (num << 8) + arr[idx + 2];
    num = (num << 8) + arr[idx + 1];
    num = (num << 8) + arr[idx];
    regs[regIdx] = num;
    idx += 4;
  }
  return regs;
}

export function isInternalPvm(pvm: PvmApiInterface): pvm is InternalPvm {
  return pvm instanceof InternalPvmInstance;
}

export async function loadArrayBufferAsWasm(bytes: ArrayBuffer): Promise<PvmApiInterface> {
  const wasmModule = await WebAssembly.instantiate(bytes, {});
  console.log("WASM module loaded", wasmModule.instance.exports);
  wasmPvmShell.__wbg_set_wasm(wasmModule.instance.exports);
  return wasmPvmShell;
}
