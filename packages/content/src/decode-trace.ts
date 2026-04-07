import { parseTrace } from "@pvmdbg/trace";
import type {
  LoadSourceKind,
  MemoryChunk,
  PageMapEntry,
  ProgramEnvelope,
} from "@pvmdbg/types";
import { fromHex } from "@pvmdbg/types";
import { buildGenericInitialState, decodeGeneric } from "./decode-generic.js";
import { decodeSpi } from "./decode-spi.js";
import { canDecodeSpi } from "./detect.js";

const PAGE_SIZE = 4096;
const MAX_SPI_ARGS_SIZE = 16 * 1024 * 1024; // 16 MiB

/** Build SPI args from trace prelude memory writes as a contiguous span. */
function buildSpiArgsFromMemoryWrites(
  memoryWrites: Array<{ address: number; dataHex: string }>,
): Uint8Array {
  if (memoryWrites.length === 0) {
    return new Uint8Array();
  }

  const writes = memoryWrites.map((mw) => ({
    address: mw.address,
    data: fromHex(mw.dataHex),
  }));

  const sorted = [...writes].sort((a, b) => a.address - b.address);
  const firstAddr = sorted[0].address;
  const lastWrite = sorted[sorted.length - 1];
  const lastAddr = lastWrite.address + lastWrite.data.length;
  const totalSize = lastAddr - firstAddr;

  if (totalSize > MAX_SPI_ARGS_SIZE) {
    throw new Error(
      `Trace memory span too large: ${totalSize} bytes (max: ${MAX_SPI_ARGS_SIZE})`,
    );
  }

  const result = new Uint8Array(totalSize);
  for (const mw of sorted) {
    const offset = mw.address - firstAddr;
    result.set(mw.data, offset);
  }

  return result;
}

/** Decode a trace file text into a ProgramEnvelope. */
export function decodeTrace(
  text: string,
  sourceKind: LoadSourceKind,
  sourceId: string,
): ProgramEnvelope {
  const trace = parseTrace(text);
  const programBytes = fromHex(trace.prelude.programHex);

  // Build SPI args from prelude memory writes
  let spiArgs: Uint8Array;
  try {
    spiArgs = buildSpiArgsFromMemoryWrites(trace.prelude.memoryWrites);
  } catch {
    spiArgs = new Uint8Array();
  }

  // Try SPI decoding first (with metadata, then without)
  const withMeta = canDecodeSpi(programBytes, true);
  const withoutMeta = !withMeta && canDecodeSpi(programBytes, false);

  if (withMeta || withoutMeta) {
    const envelope = decodeSpi(
      programBytes,
      spiArgs,
      withMeta,
      sourceKind,
      sourceId,
      {
        pc: trace.prelude.startPc,
        gas: trace.prelude.startGas,
        registerOverrides: trace.prelude.startRegisters,
      },
    );
    envelope.trace = trace;
    envelope.loadContext = {
      ...envelope.loadContext,
      spiArgs,
    };
    return envelope;
  }

  // Fallback to generic
  const memoryWrites = trace.prelude.memoryWrites.map((mw) => ({
    address: mw.address,
    data: fromHex(mw.dataHex),
  }));

  // Build page map from memory writes
  const pageMap: PageMapEntry[] = [];
  const seenPages = new Set<number>();
  for (const mw of memoryWrites) {
    const startPage = Math.floor(mw.address / PAGE_SIZE);
    const endAddr = mw.address + mw.data.length;
    const endPage =
      endAddr > 0 ? Math.floor((endAddr - 1) / PAGE_SIZE) : startPage;
    for (let pageIdx = startPage; pageIdx <= endPage; pageIdx++) {
      const pageAddr = pageIdx * PAGE_SIZE;
      if (!seenPages.has(pageAddr)) {
        seenPages.add(pageAddr);
        pageMap.push({
          address: pageAddr,
          length: PAGE_SIZE,
          isWritable: true,
        });
      }
    }
  }

  const memoryChunks: MemoryChunk[] = memoryWrites;

  // Build registers from trace prelude
  const registers = Array.from<bigint>({ length: 13 }).fill(0n);
  for (const [idx, val] of trace.prelude.startRegisters) {
    if (idx >= 0 && idx < registers.length) {
      registers[idx] = val;
    }
  }

  const envelope = decodeGeneric(programBytes, sourceKind, sourceId, {
    pc: trace.prelude.startPc,
    gas: trace.prelude.startGas,
    registers,
    pageMap: pageMap.length > 0 ? pageMap : undefined,
    memoryChunks: memoryChunks.length > 0 ? memoryChunks : undefined,
  });
  envelope.trace = trace;
  envelope.loadContext = { spiArgs };
  return envelope;
}
