import type { InitialMachineState } from "./machine-state.js";
import type { EcalliTrace } from "./trace-types.js";

export interface SpiProgram {
  program: Uint8Array;
  hasMetadata: boolean;
}

export interface ProgramLoadContext {
  spiProgram?: SpiProgram;
  spiArgs?: Uint8Array;
}

export interface ExpectedState {
  status: string;
  pc: number;
  gas: bigint;
  registers: bigint[];
  memory: Array<{ address: number; data: Uint8Array }>;
}

export type SpiEntrypoint = "refine" | "accumulate" | "is_authorized";

export type LoadSourceKind = "example" | "url_payload" | "local_storage" | "upload" | "manual_input";

export interface ProgramEnvelope {
  programKind: "generic" | "jam_spi";
  programBytes: Uint8Array;
  initialState: InitialMachineState;
  metadata?: Uint8Array;
  spiEntrypoint?: SpiEntrypoint;
  loadContext?: ProgramLoadContext;
  trace?: EcalliTrace;
  expectedState?: ExpectedState;
  sourceMeta: { sourceKind: LoadSourceKind; sourceId: string };
}
