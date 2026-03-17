import type {
  ProgramEnvelope,
  LoadSourceKind,
  PageMapEntry,
  MemoryChunk,
} from "@pvmdbg/types";
import { decodeVarU32 } from "@pvmdbg/types";
import * as pvm from "@typeberry/lib/pvm-interpreter";

const PAGE_SIZE = 4096;
const DEFAULT_GAS = 1_000_000n;

function pageAlignUp(v: number): number {
  return (((v + PAGE_SIZE - 1) >>> 12) << 12) >>> 0;
}

/** Convert SPI memory segments to page map entries. */
function segmentsToPageMap(
  segments: pvm.spi.MemorySegment[],
  isWritable: boolean,
): PageMapEntry[] {
  const entries: PageMapEntry[] = [];
  for (const seg of segments) {
    const pageStart = seg.start - (seg.start % PAGE_SIZE);
    const pageEnd = pageAlignUp(seg.end);
    for (let addr = pageStart; addr < pageEnd; addr += PAGE_SIZE) {
      entries.push({
        address: addr,
        length: Math.min(PAGE_SIZE, pageEnd - addr),
        isWritable,
      });
    }
  }
  return entries;
}

/** Convert SPI memory segments to memory chunks, split at page boundaries. */
function segmentsToChunks(segments: pvm.spi.MemorySegment[]): MemoryChunk[] {
  const chunks: MemoryChunk[] = [];
  for (const seg of segments) {
    if (seg.data === null) continue;
    let data = seg.data;
    let address = seg.start;
    while (data.length > 0) {
      const pageOffset = address % PAGE_SIZE;
      const lenForPage = PAGE_SIZE - pageOffset;
      const sliceLen = Math.min(data.length, lenForPage);
      chunks.push({
        address,
        data: data.subarray(0, sliceLen),
      });
      data = data.subarray(sliceLen);
      address += sliceLen;
    }
  }
  return chunks;
}

/** Deduplicate page map entries by address, keeping the first occurrence. */
function deduplicatePageMap(entries: PageMapEntry[]): PageMapEntry[] {
  const seen = new Set<number>();
  return entries.filter((e) => {
    if (seen.has(e.address)) return false;
    seen.add(e.address);
    return true;
  });
}

/** Convert BigUint64Array registers to bigint[]. */
function registersToArray(regs: BigUint64Array): bigint[] {
  return Array.from({ length: 13 }, (_, i) => BigInt(regs[i] ?? 0n));
}

export interface SpiDecodeResult {
  code: Uint8Array;
  memory: pvm.spi.SpiMemory;
  registers: BigUint64Array;
  metadata?: Uint8Array;
  jumpTableEntryCount: number;
}

/** Strip varU32 metadata prefix and return metadata + SPI payload. */
export function stripMetadata(blob: Uint8Array): { metadata: Uint8Array; spiPayload: Uint8Array } {
  const { value: metaLen, bytesRead } = decodeVarU32(blob, 0);
  const totalHeaderLen = bytesRead + metaLen;
  if (totalHeaderLen > blob.length) {
    throw new Error(`Metadata length ${metaLen} exceeds blob size ${blob.length}`);
  }
  return {
    metadata: blob.subarray(bytesRead, totalHeaderLen),
    spiPayload: blob.subarray(totalHeaderLen),
  };
}

/** Try SPI decode, optionally stripping metadata first. */
export function tryDecodeSpi(
  blob: Uint8Array,
  args: Uint8Array,
  withMetadata: boolean,
): SpiDecodeResult {
  let spiPayload = blob;
  let metadata: Uint8Array | undefined;

  if (withMetadata) {
    const result = stripMetadata(blob);
    spiPayload = result.spiPayload;
    metadata = result.metadata;
  }

  const program = pvm.spi.decodeStandardProgram(spiPayload, args);

  // Extract jump table entry count from the decoded code blob
  let jumpTableEntryCount = 0;
  const deblobResult = pvm.ProgramDecoder.deblob(program.code);
  if (deblobResult.isOk) {
    jumpTableEntryCount = deblobResult.ok.getJumpTable().getSize();
  }

  return {
    code: program.code,
    memory: program.memory,
    registers: program.registers,
    metadata,
    jumpTableEntryCount,
  };
}

/** Decode SPI bytes (with or without metadata) into a ProgramEnvelope. */
export function decodeSpi(
  rawBytes: Uint8Array,
  spiArgs: Uint8Array,
  hasMetadata: boolean,
  sourceKind: LoadSourceKind,
  sourceId: string,
  options?: {
    pc?: number;
    gas?: bigint;
    registerOverrides?: Map<number, bigint>;
  },
): ProgramEnvelope {
  const decoded = tryDecodeSpi(rawBytes, spiArgs, hasMetadata);
  const { code, memory, registers, metadata, jumpTableEntryCount } = decoded;

  const readablePages = segmentsToPageMap(memory.readable, false);
  const writeablePages = segmentsToPageMap(memory.writeable, true);
  const pageMap = deduplicatePageMap([...readablePages, ...writeablePages]);

  const readableChunks = segmentsToChunks(memory.readable);
  const writeableChunks = segmentsToChunks(memory.writeable);
  const memoryChunks = [...readableChunks, ...writeableChunks];

  const regs = registersToArray(registers);

  // Apply register overrides if provided
  if (options?.registerOverrides) {
    for (const [idx, val] of options.registerOverrides) {
      if (idx >= 0 && idx < regs.length) {
        regs[idx] = val;
      }
    }
  }

  return {
    programKind: "jam_spi",
    programBytes: code,
    initialState: {
      pc: options?.pc ?? 5,
      gas: options?.gas ?? DEFAULT_GAS,
      registers: regs,
      pageMap,
      memoryChunks,
    },
    metadata,
    jumpTableEntryCount,
    loadContext: {
      spiProgram: {
        program: rawBytes,
        hasMetadata,
      },
      spiArgs,
    },
    sourceMeta: { sourceKind, sourceId },
  };
}
