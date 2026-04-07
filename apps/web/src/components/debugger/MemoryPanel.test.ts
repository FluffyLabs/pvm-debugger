import type { MemoryChunk, PageMapEntry } from "@pvmdbg/types";
import { describe, expect, it } from "vitest";
import { computeChangedOffsets } from "../../hooks/useMemoryReader";
import { sanitizeHexInput } from "./HexDump";
import {
  computeInitializedPages,
  expandPages,
  getPageLabel,
} from "./MemoryPanel";

describe("expandPages", () => {
  it("returns empty array for empty page map", () => {
    expect(expandPages([])).toEqual([]);
  });

  it("returns single entry for a single 4 KiB page", () => {
    const pageMap: PageMapEntry[] = [
      { address: 0x20000, length: 4096, isWritable: true },
    ];
    expect(expandPages(pageMap)).toEqual([
      { address: 0x20000, isWritable: true },
    ]);
  });

  it("expands multi-page segment into individual 4 KiB pages", () => {
    const pageMap: PageMapEntry[] = [
      { address: 0x10000, length: 12288, isWritable: false },
    ];
    expect(expandPages(pageMap)).toEqual([
      { address: 0x10000, isWritable: false },
      { address: 0x11000, isWritable: false },
      { address: 0x12000, isWritable: false },
    ]);
  });

  it("sorts pages by ascending address across multiple segments", () => {
    const pageMap: PageMapEntry[] = [
      { address: 0x30000, length: 4096, isWritable: true },
      { address: 0x10000, length: 4096, isWritable: false },
    ];
    expect(expandPages(pageMap)).toEqual([
      { address: 0x10000, isWritable: false },
      { address: 0x30000, isWritable: true },
    ]);
  });

  it("deduplicates overlapping segments — writable wins", () => {
    const pageMap: PageMapEntry[] = [
      { address: 0x10000, length: 8192, isWritable: true },
      { address: 0x11000, length: 4096, isWritable: false },
    ];
    const result = expandPages(pageMap);
    expect(result).toEqual([
      { address: 0x10000, isWritable: true },
      { address: 0x11000, isWritable: true },
    ]);
  });

  it("handles sub-page length by rounding up to 1 page", () => {
    const pageMap: PageMapEntry[] = [
      { address: 0x20000, length: 100, isWritable: true },
    ];
    expect(expandPages(pageMap)).toEqual([
      { address: 0x20000, isWritable: true },
    ]);
  });

  it("handles zero-length segment by producing no pages", () => {
    const pageMap: PageMapEntry[] = [
      { address: 0x20000, length: 0, isWritable: true },
    ];
    expect(expandPages(pageMap)).toEqual([]);
  });
});

describe("computeInitializedPages", () => {
  it("returns empty set for no chunks", () => {
    expect(computeInitializedPages([])).toEqual(new Set());
  });

  it("returns page address for a chunk within a single page", () => {
    const chunks: MemoryChunk[] = [
      { address: 0x10010, data: new Uint8Array(100) },
    ];
    expect(computeInitializedPages(chunks)).toEqual(new Set([0x10000]));
  });

  it("returns multiple page addresses for a chunk spanning pages", () => {
    const chunks: MemoryChunk[] = [
      { address: 0x10ff0, data: new Uint8Array(32) }, // spans 0x10000 and 0x11000
    ];
    expect(computeInitializedPages(chunks)).toEqual(
      new Set([0x10000, 0x11000]),
    );
  });

  it("returns empty set for zero-length chunk", () => {
    const chunks: MemoryChunk[] = [
      { address: 0x10000, data: new Uint8Array(0) },
    ];
    expect(computeInitializedPages(chunks)).toEqual(new Set());
  });

  it("handles multiple disjoint chunks", () => {
    const chunks: MemoryChunk[] = [
      { address: 0x10000, data: new Uint8Array(10) },
      { address: 0x30000, data: new Uint8Array(10) },
    ];
    expect(computeInitializedPages(chunks)).toEqual(
      new Set([0x10000, 0x30000]),
    );
  });
});

describe("getPageLabel", () => {
  const emptyInit = new Set<number>();

  it("returns generic label for non-SPI programs", () => {
    expect(getPageLabel(0x20000, true, "generic", emptyInit)).toBe(
      "Page @ 0x20000",
    );
  });

  it("returns Arguments for SPI page at 0xFEFF0000", () => {
    expect(getPageLabel(0xfeff0000, true, "jam_spi", emptyInit)).toBe(
      "Arguments",
    );
  });

  it("returns Stack for SPI pages in 0xFEFE0000..0xFEFF0000 range", () => {
    expect(getPageLabel(0xfefe0000, true, "jam_spi", emptyInit)).toBe("Stack");
    expect(getPageLabel(0xfefef000, true, "jam_spi", emptyInit)).toBe("Stack");
  });

  it("returns RO Data for non-writable SPI pages above 0x10000", () => {
    expect(getPageLabel(0x10000, false, "jam_spi", emptyInit)).toBe("RO Data");
  });

  it("returns RW Data for writable SPI pages backed by chunks", () => {
    const init = new Set([0x20000]);
    expect(getPageLabel(0x20000, true, "jam_spi", init)).toBe("RW Data");
  });

  it("returns Heap for writable SPI pages not backed by chunks", () => {
    expect(getPageLabel(0x20000, true, "jam_spi", emptyInit)).toBe("Heap");
  });

  it("falls back to generic label for SPI non-writable pages below 0x10000", () => {
    expect(getPageLabel(0x5000, false, "jam_spi", emptyInit)).toBe(
      "Page @ 0x5000",
    );
  });

  it("returns Stack not Arguments at 0xFEFEF000 (one page below Arguments)", () => {
    expect(getPageLabel(0xfefef000, true, "jam_spi", emptyInit)).toBe("Stack");
  });
});

describe("sanitizeHexInput", () => {
  it("strips spaces", () => {
    expect(sanitizeHexInput("AB CD")).toBe("ABCD");
  });

  it("strips 0x prefix", () => {
    expect(sanitizeHexInput("0xABCD")).toBe("ABCD");
  });

  it("strips colons, dashes, commas, semicolons", () => {
    expect(sanitizeHexInput("AB:CD-EF,01;23")).toBe("ABCDEF0123");
  });

  it("removes non-hex characters", () => {
    expect(sanitizeHexInput("GHzz12XY")).toBe("12");
  });

  it("handles empty string", () => {
    expect(sanitizeHexInput("")).toBe("");
  });

  it("handles multiple 0x prefixes", () => {
    expect(sanitizeHexInput("0xAB 0xCD")).toBe("ABCD");
  });
});

describe("computeChangedOffsets", () => {
  it("returns empty set for identical buffers", () => {
    const a = new Uint8Array([1, 2, 3, 4]);
    const b = new Uint8Array([1, 2, 3, 4]);
    expect(computeChangedOffsets(a, b)).toEqual(new Set());
  });

  it("returns offsets where bytes differ", () => {
    const a = new Uint8Array([1, 2, 3, 4]);
    const b = new Uint8Array([1, 0, 3, 0]);
    expect(computeChangedOffsets(a, b)).toEqual(new Set([1, 3]));
  });

  it("returns all offsets when buffers are completely different", () => {
    const a = new Uint8Array([0, 0, 0]);
    const b = new Uint8Array([1, 1, 1]);
    expect(computeChangedOffsets(a, b)).toEqual(new Set([0, 1, 2]));
  });

  it("returns empty set for two empty buffers", () => {
    const a = new Uint8Array(0);
    const b = new Uint8Array(0);
    expect(computeChangedOffsets(a, b)).toEqual(new Set());
  });

  it("treats extra bytes in longer buffer as changed", () => {
    const a = new Uint8Array([1, 2]);
    const b = new Uint8Array([1, 2, 3, 4]);
    const result = computeChangedOffsets(a, b);
    expect(result).toEqual(new Set([2, 3]));
  });

  it("treats extra bytes in shorter new buffer as changed", () => {
    const a = new Uint8Array([1, 2, 3, 4]);
    const b = new Uint8Array([1, 2]);
    const result = computeChangedOffsets(a, b);
    expect(result).toEqual(new Set([2, 3]));
  });

  it("detects single byte change at offset 0", () => {
    const a = new Uint8Array([0x00, 0xff]);
    const b = new Uint8Array([0x01, 0xff]);
    expect(computeChangedOffsets(a, b)).toEqual(new Set([0]));
  });
});
