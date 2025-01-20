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

export async function getState(pvm: PvmApiInterface): Promise<ExpectedState> {
  const regs = isInternalPvm(pvm)
    ? (Array.from(await pvm.getRegisters()) as RegistersArray)
    : uint8asRegs(await pvm.getRegisters());

  return {
    pc: await pvm.getProgramCounter(),
    regs,
    gas: await pvm.getGasLeft(),
    status: await pvm.getStatus(),
  };
}

export function regsAsUint8(regs?: RegistersArray): Uint8Array {
  const arr = new Uint8Array(13 * 8);
  if (!regs) {
    return arr;
  }

  let i = 0;
  for (const reg of regs) {
    const bytes = u64_le_bytes(reg);
    for (let a = 0; a < bytes.length; a += 1) {
      arr[i] = bytes[a];
      i += 1;
    }
  }
  return arr;
}

function u32_le_bytes(val: number) {
  const out = new Uint8Array(4);
  out[0] = val & 0xff;
  out[1] = (val >> 8) & 0xff;
  out[2] = (val >> 16) & 0xff;
  out[3] = (val >> 24) & 0xff;
  return out;
}

export function u64_le_bytes(val: bigint) {
  const out = new Uint8Array(8);
  out[0] = Number(val & 0xffn);
  out[1] = Number((val >> 8n) & 0xffn);
  out[2] = Number((val >> 16n) & 0xffn);
  out[3] = Number((val >> 24n) & 0xffn);
  out[4] = Number((val >> 32n) & 0xffn);
  out[5] = Number((val >> 40n) & 0xffn);
  out[6] = Number((val >> 48n) & 0xffn);
  out[7] = Number((val >> 56n) & 0xffn);
  return out;
}

export function uint8asRegs(arr: Uint8Array): RegistersArray {
  const regs: RegistersArray = [0n, 1n, 2n, 3n, 4n, 5n, 6n, 7n, 8n, 9n, 10n, 11n, 12n];
  const u64Regs = new BigUint64Array(arr.buffer);
  for (const regIdx of regs) {
    const idx = Number(regIdx);
    regs[idx] = u64Regs[idx];
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

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    if (wasmModule["__wbg_set_wasm"]) {
      return wasmModule as unknown as PvmApiInterface;
    }

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

export async function getMemorySize(pvm?: PvmApiInterface | null) {
  if (!pvm) {
    logger.warn("Accesing memory of not initialized PVM");
    return null;
  }

  const page = await pvm.getPageDump(0);

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
