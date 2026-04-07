import type {
  InitialMachineState,
  LoadSourceKind,
  ProgramEnvelope,
} from "@pvmdbg/types";
import { encodePvmBlob } from "@pvmdbg/types";
import { ProgramDecoder } from "@typeberry/lib/pvm-interpreter";

const DEFAULT_GAS = 1_000_000n;
const REGISTER_COUNT = 13;

/** Build default initial state with optional overrides. */
export function buildGenericInitialState(
  overrides?: Partial<InitialMachineState>,
): InitialMachineState {
  return {
    pc: overrides?.pc ?? 0,
    gas: overrides?.gas ?? DEFAULT_GAS,
    registers:
      overrides?.registers ??
      Array.from<bigint>({ length: REGISTER_COUNT }).fill(0n),
    pageMap: overrides?.pageMap ?? [],
    memoryChunks: overrides?.memoryChunks ?? [],
  };
}

/**
 * Convert bytes to a PVM blob. If the bytes are already a valid blob
 * (e.g. from the reference example programs), use them as-is.
 * Otherwise wrap raw instruction bytes with encodePvmBlob.
 */
function toBlobBytes(bytes: Uint8Array): Uint8Array {
  const result = ProgramDecoder.deblob(bytes);
  if (result.isOk) {
    return bytes;
  }
  return encodePvmBlob(bytes);
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
    programBytes: toBlobBytes(bytes),
    initialState: buildGenericInitialState(overrides),
    sourceMeta: { sourceKind, sourceId },
  };
}
