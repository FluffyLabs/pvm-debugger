import type { PvmStatus } from "@pvmdbg/types";

const STATUS_MAP: Record<number, PvmStatus> = {
  255: "ok",
  0: "halt",
  1: "panic",
  2: "fault",
  3: "host",
  4: "out_of_gas",
};

/** Map a numeric PVM status code to the canonical PvmStatus string. Throws on unknown codes. */
export function mapStatus(code: number): PvmStatus {
  const status = STATUS_MAP[code];
  if (status === undefined) {
    throw new Error(`Unknown PVM status code: ${code}`);
  }
  return status;
}
