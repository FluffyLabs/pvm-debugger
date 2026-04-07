import { fromHex } from "@pvmdbg/types";

/** Sentinel value for NONE return: 2^64 - 1. */
export const NONE = (1n << 64n) - 1n;

/** Effects reported by a host-call handler. */
export interface HostCallEffects {
  registerWrites: Map<number, bigint>;
  memoryWrites: Array<{ address: number; data: Uint8Array }>;
  gasAfter?: bigint;
}

/** Display format for a register value. */
export type RegisterFormat = "hex" | "decimal" | "custom";

/** Format a register value according to the given format. */
export function formatRegValue(value: bigint, format: RegisterFormat): string {
  switch (format) {
    case "hex":
      return "0x" + value.toString(16);
    case "decimal":
      return value.toString();
    case "custom":
      return value.toString();
  }
}

/**
 * Convert user-entered hex to bytes. Falls back to empty on invalid input.
 * Pads odd-length input with a leading zero for UX tolerance.
 */
export function safeFromHex(hex: string): Uint8Array {
  try {
    let clean =
      hex.startsWith("0x") || hex.startsWith("0X") ? hex.slice(2) : hex;
    if (clean.length % 2 === 1) clean = "0" + clean;
    return fromHex("0x" + clean);
  } catch {
    return new Uint8Array(0);
  }
}

/**
 * Compute the full fetch host call effects from the response blob.
 *
 * Implements: slice by offset/maxLen, set ω₇ = totalLength (or NONE),
 * produce memory write at destAddr.
 *
 * @param fullBlob - The full response blob for this fetch kind
 * @param isNone - If true, the response is ⊥ (NONE)
 * @param destAddr - Destination memory address (ω₇ register value)
 * @param offset - Offset into the full blob (ω₈)
 * @param maxLen - Maximum bytes to write (ω₉)
 */
export function computeFetchEffects(
  fullBlob: Uint8Array,
  isNone: boolean,
  destAddr: number,
  offset: number,
  maxLen: number,
): HostCallEffects {
  if (isNone) {
    return {
      registerWrites: new Map([[7, NONE]]),
      memoryWrites: [],
    };
  }

  const totalLen = fullBlob.length;
  const sliceStart = Math.min(offset, totalLen);
  const sliceEnd = Math.min(offset + maxLen, totalLen);
  const sliced = fullBlob.slice(sliceStart, sliceEnd);

  return {
    registerWrites: new Map([[7, BigInt(totalLen)]]),
    memoryWrites:
      sliced.length > 0 ? [{ address: destAddr, data: sliced }] : [],
  };
}
