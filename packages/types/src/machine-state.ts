import type { PvmStatus } from "./pvm-status.js";

export interface InitialMachineState {
  pc: number;
  gas: bigint;
  registers: bigint[];
  pageMap: PageMapEntry[];
  memoryChunks: MemoryChunk[];
}

export interface PageMapEntry {
  address: number;
  length: number;
  isWritable: boolean;
}

export interface MemoryChunk {
  address: number;
  data: Uint8Array;
}

export interface MachineStateSnapshot {
  pc: number;
  gas: bigint;
  status: PvmStatus;
  registers: bigint[];
}
