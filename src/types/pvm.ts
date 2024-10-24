import { Args } from "@typeberry/pvm-debugger-adapter";

type GrowToSize<T, N extends number, A extends T[]> = A["length"] extends N ? A : GrowToSize<T, N, [...A, T]>;
type FixedArray<T, N extends number> = GrowToSize<T, N, []>;

export type RegistersArray = FixedArray<number, 13>;

export type InitialState = {
  regs?: RegistersArray;
  pc?: number;
  pageMap?: PageMapItem[];
  memory?: MemoryChunkItem[];
  gas?: number;
};

export type MemoryChunkItem = {
  address: number;
  contents: Uint8Array;
};

export type PageMapItem = {
  address: number;
  length: number;
  "is-writable": boolean;
};

export enum Status {
  OK = -1,
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
  getRegisters: () => number[];
  getPC: () => number;
  getGas: () => number;
  getStatus: () => Status;
  getMemoryPage: (pageNumber: number) => Uint8Array | null;
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
