import { ExpectedState, MemoryChunkItem, PageMapItem, RegistersArray } from "@/types/pvm.ts";
import { Pvm as InternalPvm } from "@typeberry/pvm-debugger-adapter";
import { createWasmPvmShell } from "@/packages/web-worker/wasmBindgenShell.ts";
import "./goWasmExec.js";
import "./goWasmExec.d.ts";
import { createGoWasmPvmShell } from "@/packages/web-worker/wasmGoShell.ts";
import { logger } from "@/utils/loggerService.tsx";
import { PvmApiInterface } from "./types.ts";
import { createAssemblyScriptWasmPvmShell } from "./wasmAsShell.ts";

export enum SupportedLangs {
  Go = "Go",
  Rust = "Rust",
  AssemblyScript = "AssemblyScript",
}

export function getState(pvm: PvmApiInterface): ExpectedState {
  const regs = isInternalPvm(pvm)
    ? (Array.from(pvm.getRegisters()).map((x) => Number(x)) as RegistersArray)
    : uint8asRegs(pvm.getRegisters());

  return {
    pc: pvm.getProgramCounter(),
    regs,
    gas: pvm.getGasLeft(),
    status: pvm.getStatus(),
  };
}

export function regsAsUint8(regs?: RegistersArray): Uint8Array {
  const arr = new Uint8Array(13 * 4);
  if (!regs) {
    return arr;
  }

  let i = 0;
  for (const reg of regs) {
    const bytes = u32_le_bytes(reg);
    for (let a = 0; a < bytes.length; a += 1) {
      arr[i] = bytes[a];
      i += 1;
    }
  }
  return arr;
}

export function u32_le_bytes(val: number) {
  const out = new Uint8Array(4);
  out[0] = val & 0xff;
  out[1] = (val >> 8) & 0xff;
  out[2] = (val >> 16) & 0xff;
  out[3] = (val >> 24) & 0xff;
  return out;
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
  return pvm instanceof InternalPvm;
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
  }

  if (lang === SupportedLangs.Rust) {
    const wasmModule = await WebAssembly.instantiate(bytes, {});
    logger.info("Rust WASM module loaded", wasmModule.instance.exports);
    const wasmPvmShell = createWasmPvmShell();
    wasmPvmShell.__wbg_set_wasm(wasmModule.instance.exports);
    return wasmPvmShell;
  }

  if (lang === SupportedLangs.AssemblyScript) {
    const compiled = await WebAssembly.compile(bytes);
    logger.info("AssemblyScript WASM module compiled", compiled);
    const wasmPvmShell = await createAssemblyScriptWasmPvmShell(compiled);
    logger.info("AssemblyScript WASM module loaded", wasmPvmShell);
    return wasmPvmShell;
  }

  throw new Error(`Unsupported lang: ${lang}`);
}

export function getMemorySize(pvm: PvmApiInterface | null) {
  if (!pvm) {
    logger.warn("Accesing memory of not initialized PVM");
    return null;
  }

  const page = pvm.getPageDump(0);

  if (!page) {
    logger.warn("PVM memory page is null");
    return null;
  }

  // PVM shouldn't return empty memory. If such scenario ever happens, change this code
  if (page.length === 0) {
    throw new Error("Memory page is empty");
  }

  return page.length;
}

export function chunksAsUint8(memory?: MemoryChunkItem[]): Uint8Array {
  if (!memory) {
    return new Uint8Array();
  }

  const result = [];
  for (const chunk of memory) {
    const address = u32_le_bytes(chunk.address);
    const length = u32_le_bytes(chunk.contents.length);
    // chunk: (u32, u32, Vec<u8>)
    result.push(...address);
    result.push(...length);
    result.push(...chunk.contents);
  }

  return new Uint8Array(result);
}
export function pageMapAsUint8(pageMap?: PageMapItem[]): Uint8Array {
  if (!pageMap) {
    return new Uint8Array();
  }

  const result = [];
  for (const page of pageMap) {
    const address = u32_le_bytes(page.address);
    const length = u32_le_bytes(page.length);
    const isWriteable = page["is-writable"] ? 1 : 0;
    // page: (u32, u32, bool)
    result.push(...address);
    result.push(...length);
    result.push(isWriteable);
  }

  return new Uint8Array(result);
}
