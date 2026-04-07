import type {
  InitialMachineState,
  MemoryChunk,
  PageMapEntry,
} from "@pvmdbg/types";
import {
  bigintToDecStr,
  decStrToBigint,
  regsToUint8,
  uint8ToRegs,
} from "@pvmdbg/types";

export { regsToUint8, uint8ToRegs };

const PAGE_SIZE = 4096; // 2^12

/**
 * Read a contiguous memory range using page-based getPageDump.
 * Pages are 4096 bytes each. Handles cross-page reads.
 */
export function getMemoryRange(
  getPageDump: (pageNumber: number) => Uint8Array | null,
  address: number,
  length: number,
): Uint8Array {
  if (length === 0) return new Uint8Array(0);

  const result = new Uint8Array(length);
  let bytesRead = 0;
  let currentAddress = address;

  while (bytesRead < length) {
    const pageNumber = Math.floor(currentAddress / PAGE_SIZE);
    const offsetInPage = currentAddress % PAGE_SIZE;
    const bytesInThisPage = Math.min(
      PAGE_SIZE - offsetInPage,
      length - bytesRead,
    );

    const page = getPageDump(pageNumber);
    if (page !== null) {
      result.set(
        page.subarray(offsetInPage, offsetInPage + bytesInThisPage),
        bytesRead,
      );
    }
    // If page is null, the bytes remain as zeros

    bytesRead += bytesInThisPage;
    currentAddress += bytesInThisPage;
  }

  return result;
}

/** Serialized form of InitialMachineState for transfer across worker boundary. */
export interface SerializedInitialMachineState {
  pc: number;
  gas: string; // decimal string
  registers: string[]; // decimal strings
  pageMap: PageMapEntry[];
  memoryChunks: Array<{ address: number; data: Uint8Array }>;
}

/** Serialize InitialMachineState for worker transfer (bigints → decimal strings). */
export function serializeInitialState(
  state: InitialMachineState,
): SerializedInitialMachineState {
  return {
    pc: state.pc,
    gas: bigintToDecStr(state.gas),
    registers: state.registers.map(bigintToDecStr),
    pageMap: state.pageMap,
    memoryChunks: state.memoryChunks.map((c) => ({
      address: c.address,
      data: c.data,
    })),
  };
}

/** Deserialize InitialMachineState from worker transfer (decimal strings → bigints). */
export function deserializeInitialState(
  s: SerializedInitialMachineState,
): InitialMachineState {
  return {
    pc: s.pc,
    gas: decStrToBigint(s.gas),
    registers: s.registers.map(decStrToBigint),
    pageMap: s.pageMap,
    memoryChunks: s.memoryChunks.map(
      (c: { address: number; data: Uint8Array }) => ({
        address: c.address,
        data: c.data instanceof Uint8Array ? c.data : new Uint8Array(c.data),
      }),
    ),
  };
}

/** Validate that all register indices in the map are within [0, 13). */
export function validateRegisterIndices(regs: Map<number, bigint>): void {
  for (const idx of regs.keys()) {
    if (idx < 0 || idx >= 13 || !Number.isInteger(idx)) {
      throw new Error(
        `Invalid register index: ${idx}. Must be an integer in [0, 13).`,
      );
    }
  }
}

/** Apply partial register writes to a full 13-register array. */
export function applyRegisterPatch(
  currentRegs: bigint[],
  patch: Map<number, bigint>,
): bigint[] {
  const result = [...currentRegs];
  for (const [idx, value] of patch) {
    result[idx] = value;
  }
  return result;
}
