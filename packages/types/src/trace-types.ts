export interface TracePrelude {
  programHex: string;
  memoryWrites: Array<{ address: number; dataHex: string }>;
  startPc: number;
  startGas: bigint;
  startRegisters: Map<number, bigint>;
}

export interface TraceEntry {
  index: number;
  pc: number;
  gas: bigint;
  registers: Map<number, bigint>;
  memoryReads: Array<{ address: number; length: number; dataHex: string }>;
  memoryWrites: Array<{ address: number; dataHex: string }>;
  registerWrites: Map<number, bigint>;
  gasAfter?: bigint;
}

export interface TraceTermination {
  kind: "halt" | "panic" | "fault" | "oog";
  arg?: number;
  pc: number;
  gas: bigint;
  registers: Map<number, bigint>;
}

export interface EcalliTrace {
  prelude: TracePrelude;
  entries: TraceEntry[];
  termination?: TraceTermination;
}
