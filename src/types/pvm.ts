import { Result } from "@/packages/pvm/pvm/args-decoder/args-decoder";

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
  OK = 0,
  HALT = 1,
  PANIC = 2,
  OUT_OF_GAS = 3,
}
export type ExpectedState = InitialState & {
  status?: Status;
};

export type Pvm = {
  printProgram: () => void;
  runProgram: () => void;
  nextStep: () => Status;
  getRegisters: () => RegistersArray;
  getMemory: () => MemoryChunkItem[];
  getPC: () => number;
  getGas: () => number;
  getStatus: () => Status;
  getMemoryPage: (pageNumber: number) => MemoryChunkItem | null;
};

export type Args = Result;

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
