import type { ProgramEnvelope, LoadSourceKind, ExpectedState, PageMapEntry, MemoryChunk } from "@pvmdbg/types";
import type { JsonTestVector } from "./detect.js";

/** Decode a JSON test vector into a ProgramEnvelope. */
export function decodeJsonTestVector(
  data: JsonTestVector,
  sourceKind: LoadSourceKind,
  sourceId: string,
): ProgramEnvelope {
  const programBytes = Uint8Array.from(data.program);

  const pageMap: PageMapEntry[] = (data["initial-page-map"] ?? []).map((p) => ({
    address: p.address,
    length: p.length,
    isWritable: p["is-writable"],
  }));

  const memoryChunks: MemoryChunk[] = (data["initial-memory"] ?? []).map((m) => ({
    address: m.address,
    data: Uint8Array.from(m.contents),
  }));

  const expectedMemory: Array<{ address: number; data: Uint8Array }> =
    (data["expected-memory"] ?? []).map((m) => ({
      address: m.address,
      data: Uint8Array.from(m.contents),
    }));

  const expectedState: ExpectedState | undefined =
    data["expected-status"] !== undefined
      ? {
          status: data["expected-status"],
          pc: data["expected-pc"] ?? 0,
          gas: BigInt(data["expected-gas"] ?? 0),
          registers: (data["expected-regs"] ?? []).map(BigInt),
          memory: expectedMemory,
        }
      : undefined;

  return {
    programKind: "generic",
    programBytes,
    initialState: {
      pc: data["initial-pc"] ?? 0,
      gas: BigInt(data["initial-gas"] ?? 1_000_000),
      registers: data["initial-regs"].map(BigInt),
      pageMap,
      memoryChunks,
    },
    expectedState,
    sourceMeta: { sourceKind, sourceId },
  };
}
