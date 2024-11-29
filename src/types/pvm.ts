import { Args, Memory, Registers } from "@typeberry/pvm-debugger-adapter";

type GrowToSize<T, N extends number, A extends T[]> = A["length"] extends N ? A : GrowToSize<T, N, [...A, T]>;
type FixedArray<T, N extends number> = GrowToSize<T, N, []>;

export type RegistersArray = FixedArray<number, 13>;

export type InitialState = {
  regs?: RegistersArray;
  pc?: number;
  pageMap?: PageMapItem[];
  memory?: MemoryChunkItem[];
  gas?: bigint;
};

export type MemoryChunkItem = {
  address: number;
  contents: number[];
};

export type PageMapItem = {
  address: number;
  length: number;
  "is-writable": boolean;
};

export enum Status {
  OK = 255,
  HALT = 0,
  PANIC = 1,
  FAULT = 2,
  HOST = 3,
  OUT_OF_GAS = 4,
}

export type ExpectedState = InitialState & {
  status?: Status;
};

export type Pvm = {
  nextStep: () => Status;
  getRegisters: () => Uint32Array;
  getPC: () => number;
  getGas: () => bigint;
  getStatus: () => Status;
  getMemoryPage: (pageNumber: number) => Uint8Array | null;
  setNextPC(nextPc: number): void;
  setGasLeft(gas: bigint): void;
  reset(program: Uint8Array, pc: number, gas: bigint, registers: Registers, memory: Memory): void;
};

export type CurrentInstruction =
  | {
      address: number;
      args: Args;
      name: string;
      gas: number;
      instructionCode: number;
      instructionBytes: Uint8Array;
    }
  | {
      address: number;
      error: string;
      name: string;
      gas: number;
      instructionCode: number;
    };

export enum AvailablePvms {
  TYPEBERRY = "typeberry",
  POLKAVM = "polkavm",
  WASM_URL = "wasm-url",
  WASM_FILE = "wasm-file",
}

export type decodeStandardProgram = (program: number[]) => CurrentInstruction;
