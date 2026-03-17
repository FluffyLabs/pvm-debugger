/**
 * Formatting utilities for PVM machine state values.
 *
 * - Registers: hex (at least 16 digits) plus decimal, always together
 * - PC: hex only, zero-padded, width expands past 4 digits as needed
 * - Gas: decimal with thousands separators
 * - Lifecycle/status: user-facing labels and badge info
 */

import type { PvmLifecycle, PvmStatus } from "@pvmdbg/types";

/** Format a register value as "0x{hex} ({decimal})". Hex is at least 16 digits. */
export function formatRegister(value: bigint): { hex: string; decimal: string } {
  // Mask to unsigned 64-bit range
  const unsigned = BigInt.asUintN(64, value);
  const hex = "0x" + unsigned.toString(16).padStart(16, "0");
  const decimal = unsigned.toString(10);
  return { hex, decimal };
}

/** Format PC as zero-padded hex. Minimum 4 digits, expands as needed. */
export function formatPc(pc: number): string {
  const hexStr = pc.toString(16).toUpperCase();
  const width = Math.max(4, hexStr.length);
  return hexStr.padStart(width, "0");
}

/** Format gas as decimal with thousands separators. */
export function formatGas(gas: bigint): string {
  const str = gas.toString(10);
  // Insert commas from right to left
  const parts: string[] = [];
  for (let i = str.length; i > 0; i -= 3) {
    const start = Math.max(0, i - 3);
    parts.unshift(str.slice(start, i));
  }
  return parts.join(",");
}

/** Map PvmLifecycle (+ PvmStatus for terminal states) to a user-facing label. */
export function lifecycleLabel(lifecycle: PvmLifecycle, status?: PvmStatus): string {
  switch (lifecycle) {
    case "paused":
      return "OK";
    case "running":
      return "Running";
    case "paused_host_call":
      return "Host Call";
    case "terminated":
      switch (status) {
        case "halt":
          return "Halt";
        case "panic":
          return "Panic";
        case "fault":
          return "Fault";
        case "out_of_gas":
          return "Out of Gas";
        default:
          return "Terminated";
      }
    case "failed":
      return "Error";
    case "timed_out":
      return "Timeout";
  }
}
