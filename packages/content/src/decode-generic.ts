import type { InitialMachineState, ProgramEnvelope, LoadSourceKind } from "@pvmdbg/types";
import { encodePvmBlob } from "@pvmdbg/types";

const DEFAULT_GAS = 1_000_000n;
const REGISTER_COUNT = 13;

/** Build default initial state with optional overrides. */
export function buildGenericInitialState(
  overrides?: Partial<InitialMachineState>,
): InitialMachineState {
  return {
    pc: overrides?.pc ?? 0,
    gas: overrides?.gas ?? DEFAULT_GAS,
    registers: overrides?.registers ?? Array.from<bigint>({ length: REGISTER_COUNT }).fill(0n),
    pageMap: overrides?.pageMap ?? [],
    memoryChunks: overrides?.memoryChunks ?? [],
  };
}

/** Decode raw bytes as a generic PVM program with optional state overrides. */
export function decodeGeneric(
  bytes: Uint8Array,
  sourceKind: LoadSourceKind,
  sourceId: string,
  overrides?: Partial<InitialMachineState>,
): ProgramEnvelope {
  return {
    programKind: "generic",
    programBytes: encodePvmBlob(bytes),
    initialState: buildGenericInitialState(overrides),
    sourceMeta: { sourceKind, sourceId },
  };
}
