// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
/* eslint-disable */

// This file is generated by AssemblyScript compiler.
// We just change it a bit to export `instantiate` function
// instead of loading WASM directly.
//
// Latest version: https://todr.me/anan-as/build/release.js

export async function instantiate(module, imports = {}) {
  const adaptedImports = {
    env: Object.assign(Object.create(globalThis), imports.env || {}, {
      abort(message, fileName, lineNumber, columnNumber) {
        // ~lib/builtins/abort(~lib/string/String | null?, ~lib/string/String | null?, u32?, u32?) => void
        message = __liftString(message >>> 0);
        fileName = __liftString(fileName >>> 0);
        lineNumber = lineNumber >>> 0;
        columnNumber = columnNumber >>> 0;
        (() => {
          // @external.js
          throw Error(`${message} in ${fileName}:${lineNumber}:${columnNumber}`);
        })();
      },
      "console.log"(text) {
        // ~lib/bindings/dom/console.log(~lib/string/String) => void
        text = __liftString(text >>> 0);
        console.log(text);
      },
    }),
  };
  const { exports } = await WebAssembly.instantiate(module, adaptedImports);
  const memory = exports.memory || imports.env.memory;
  const adaptedExports = Object.setPrototypeOf(
    {
      InputKind: ((values) =>
        (
          // assembly/index/InputKind
          (values[(values.Generic = exports["InputKind.Generic"].valueOf())] = "Generic"),
          (values[(values.SPI = exports["InputKind.SPI"].valueOf())] = "SPI"),
          values
        ))({}),
      disassemble(input, kind) {
        // assembly/index/disassemble(~lib/array/Array<u8>, i32) => ~lib/string/String
        input = __lowerArray(__setU8, 4, 0, input) || __notnull();
        return __liftString(exports.disassemble(input, kind) >>> 0);
      },
      runProgram(input, kind) {
        // assembly/index/runProgram(~lib/array/Array<u8>, i32) => void
        input = __lowerArray(__setU8, 4, 0, input) || __notnull();
        exports.runProgram(input, kind);
      },
      runVm(input, logs) {
        // assembly/api-generic/runVm(assembly/api-generic/VmInput, bool?) => assembly/api-generic/VmOutput
        input = __lowerRecord39(input) || __notnull();
        logs = logs ? 1 : 0;
        exports.__setArgumentsLength(arguments.length);
        return __liftRecord44(exports.runVm(input, logs) >>> 0);
      },
      resetGeneric(program, flatRegisters, initialGas) {
        // assembly/api/resetGeneric(~lib/array/Array<u8>, ~lib/array/Array<u8>, u64) => void
        program = __retain(__lowerArray(__setU8, 4, 0, program) || __notnull());
        flatRegisters = __lowerArray(__setU8, 4, 0, flatRegisters) || __notnull();
        initialGas = initialGas || 0n;
        try {
          exports.resetGeneric(program, flatRegisters, initialGas);
        } finally {
          __release(program);
        }
      },
      resetGenericWithMemory(program, flatRegisters, pageMap, chunks, initialGas) {
        // assembly/api/resetGenericWithMemory(~lib/array/Array<u8>, ~lib/array/Array<u8>, ~lib/typedarray/Uint8Array, ~lib/typedarray/Uint8Array, u64) => void
        program = __retain(__lowerArray(__setU8, 4, 0, program) || __notnull());
        flatRegisters = __retain(__lowerArray(__setU8, 4, 0, flatRegisters) || __notnull());
        pageMap = __retain(__lowerTypedArray(Uint8Array, 5, 0, pageMap) || __notnull());
        chunks = __lowerTypedArray(Uint8Array, 5, 0, chunks) || __notnull();
        initialGas = initialGas || 0n;
        try {
          exports.resetGenericWithMemory(program, flatRegisters, pageMap, chunks, initialGas);
        } finally {
          __release(program);
          __release(flatRegisters);
          __release(pageMap);
        }
      },
      nextStep() {
        // assembly/api/nextStep() => bool
        return exports.nextStep() != 0;
      },
      run(steps) {
        // assembly/api/run(u32) => bool
        return exports.run(steps) != 0;
      },
      getProgramCounter() {
        // assembly/api/getProgramCounter() => u32
        return exports.getProgramCounter() >>> 0;
      },
      getExitArg() {
        // assembly/api/getExitArg() => u32
        return exports.getExitArg() >>> 0;
      },
      setGasLeft(gas) {
        // assembly/api/setGasLeft(i64) => void
        gas = gas || 0n;
        exports.setGasLeft(gas);
      },
      getRegisters() {
        // assembly/api/getRegisters() => ~lib/typedarray/Uint8Array
        return __liftTypedArray(Uint8Array, exports.getRegisters() >>> 0);
      },
      setRegisters(flatRegisters) {
        // assembly/api/setRegisters(~lib/array/Array<u8>) => void
        flatRegisters = __lowerArray(__setU8, 4, 0, flatRegisters) || __notnull();
        exports.setRegisters(flatRegisters);
      },
      getPageDump(index) {
        // assembly/api/getPageDump(u32) => ~lib/typedarray/Uint8Array
        return __liftTypedArray(Uint8Array, exports.getPageDump(index) >>> 0);
      },
      setMemory(address, data) {
        // assembly/api/setMemory(u32, ~lib/typedarray/Uint8Array) => void
        data = __lowerTypedArray(Uint8Array, 5, 0, data) || __notnull();
        exports.setMemory(address, data);
      },
    },
    exports,
  );
  function __lowerRecord40(value) {
    // assembly/api-generic/InitialPage
    // Hint: Opt-out from lowering as a record by providing an empty constructor
    if (value == null) return 0;
    const pointer = exports.__pin(exports.__new(12, 40));
    __setU32(pointer + 0, value.address);
    __setU32(pointer + 4, value.length);
    __setU32(pointer + 8, value.access);
    exports.__unpin(pointer);
    return pointer;
  }
  function __lowerRecord42(value) {
    // assembly/api-generic/InitialChunk
    // Hint: Opt-out from lowering as a record by providing an empty constructor
    if (value == null) return 0;
    const pointer = exports.__pin(exports.__new(8, 42));
    __setU32(pointer + 0, value.address);
    __setU32(pointer + 4, __lowerArray(__setU8, 4, 0, value.data) || __notnull());
    exports.__unpin(pointer);
    return pointer;
  }
  function __lowerRecord39(value) {
    // assembly/api-generic/VmInput
    // Hint: Opt-out from lowering as a record by providing an empty constructor
    if (value == null) return 0;
    const pointer = exports.__pin(exports.__new(28, 39));
    __setU32(pointer + 0, __lowerArray(__setU32, 38, 2, value.registers) || __notnull());
    __setU32(pointer + 4, value.pc);
    __setU64(pointer + 8, value.gas || 0n);
    __setU32(pointer + 16, __lowerArray(__setU8, 4, 0, value.program) || __notnull());
    __setU32(
      pointer + 20,
      __lowerArray(
        (pointer, value) => {
          __setU32(pointer, __lowerRecord40(value) || __notnull());
        },
        41,
        2,
        value.pageMap,
      ) || __notnull(),
    );
    __setU32(
      pointer + 24,
      __lowerArray(
        (pointer, value) => {
          __setU32(pointer, __lowerRecord42(value) || __notnull());
        },
        43,
        2,
        value.memory,
      ) || __notnull(),
    );
    exports.__unpin(pointer);
    return pointer;
  }
  function __liftRecord42(pointer) {
    // assembly/api-generic/InitialChunk
    // Hint: Opt-out from lifting as a record by providing an empty constructor
    if (!pointer) return null;
    return {
      address: __getU32(pointer + 0),
      data: __liftArray(__getU8, 0, __getU32(pointer + 4)),
    };
  }
  function __liftRecord44(pointer) {
    // assembly/api-generic/VmOutput
    // Hint: Opt-out from lifting as a record by providing an empty constructor
    if (!pointer) return null;
    return {
      status: __getI32(pointer + 0),
      registers: __liftArray((pointer) => __getU32(pointer) >>> 0, 2, __getU32(pointer + 4)),
      pc: __getU32(pointer + 8),
      memory: __liftArray((pointer) => __liftRecord42(__getU32(pointer)), 2, __getU32(pointer + 12)),
      gas: __getI64(pointer + 16),
    };
  }
  function __liftString(pointer) {
    if (!pointer) return null;
    const end = (pointer + new Uint32Array(memory.buffer)[(pointer - 4) >>> 2]) >>> 1,
      memoryU16 = new Uint16Array(memory.buffer);
    let start = pointer >>> 1,
      string = "";
    while (end - start > 1024) string += String.fromCharCode(...memoryU16.subarray(start, (start += 1024)));
    return string + String.fromCharCode(...memoryU16.subarray(start, end));
  }
  function __liftArray(liftElement, align, pointer) {
    if (!pointer) return null;
    const dataStart = __getU32(pointer + 4),
      length = __dataview.getUint32(pointer + 12, true),
      values = new Array(length);
    for (let i = 0; i < length; ++i) values[i] = liftElement(dataStart + ((i << align) >>> 0));
    return values;
  }
  function __lowerArray(lowerElement, id, align, values) {
    if (values == null) return 0;
    const length = values.length,
      buffer = exports.__pin(exports.__new(length << align, 1)) >>> 0,
      header = exports.__pin(exports.__new(16, id)) >>> 0;
    __setU32(header + 0, buffer);
    __dataview.setUint32(header + 4, buffer, true);
    __dataview.setUint32(header + 8, length << align, true);
    __dataview.setUint32(header + 12, length, true);
    for (let i = 0; i < length; ++i) lowerElement(buffer + ((i << align) >>> 0), values[i]);
    exports.__unpin(buffer);
    exports.__unpin(header);
    return header;
  }
  function __liftTypedArray(constructor, pointer) {
    if (!pointer) return null;
    return new constructor(
      memory.buffer,
      __getU32(pointer + 4),
      __dataview.getUint32(pointer + 8, true) / constructor.BYTES_PER_ELEMENT,
    ).slice();
  }
  function __lowerTypedArray(constructor, id, align, values) {
    if (values == null) return 0;
    const length = values.length,
      buffer = exports.__pin(exports.__new(length << align, 1)) >>> 0,
      header = exports.__new(12, id) >>> 0;
    __setU32(header + 0, buffer);
    __dataview.setUint32(header + 4, buffer, true);
    __dataview.setUint32(header + 8, length << align, true);
    new constructor(memory.buffer, buffer, length).set(values);
    exports.__unpin(buffer);
    return header;
  }
  const refcounts = new Map();
  function __retain(pointer) {
    if (pointer) {
      const refcount = refcounts.get(pointer);
      if (refcount) refcounts.set(pointer, refcount + 1);
      else refcounts.set(exports.__pin(pointer), 1);
    }
    return pointer;
  }
  function __release(pointer) {
    if (pointer) {
      const refcount = refcounts.get(pointer);
      if (refcount === 1) exports.__unpin(pointer), refcounts.delete(pointer);
      else if (refcount) refcounts.set(pointer, refcount - 1);
      else throw Error(`invalid refcount '${refcount}' for reference '${pointer}'`);
    }
  }
  function __notnull() {
    throw TypeError("value must not be null");
  }
  let __dataview = new DataView(memory.buffer);
  function __setU8(pointer, value) {
    try {
      __dataview.setUint8(pointer, value, true);
    } catch {
      __dataview = new DataView(memory.buffer);
      __dataview.setUint8(pointer, value, true);
    }
  }
  function __setU32(pointer, value) {
    try {
      __dataview.setUint32(pointer, value, true);
    } catch {
      __dataview = new DataView(memory.buffer);
      __dataview.setUint32(pointer, value, true);
    }
  }
  function __setU64(pointer, value) {
    try {
      __dataview.setBigUint64(pointer, value, true);
    } catch {
      __dataview = new DataView(memory.buffer);
      __dataview.setBigUint64(pointer, value, true);
    }
  }
  function __getU8(pointer) {
    try {
      return __dataview.getUint8(pointer, true);
    } catch {
      __dataview = new DataView(memory.buffer);
      return __dataview.getUint8(pointer, true);
    }
  }
  function __getI32(pointer) {
    try {
      return __dataview.getInt32(pointer, true);
    } catch {
      __dataview = new DataView(memory.buffer);
      return __dataview.getInt32(pointer, true);
    }
  }
  function __getU32(pointer) {
    try {
      return __dataview.getUint32(pointer, true);
    } catch {
      __dataview = new DataView(memory.buffer);
      return __dataview.getUint32(pointer, true);
    }
  }
  function __getI64(pointer) {
    try {
      return __dataview.getBigInt64(pointer, true);
    } catch {
      __dataview = new DataView(memory.buffer);
      return __dataview.getBigInt64(pointer, true);
    }
  }
  return adaptedExports;
}
