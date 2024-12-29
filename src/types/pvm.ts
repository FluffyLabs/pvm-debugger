import { Args } from "@typeberry/pvm-debugger-adapter";
export { Pvm } from "@typeberry/pvm-debugger-adapter";

type GrowToSize<T, N extends number, A extends T[]> = A["length"] extends N ? A : GrowToSize<T, N, [...A, T]>;
type FixedArray<T, N extends number> = GrowToSize<T, N, []>;

export type RegistersArray = FixedArray<bigint, 13>;

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
  OOG = 4 /* out of gas */,
}

export type ExpectedState = InitialState & {
  status?: Status;
};

export type Block = {
  isStart: boolean;
  isEnd: boolean;
  name: string;
  number: number;
};

export type CurrentInstruction =
  | {
      address: number;
      args: Args;
      name: string;
      gas: number;
      block: Block;
      instructionCode: number;
      instructionBytes: Uint8Array;
    }
  | {
      address: number;
      error: string;
      name: string;
      gas: number;
      block: Block;
      instructionCode: number;
    };

export enum AvailablePvms {
  TYPEBERRY = "typeberry",
  POLKAVM = "polkavm",
  ANANAS = "ananas",
  WASM_URL = "wasm-url",
  WASM_FILE = "wasm-file",
}

export type decodeStandardProgram = (program: number[]) => CurrentInstruction;
