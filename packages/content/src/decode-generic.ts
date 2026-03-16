import type { InitialMachineState, ProgramEnvelope, LoadSourceKind } from "@pvmdbg/types";
import { encodeVarU32 } from "@pvmdbg/types";

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

/**
 * Wrap raw instruction bytes into a PVM program blob.
 *
 * PVM blob format:
 * 1. jumpTableLength (varU32) — 0 for generic programs
 * 2. jumpTableItemLength (u8) — 0
 * 3. codeLength (varU32)
 * 4. code bytes
 * 5. mask (bitVecFixLen(codeLength)) — marks byte 0 as instruction start
 */
function wrapInPvmBlob(code: Uint8Array): Uint8Array {
  const codeLength = code.length;
  const maskByteLength = Math.ceil(codeLength / 8);

  const mask = new Uint8Array(maskByteLength);
  if (codeLength > 0) {
    mask[0] = 1; // byte 0 is an instruction start
  }

  const jtLenBytes = encodeVarU32(0);
  const jtItemLenByte = new Uint8Array([0]);
  const codeLenBytes = encodeVarU32(codeLength);

  const totalLength = jtLenBytes.length + jtItemLenByte.length + codeLenBytes.length + codeLength + maskByteLength;
  const blob = new Uint8Array(totalLength);
  let offset = 0;

  blob.set(jtLenBytes, offset); offset += jtLenBytes.length;
  blob.set(jtItemLenByte, offset); offset += jtItemLenByte.length;
  blob.set(codeLenBytes, offset); offset += codeLenBytes.length;
  blob.set(code, offset); offset += codeLength;
  blob.set(mask, offset);

  return blob;
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
    programBytes: wrapInPvmBlob(bytes),
    initialState: buildGenericInitialState(overrides),
    sourceMeta: { sourceKind, sourceId },
  };
}
