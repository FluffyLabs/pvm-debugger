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
    let clean = hex.startsWith("0x") || hex.startsWith("0X") ? hex.slice(2) : hex;
    if (clean.length % 2 === 1) clean = "0" + clean;
    return fromHex("0x" + clean);
  } catch {
    return new Uint8Array(0);
  }
}
