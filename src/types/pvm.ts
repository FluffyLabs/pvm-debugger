import { RegistersArray } from "@/pvm-packages/pvm/pvm";

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

export type ExpectedState = InitialState & {
  status: "trap" | "halt";
};
