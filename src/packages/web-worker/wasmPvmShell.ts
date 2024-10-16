// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
/* eslint-disable */
import { Status } from "@/types/pvm.ts";

export interface WasmPvmShellInterface {
  __wbg_set_wasm(val: any): void;
  reset(program: Uint8Array, registers: Uint8Array, gas: bigint): void;
  nextStep(): boolean;
  getProgramCounter(): number;
  getStatus(): Status;
  getGasLeft(): bigint;
  getRegisters(): Uint8Array;
  getPageDump(index: number): Uint8Array;
  Status: Status;
}

export function createWasmPvmShell(): WasmPvmShellInterface {
  let wasm;
  let cachedUint8ArrayMemory0 = null;
  let WASM_VECTOR_LEN = 0;
  let cachedDataViewMemory0 = null;

  function __wbg_set_wasm(val) {
    wasm = val;
    cachedUint8ArrayMemory0 = null;
    cachedDataViewMemory0 = null;
  }

  function getUint8ArrayMemory0() {
    if (cachedUint8ArrayMemory0 === null || cachedUint8ArrayMemory0.byteLength === 0) {
      cachedUint8ArrayMemory0 = new Uint8Array(wasm.memory.buffer);
    }
    return cachedUint8ArrayMemory0;
  }

  function passArray8ToWasm0(arg, malloc) {
    const ptr = malloc(arg.length * 1, 1) >>> 0;
    getUint8ArrayMemory0().set(arg, ptr / 1);
    WASM_VECTOR_LEN = arg.length;
    return ptr;
  }

  /**
   * @param {Uint8Array} program
   * @param {Uint8Array} registers
   * @param {bigint} gas
   */
  function reset(program, registers, gas) {
    const ptr0 = passArray8ToWasm0(program, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passArray8ToWasm0(registers, wasm.__wbindgen_malloc);
    const len1 = WASM_VECTOR_LEN;
    console.log("---- reset ----", wasm, ptr0, len0, ptr1, len1, gas);
    wasm.reset(ptr0, len0, ptr1, len1, gas);
  }

  /**
   * @returns {boolean}
   */
  function nextStep() {
    const ret = wasm.nextStep();
    return ret !== 0;
  }

  /**
   * @returns {number}
   */
  function getProgramCounter() {
    const ret = wasm.getProgramCounter();
    return ret >>> 0;
  }

  /**
   * @returns {Status}
   */
  function getStatus() {
    const ret = wasm.getStatus();
    return ret;
  }

  /**
   * @returns {bigint}
   */
  function getGasLeft() {
    const ret = wasm.getGasLeft();
    return ret;
  }

  function getDataViewMemory0() {
    if (
      cachedDataViewMemory0 === null ||
      cachedDataViewMemory0.buffer.detached === true ||
      (cachedDataViewMemory0.buffer.detached === undefined && cachedDataViewMemory0.buffer !== wasm.memory.buffer)
    ) {
      cachedDataViewMemory0 = new DataView(wasm.memory.buffer);
    }
    return cachedDataViewMemory0;
  }

  function getArrayU8FromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return getUint8ArrayMemory0().subarray(ptr / 1, ptr / 1 + len);
  }

  /**
   * @returns {Uint8Array}
   */
  function getRegisters() {
    try {
      const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
      wasm.getRegisters(retptr);
      var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
      var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
      var v1 = getArrayU8FromWasm0(r0, r1).slice();
      wasm.__wbindgen_free(r0, r1 * 1, 1);
      return v1;
    } finally {
      wasm.__wbindgen_add_to_stack_pointer(16);
    }
  }

  /**
   * @param {number} index
   * @returns {Uint8Array}
   */
  function getPageDump(index) {
    try {
      const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
      wasm.getPageDump(retptr, index);
      var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
      var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
      var v1 = getArrayU8FromWasm0(r0, r1).slice();
      wasm.__wbindgen_free(r0, r1 * 1, 1);
      return v1;
    } finally {
      wasm.__wbindgen_add_to_stack_pointer(16);
    }
  }

  /**
   */
  const Status = Object.freeze({
    Ok: 0,
    "0": "Ok",
    Halt: 1,
    "1": "Halt",
    Panic: 2,
    "2": "Panic",
    OutOfGas: 3,
    "3": "OutOfGas",
  });

  return {
    __wbg_set_wasm,
    reset,
    nextStep,
    getProgramCounter,
    getStatus,
    getGasLeft,
    getRegisters,
    getPageDump,
    Status,
  };
}
