// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
/* eslint-disable */

// NOTE: this file is a copy-paste of:
// https://github.com/tomusdrw/polkavm/blob/gh-pages/pvm-shell/pkg/pvm_shell_bg.js

let wasm;
export function __wbg_set_wasm(val) {
  wasm = val;
}

/**
 * @param {number} pc
 * @param {bigint} gas
 */
export function resume(pc, gas) {
  wasm.resume(pc, gas);
}

let cachedUint8ArrayMemory0 = null;

function getUint8ArrayMemory0() {
  if (cachedUint8ArrayMemory0 === null || cachedUint8ArrayMemory0.byteLength === 0) {
    cachedUint8ArrayMemory0 = new Uint8Array(wasm.memory.buffer);
  }
  return cachedUint8ArrayMemory0;
}

let WASM_VECTOR_LEN = 0;

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
export function reset(program, registers, gas) {
  const ptr0 = passArray8ToWasm0(program, wasm.__wbindgen_malloc);
  const len0 = WASM_VECTOR_LEN;
  const ptr1 = passArray8ToWasm0(registers, wasm.__wbindgen_malloc);
  const len1 = WASM_VECTOR_LEN;
  wasm.reset(ptr0, len0, ptr1, len1, gas);
}

/**
 * @param {Uint8Array} program
 * @param {Uint8Array} registers
 * @param {bigint} gas
 */
export function resetGeneric(program, registers, gas) {
  const ptr0 = passArray8ToWasm0(program, wasm.__wbindgen_malloc);
  const len0 = WASM_VECTOR_LEN;
  const ptr1 = passArray8ToWasm0(registers, wasm.__wbindgen_malloc);
  const len1 = WASM_VECTOR_LEN;
  wasm.reset(ptr0, len0, ptr1, len1, gas);
}

/**
 * @param {Uint8Array} program
 * @param {Uint8Array} registers
 * @param {Uint8Array} page_map
 * @param {Uint8Array} chunks
 * @param {bigint} gas
 */
export function resetGenericWithMemory(program, registers, page_map, chunks, gas) {
  const ptr0 = passArray8ToWasm0(program, wasm.__wbindgen_malloc);
  const len0 = WASM_VECTOR_LEN;
  const ptr1 = passArray8ToWasm0(registers, wasm.__wbindgen_malloc);
  const len1 = WASM_VECTOR_LEN;
  const ptr2 = passArray8ToWasm0(page_map, wasm.__wbindgen_malloc);
  const len2 = WASM_VECTOR_LEN;
  const ptr3 = passArray8ToWasm0(chunks, wasm.__wbindgen_malloc);
  const len3 = WASM_VECTOR_LEN;
  wasm.resetGenericWithMemory(ptr0, len0, ptr1, len1, ptr2, len2, ptr3, len3, gas);
}

/**
 * @returns {boolean}
 */
export function nextStep() {
  const ret = wasm.nextStep();
  return ret !== 0;
}

/**
 * @param {number} steps
 * @returns {boolean}
 */
export function nSteps(steps) {
  const ret = wasm.nSteps(steps);
  return ret !== 0;
}

/**
 * @returns {number}
 */
export function getProgramCounter() {
  const ret = wasm.getProgramCounter();
  return ret >>> 0;
}

/**
 * @param {number} pc
 */
export function setNextProgramCounter(pc) {
  wasm.setNextProgramCounter(pc);
}

/**
 * @returns {number}
 */
export function getStatus() {
  const ret = wasm.getStatus();
  return ret;
}

/**
 * @returns {number}
 */
export function getExitArg() {
  const ret = wasm.getExitArg();
  return ret >>> 0;
}

/**
 * @returns {bigint}
 */
export function getGasLeft() {
  const ret = wasm.getGasLeft();
  return ret;
}

/**
 * @param {bigint} gas
 */
export function setGasLeft(gas) {
  wasm.setGasLeft(gas);
}

let cachedDataViewMemory0 = null;

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
export function getRegisters() {
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
 * @param {Uint8Array} registers
 */
export function setRegisters(registers) {
  const ptr0 = passArray8ToWasm0(registers, wasm.__wbindgen_malloc);
  const len0 = WASM_VECTOR_LEN;
  wasm.setRegisters(ptr0, len0);
}

/**
 * @param {number} index
 * @returns {Uint8Array}
 */
export function getPageDump(index) {
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
 * @param {number} address
 * @param {Uint8Array} data
 */
export function setMemory(address, data) {
  const ptr0 = passArray8ToWasm0(data, wasm.__wbindgen_malloc);
  const len0 = WASM_VECTOR_LEN;
  wasm.setMemory(address, ptr0, len0);
}

/**
 */
export const Status = Object.freeze({
  Ok: 255,
  "255": "Ok",
  Halt: 0,
  "0": "Halt",
  Panic: 1,
  "1": "Panic",
  Fault: 2,
  "2": "Fault",
  Host: 3,
  "3": "Host",
  OutOfGas: 4,
  "4": "OutOfGas",
});
