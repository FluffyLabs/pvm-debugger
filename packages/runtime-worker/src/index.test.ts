import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { InitialMachineState, ProgramLoadContext } from "@pvmdbg/types";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { initAnanas } from "./adapters/ananas-init.js";
import { encodePvmBlob } from "./blob-encoder.js";
import type { WorkerRequest, WorkerResponse } from "./commands.js";
import {
  AnanasSyncInterpreter,
  createWorkerCommandHandler,
  DirectAdapter,
  deserializeInitialState,
  getMemoryRange,
  installWorkerEntry,
  mapStatus,
  regsToUint8,
  serializeInitialState,
  TimeoutError,
  TypeberrySyncInterpreter,
  uint8ToRegs,
  validateRegisterIndices,
  WorkerBridge,
} from "./index.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixturesDir = resolve(__dirname, "../../../fixtures");

function readFixture(path: string): Uint8Array {
  return new Uint8Array(readFileSync(resolve(fixturesDir, path)));
}

// PVM opcodes (v0.5.9)
const LOAD_IMM = 51; // ONE_REGISTER_ONE_IMMEDIATE: byte1 lowNibble=reg, then imm bytes
const ADD_32 = 190; // THREE_REGISTERS: addU32(src1=lowNibble(b1), src2=highNibble(b1), dest=lowNibble(b2))
const STORE_IND_U16 = 121; // TWO_REGISTERS_ONE_IMMEDIATE: store_u16(base=lowNibble(b1), src=highNibble(b1), offset=imm)

// Helper: create a simple ADD program blob
// r0 = r7 + r8 (src1=r7, src2=r8, dest=r0)
function createAddProgram(): Uint8Array {
  const code = new Uint8Array([ADD_32, 0x87, 0x00]); // addU32(r7, r8, r0)
  return encodePvmBlob(code, [0]);
}

// Helper: create a LOAD_IMM program that loads a value into r0
function createLoadImmProgram(value: number): Uint8Array {
  const code = new Uint8Array([
    LOAD_IMM,
    0x00,
    value & 0xff,
    (value >> 8) & 0xff,
    (value >> 16) & 0xff,
    (value >> 24) & 0xff,
  ]);
  return encodePvmBlob(code, [0]);
}

// Helper: create a multi-step program: LOAD_IMM r7=a, LOAD_IMM r8=b, ADD_32 r0=r7+r8
function createMultiStepAddProgram(a: number, b: number): Uint8Array {
  const code = new Uint8Array([
    LOAD_IMM,
    0x07,
    a & 0xff,
    (a >> 8) & 0xff,
    0,
    0, // LOAD_IMM r7, a (6 bytes)
    LOAD_IMM,
    0x08,
    b & 0xff,
    (b >> 8) & 0xff,
    0,
    0, // LOAD_IMM r8, b (6 bytes)
    ADD_32,
    0x87,
    0x00, // ADD_32 r0 = r7 + r8 (3 bytes)
  ]);
  return encodePvmBlob(code, [0, 6, 12]);
}

// Helper: create a store program (STORE_IND_U16 to writable page)
function createStoreProgram(): Uint8Array {
  // STORE_IND_U16: store_u16(base=r7, src=r8, offset)
  // byte1 = (src<<4)|base = (8<<4)|7 = 0x87
  // imm = offset (u32 LE)
  const code = new Uint8Array([
    STORE_IND_U16,
    0x87,
    0,
    0,
    0,
    0, // store u16 at [r7 + 0] from r8
  ]);
  return encodePvmBlob(code, [0]);
}

const zeroRegs = Array.from({ length: 13 }, () => 0n);

const defaultState: InitialMachineState = {
  pc: 0,
  gas: 10000n,
  registers: zeroRegs,
  pageMap: [],
  memoryChunks: [],
};

const addState: InitialMachineState = {
  pc: 0,
  gas: 10000n,
  registers: [0n, 0n, 0n, 0n, 0n, 0n, 0n, 5n, 3n, 0n, 0n, 0n, 0n],
  pageMap: [],
  memoryChunks: [],
};

const storeState: InitialMachineState = {
  pc: 0,
  gas: 10000n,
  registers: [0n, 0n, 0n, 0n, 0n, 0n, 0n, 131072n, 0x1234n, 0n, 0n, 0n, 0n],
  pageMap: [{ address: 131072, length: 4096, isWritable: true }],
  memoryChunks: [],
};

// ===== status-map.ts =====
describe("mapStatus", () => {
  it("maps 255 to ok", () => expect(mapStatus(255)).toBe("ok"));
  it("maps 0 to halt", () => expect(mapStatus(0)).toBe("halt"));
  it("maps 1 to panic", () => expect(mapStatus(1)).toBe("panic"));
  it("maps 2 to fault", () => expect(mapStatus(2)).toBe("fault"));
  it("maps 3 to host", () => expect(mapStatus(3)).toBe("host"));
  it("maps 4 to out_of_gas", () => expect(mapStatus(4)).toBe("out_of_gas"));
  it("throws on unknown status code", () => {
    expect(() => mapStatus(5)).toThrow("Unknown PVM status code: 5");
    expect(() => mapStatus(100)).toThrow("Unknown PVM status code: 100");
    expect(() => mapStatus(-1)).toThrow("Unknown PVM status code: -1");
  });
});

// ===== utils.ts =====
describe("regsToUint8 / uint8ToRegs roundtrip", () => {
  it("roundtrips zero registers", () => {
    const regs = Array.from({ length: 13 }, () => 0n);
    const bytes = regsToUint8(regs);
    expect(bytes.length).toBe(104);
    expect(uint8ToRegs(bytes)).toEqual(regs);
  });

  it("roundtrips non-zero registers", () => {
    const regs = [
      1n,
      2n,
      3n,
      0xdeadbeefn,
      0xffffffffffffffffn,
      0n,
      0n,
      0n,
      0n,
      0n,
      0n,
      0n,
      42n,
    ];
    const bytes = regsToUint8(regs);
    expect(uint8ToRegs(bytes)).toEqual(regs);
  });
});

describe("getMemoryRange", () => {
  it("returns empty array for zero-length request", () => {
    const result = getMemoryRange(() => null, 0, 0);
    expect(result.length).toBe(0);
  });

  it("reads from a single page", () => {
    const page = new Uint8Array(4096);
    page[10] = 0xab;
    page[11] = 0xcd;
    const result = getMemoryRange(() => page, 10, 2);
    expect(result).toEqual(new Uint8Array([0xab, 0xcd]));
  });

  it("reads across page boundaries", () => {
    const page0 = new Uint8Array(4096);
    const page1 = new Uint8Array(4096);
    page0[4095] = 0xaa;
    page1[0] = 0xbb;
    page1[1] = 0xcc;
    const result = getMemoryRange(
      (pageNumber) =>
        pageNumber === 0 ? page0 : pageNumber === 1 ? page1 : null,
      4095,
      3,
    );
    expect(result).toEqual(new Uint8Array([0xaa, 0xbb, 0xcc]));
  });

  it("returns zeros for null pages", () => {
    const result = getMemoryRange(() => null, 0, 10);
    expect(result).toEqual(new Uint8Array(10));
  });
});

describe("serializeInitialState / deserializeInitialState roundtrip", () => {
  it("roundtrips a basic state", () => {
    const state: InitialMachineState = {
      pc: 42,
      gas: 999999n,
      registers: [1n, 2n, 3n, 4n, 5n, 6n, 7n, 8n, 9n, 10n, 11n, 12n, 13n],
      pageMap: [{ address: 0, length: 4096, isWritable: true }],
      memoryChunks: [{ address: 0, data: new Uint8Array([1, 2, 3]) }],
    };
    const deserialized = deserializeInitialState(serializeInitialState(state));
    expect(deserialized.pc).toBe(state.pc);
    expect(deserialized.gas).toBe(state.gas);
    expect(deserialized.registers).toEqual(state.registers);
    expect(deserialized.pageMap).toEqual(state.pageMap);
    expect(deserialized.memoryChunks[0].data).toEqual(
      new Uint8Array([1, 2, 3]),
    );
  });
});

describe("validateRegisterIndices", () => {
  it("accepts valid indices", () => {
    expect(() =>
      validateRegisterIndices(
        new Map([
          [0, 1n],
          [12, 2n],
        ]),
      ),
    ).not.toThrow();
  });
  it("rejects index >= 13", () => {
    expect(() => validateRegisterIndices(new Map([[13, 1n]]))).toThrow(
      "Invalid register index: 13",
    );
  });
  it("rejects negative index", () => {
    expect(() => validateRegisterIndices(new Map([[-1, 1n]]))).toThrow(
      "Invalid register index: -1",
    );
  });
});

// ===== encodePvmBlob =====
describe("encodePvmBlob", () => {
  it("creates a valid blob that typeberry can load", () => {
    const code = new Uint8Array([LOAD_IMM, 0x00, 42, 0, 0, 0]);
    const blob = encodePvmBlob(code, [0]);
    const interp = new TypeberrySyncInterpreter();
    interp.load(blob, defaultState);
    expect(interp.getStatus()).toBe(255); // OK
  });
});

// ===== TypeberrySyncInterpreter =====
describe("TypeberrySyncInterpreter", () => {
  let interpreter: TypeberrySyncInterpreter;

  beforeEach(() => {
    interpreter = new TypeberrySyncInterpreter();
  });

  it("executes ADD_32 correctly", () => {
    const program = createAddProgram();
    interpreter.load(program, addState);
    interpreter.step(1);
    const regs = uint8ToRegs(interpreter.getRegisters());
    expect(regs[0]).toBe(8n); // r0 = r7(5) + r8(3) = 8
    expect(regs[7]).toBe(5n);
    expect(regs[8]).toBe(3n);
  });

  it("executes multi-step program correctly", () => {
    const program = createMultiStepAddProgram(10, 20);
    interpreter.load(program, defaultState);
    interpreter.step(3);
    const regs = uint8ToRegs(interpreter.getRegisters());
    expect(regs[0]).toBe(30n); // 10 + 20
    expect(regs[7]).toBe(10n);
    expect(regs[8]).toBe(20n);
  });

  it("can reset and reproduce the same result", () => {
    const program = createAddProgram();
    interpreter.load(program, addState);
    interpreter.step(1);
    const regs1 = uint8ToRegs(interpreter.getRegisters());

    interpreter.reset();
    interpreter.step(1);
    const regs2 = uint8ToRegs(interpreter.getRegisters());
    expect(regs1).toEqual(regs2);
  });

  it("handles store to writable page without faulting", () => {
    const program = createStoreProgram();
    interpreter.load(program, storeState);
    interpreter.step(1);
    const status = mapStatus(interpreter.getStatus());
    expect(status).not.toBe("fault");
  });

  it("getMemory reads from writable page", () => {
    const program = createStoreProgram();
    interpreter.load(program, storeState);
    interpreter.step(1);
    // Read from the writable page area — should return data without error
    const mem = interpreter.getMemory(131072, 4);
    expect(mem.length).toBe(4);
    // The page was mapped writable, so getMemory should succeed
    expect(mem).toBeInstanceOf(Uint8Array);
  });

  it("setPc changes the program counter", () => {
    interpreter.load(createAddProgram(), defaultState);
    interpreter.setPc(99);
    expect(interpreter.getPc()).toBe(99);
  });

  it("setGas changes gas", () => {
    interpreter.load(createAddProgram(), defaultState);
    interpreter.setGas(42n);
    expect(interpreter.getGas()).toBe(42n);
  });

  it("setRegisters changes registers", () => {
    interpreter.load(createAddProgram(), defaultState);
    const newRegs = Array.from({ length: 13 }, (_, i) => BigInt(i + 100));
    interpreter.setRegisters(regsToUint8(newRegs));
    const gotRegs = uint8ToRegs(interpreter.getRegisters());
    expect(gotRegs).toEqual(newRegs);
  });
});

// ===== AnanasSyncInterpreter =====
describe("AnanasSyncInterpreter", () => {
  let interpreter: AnanasSyncInterpreter;

  beforeAll(async () => {
    const api = await initAnanas();
    interpreter = new AnanasSyncInterpreter(api);
  });

  it("executes ADD_32 correctly", () => {
    const program = createAddProgram();
    interpreter.load(program, addState);
    interpreter.step(1);
    const regs = uint8ToRegs(interpreter.getRegisters());
    expect(regs[0]).toBe(8n); // r0 = r7(5) + r8(3) = 8
  });

  it("executes multi-step program correctly", () => {
    const program = createMultiStepAddProgram(10, 20);
    interpreter.load(program, defaultState);
    interpreter.step(3);
    const regs = uint8ToRegs(interpreter.getRegisters());
    expect(regs[0]).toBe(30n);
  });

  it("handles store to writable page without faulting", () => {
    const program = createStoreProgram();
    interpreter.load(program, storeState);
    interpreter.step(1);
    const status = mapStatus(interpreter.getStatus());
    expect(status).not.toBe("fault");
  });

  it("can reset and reproduce the same result", () => {
    const program = createAddProgram();
    interpreter.load(program, addState);
    interpreter.step(1);
    const regs1 = uint8ToRegs(interpreter.getRegisters());
    const gas1 = interpreter.getGas();

    interpreter.reset();
    interpreter.step(1);
    const regs2 = uint8ToRegs(interpreter.getRegisters());
    const gas2 = interpreter.getGas();
    expect(regs1).toEqual(regs2);
    expect(gas1).toBe(gas2);
  });

  it("setPc changes the program counter immediately", () => {
    interpreter.load(createAddProgram(), defaultState);
    interpreter.setPc(99);
    expect(interpreter.getPc()).toBe(99);
  });

  it("setPc does not consume gas", () => {
    interpreter.load(createAddProgram(), defaultState);
    const gasBefore = interpreter.getGas();
    interpreter.setPc(99);
    expect(interpreter.getGas()).toBe(gasBefore);
  });

  it("setPc followed by step executes from the new PC", () => {
    // Load multi-step program: LOAD_IMM r7=10, LOAD_IMM r8=20, ADD_32 r0=r7+r8
    const program = createMultiStepAddProgram(10, 20);
    interpreter.load(program, defaultState);
    // Jump to the second instruction (LOAD_IMM r8=20 at PC=6)
    interpreter.setPc(6);
    interpreter.step(1);
    const regs = uint8ToRegs(interpreter.getRegisters());
    // r8 should be loaded with 20, r7 should still be 0 (we skipped its LOAD_IMM)
    expect(regs[8]).toBe(20n);
    expect(regs[7]).toBe(0n);
  });

  it("setGas changes gas", () => {
    interpreter.load(createAddProgram(), defaultState);
    interpreter.setGas(42n);
    expect(interpreter.getGas()).toBe(42n);
  });

  it("setRegisters changes registers", () => {
    interpreter.load(createAddProgram(), defaultState);
    const newRegs = Array.from({ length: 13 }, (_, i) => BigInt(i + 100));
    interpreter.setRegisters(regsToUint8(newRegs));
    const gotRegs = uint8ToRegs(interpreter.getRegisters());
    expect(gotRegs).toEqual(newRegs);
  });
});

// ===== Typeberry and Ananas produce same final state =====
describe("Typeberry and Ananas produce same final state", () => {
  let typeberry: TypeberrySyncInterpreter;
  let ananas: AnanasSyncInterpreter;

  beforeAll(async () => {
    typeberry = new TypeberrySyncInterpreter();
    const api = await initAnanas();
    ananas = new AnanasSyncInterpreter(api);
  });

  it("multi-step ADD program produces identical results", () => {
    const program = createMultiStepAddProgram(100, 200);

    typeberry.load(program, defaultState);
    typeberry.step(100);
    const tbRegs = uint8ToRegs(typeberry.getRegisters());
    const tbStatus = mapStatus(typeberry.getStatus());
    const tbGas = typeberry.getGas();

    ananas.load(program, defaultState);
    ananas.step(100);
    const anRegs = uint8ToRegs(ananas.getRegisters());
    const anStatus = mapStatus(ananas.getStatus());
    const anGas = ananas.getGas();

    expect(tbStatus).toBe(anStatus);
    expect(tbRegs).toEqual(anRegs);
    expect(tbGas).toBe(anGas);
  });
});

// ===== DirectAdapter =====
describe("DirectAdapter", () => {
  describe("with Typeberry", () => {
    let adapter: DirectAdapter;

    beforeEach(() => {
      adapter = new DirectAdapter(
        "tb-1",
        "Typeberry",
        new TypeberrySyncInterpreter(),
      );
    });

    it("executes ADD_32 correctly", async () => {
      await adapter.load(createAddProgram(), addState);
      await adapter.step(1);
      const state = await adapter.getState();
      expect(state.registers[0]).toBe(8n);
    });

    it("getState returns valid snapshot", async () => {
      await adapter.load(createAddProgram(), addState);
      const state = await adapter.getState();
      expect(state.pc).toBe(0);
      expect(state.gas).toBe(10000n);
      expect(state.status).toBe("ok");
      expect(state.registers.length).toBe(13);
    });

    it("setRegisters rejects indices >= 13", async () => {
      await adapter.load(createAddProgram(), addState);
      await expect(adapter.setRegisters(new Map([[13, 1n]]))).rejects.toThrow(
        "Invalid register index: 13",
      );
    });

    it("setRegisters applies partial updates", async () => {
      await adapter.load(createAddProgram(), addState);
      await adapter.setRegisters(new Map([[0, 999n]]));
      const state = await adapter.getState();
      expect(state.registers[0]).toBe(999n);
      expect(state.registers[7]).toBe(5n); // Unchanged
    });

    it("setPc and setGas work", async () => {
      await adapter.load(createAddProgram(), addState);
      await adapter.setPc(42);
      await adapter.setGas(12345n);
      const state = await adapter.getState();
      expect(state.pc).toBe(42);
      expect(state.gas).toBe(12345n);
    });

    it("reset works", async () => {
      await adapter.load(createAddProgram(), addState);
      await adapter.step(100);
      await adapter.reset();
      const state = await adapter.getState();
      expect(state.status).toBe("ok");
    });
  });

  describe("with Ananas", () => {
    let adapter: DirectAdapter;

    beforeAll(async () => {
      const api = await initAnanas();
      adapter = new DirectAdapter(
        "an-1",
        "Ananas",
        new AnanasSyncInterpreter(api),
      );
    });

    it("executes ADD_32 correctly", async () => {
      await adapter.load(createAddProgram(), addState);
      await adapter.step(1);
      const state = await adapter.getState();
      expect(state.registers[0]).toBe(8n);
    });
  });
});

// ===== WorkerBridge =====
describe("WorkerBridge", () => {
  function createMockWorker(interpreter: TypeberrySyncInterpreter) {
    const handler = createWorkerCommandHandler(interpreter);
    type Listener = (event: { data: WorkerResponse }) => void;
    const listeners: Listener[] = [];
    return {
      postMessage(data: WorkerRequest) {
        setTimeout(() => {
          const response = handler(data);
          for (const listener of listeners) listener({ data: response });
        }, 0);
      },
      addEventListener(_type: "message", listener: Listener) {
        listeners.push(listener);
      },
      removeEventListener(_type: "message", listener: Listener) {
        const idx = listeners.indexOf(listener);
        if (idx >= 0) listeners.splice(idx, 1);
      },
    };
  }

  it("load + step + getState via worker protocol", async () => {
    const worker = createMockWorker(new TypeberrySyncInterpreter());
    const bridge = new WorkerBridge("wb-1", "WB-Typeberry", worker);
    await bridge.load(createAddProgram(), addState);
    await bridge.step(1);
    const state = await bridge.getState();
    expect(state.registers[0]).toBe(8n);
    await bridge.shutdown();
  });

  it("setPc sends real command through worker", async () => {
    const worker = createMockWorker(new TypeberrySyncInterpreter());
    const bridge = new WorkerBridge("wb-2", "WB-Typeberry", worker);
    await bridge.load(createAddProgram(), addState);
    await bridge.setPc(42);
    const state = await bridge.getState();
    expect(state.pc).toBe(42);
    await bridge.shutdown();
  });

  it("setGas sends real command through worker", async () => {
    const worker = createMockWorker(new TypeberrySyncInterpreter());
    const bridge = new WorkerBridge("wb-3", "WB-Typeberry", worker);
    await bridge.load(createAddProgram(), addState);
    await bridge.setGas(99999n);
    const state = await bridge.getState();
    expect(state.gas).toBe(99999n);
    await bridge.shutdown();
  });

  it("setRegisters validates indices and sends full buffer", async () => {
    const worker = createMockWorker(new TypeberrySyncInterpreter());
    const bridge = new WorkerBridge("wb-4", "WB-Typeberry", worker);
    await bridge.load(createAddProgram(), addState);
    await expect(bridge.setRegisters(new Map([[13, 1n]]))).rejects.toThrow(
      "Invalid register index: 13",
    );
    await bridge.setRegisters(new Map([[0, 777n]]));
    const state = await bridge.getState();
    expect(state.registers[0]).toBe(777n);
    expect(state.registers[7]).toBe(5n);
    await bridge.shutdown();
  });

  it("getMemory and setMemory work through worker protocol", async () => {
    const worker = createMockWorker(new TypeberrySyncInterpreter());
    const bridge = new WorkerBridge("wb-5", "WB-Typeberry", worker);
    await bridge.load(createStoreProgram(), storeState);
    // Read from the writable page (should not throw)
    const mem = await bridge.getMemory(131072, 4);
    expect(mem).toBeInstanceOf(Uint8Array);
    expect(mem.length).toBe(4);
    // Write to memory
    await bridge.setMemory(131072, new Uint8Array([0xaa, 0xbb]));
    const mem2 = await bridge.getMemory(131072, 2);
    expect(mem2[0]).toBe(0xaa);
    expect(mem2[1]).toBe(0xbb);
    await bridge.shutdown();
  });

  it("reset via worker protocol restores initial state", async () => {
    const worker = createMockWorker(new TypeberrySyncInterpreter());
    const bridge = new WorkerBridge("wb-6", "WB-Typeberry", worker);
    await bridge.load(createAddProgram(), addState);
    await bridge.step(1);
    const afterStep = await bridge.getState();
    expect(afterStep.registers[0]).toBe(8n);

    await bridge.reset();
    const afterReset = await bridge.getState();
    expect(afterReset.status).toBe("ok");
    expect(afterReset.registers[0]).toBe(0n); // Back to initial
    await bridge.shutdown();
  });

  it("rejects stalled commands with TimeoutError", async () => {
    const silentWorker = {
      postMessage() {},
      addEventListener() {},
      removeEventListener() {},
    };
    const bridge = new WorkerBridge("wb-timeout", "Timeout", silentWorker, 50);
    await expect(bridge.step(1)).rejects.toThrow(TimeoutError);
  });
});

// ===== installWorkerEntry =====
describe("installWorkerEntry", () => {
  it("installs onmessage handler that processes commands", () => {
    const interpreter = new TypeberrySyncInterpreter();
    const responses: WorkerResponse[] = [];
    const mockSelf = {
      onmessage: null as ((event: { data: WorkerRequest }) => void) | null,
      postMessage(data: WorkerResponse) {
        responses.push(data);
      },
    };
    installWorkerEntry(mockSelf, interpreter);
    expect(mockSelf.onmessage).not.toBeNull();

    const program = createAddProgram();
    mockSelf.onmessage!({
      data: {
        type: "load",
        messageId: "1",
        program,
        initialState: serializeInitialState(addState),
      },
    });
    expect(responses.length).toBe(1);
    expect(responses[0].type).toBe("ok");

    mockSelf.onmessage!({ data: { type: "step", messageId: "2", n: 1 } });
    expect(responses.length).toBe(2);
    expect(responses[1].type).toBe("ok");
  });
});

// ===== Worker entry error handling =====
describe("createWorkerCommandHandler error handling", () => {
  it("returns error response when interpreter throws", () => {
    const interpreter = new TypeberrySyncInterpreter();
    const handler = createWorkerCommandHandler(interpreter);
    // Trying to reset before loading should throw
    const response = handler({ type: "reset", messageId: "err-1" });
    expect(response.type).toBe("error");
    if (response.type === "error") {
      expect(response.message).toContain("Cannot reset");
    }
  });
});

// ===== SPI loads =====
describe("SPI loads", () => {
  it("Typeberry handles SPI .jam load with loadContext", () => {
    const jamBytes = readFixture("add.jam");
    const interpreter = new TypeberrySyncInterpreter();
    const state: InitialMachineState = {
      pc: 5,
      gas: 1_000_000n,
      registers: zeroRegs,
      pageMap: [],
      memoryChunks: [],
    };
    const loadContext: ProgramLoadContext = {
      spiProgram: { program: jamBytes, hasMetadata: true },
      spiArgs: new Uint8Array([]),
    };
    interpreter.load(jamBytes, state, loadContext);
    const status = mapStatus(interpreter.getStatus());
    expect(["ok", "halt", "panic", "fault", "host", "out_of_gas"]).toContain(
      status,
    );
  });

  it("Ananas handles SPI .jam load with loadContext", async () => {
    const jamBytes = readFixture("add.jam");
    const api = await initAnanas();
    const interpreter = new AnanasSyncInterpreter(api);
    const state: InitialMachineState = {
      pc: 5,
      gas: 1_000_000n,
      registers: zeroRegs,
      pageMap: [],
      memoryChunks: [],
    };
    const loadContext: ProgramLoadContext = {
      spiProgram: { program: jamBytes, hasMetadata: true },
      spiArgs: new Uint8Array([]),
    };
    interpreter.load(jamBytes, state, loadContext);
    const status = mapStatus(interpreter.getStatus());
    expect(["ok", "halt", "panic", "fault", "host", "out_of_gas"]).toContain(
      status,
    );
  });

  it("Ananas reset restores full SPI load context", async () => {
    const jamBytes = readFixture("add.jam");
    const api = await initAnanas();
    const interpreter = new AnanasSyncInterpreter(api);
    const state: InitialMachineState = {
      pc: 5,
      gas: 1_000_000n,
      registers: zeroRegs,
      pageMap: [],
      memoryChunks: [],
    };
    const loadContext: ProgramLoadContext = {
      spiProgram: { program: jamBytes, hasMetadata: true },
      spiArgs: new Uint8Array([]),
    };

    interpreter.load(jamBytes, state, loadContext);
    interpreter.step(10);
    const regs1 = uint8ToRegs(interpreter.getRegisters());
    const gas1 = interpreter.getGas();
    const status1 = interpreter.getStatus();

    interpreter.reset();
    interpreter.step(10);
    const regs2 = uint8ToRegs(interpreter.getRegisters());
    const gas2 = interpreter.getGas();
    const status2 = interpreter.getStatus();

    expect(regs1).toEqual(regs2);
    expect(gas1).toBe(gas2);
    expect(status1).toBe(status2);
  });
});
