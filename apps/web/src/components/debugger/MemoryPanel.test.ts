import { describe, it, expect } from "vitest";
import type { PageMapEntry, MemoryChunk } from "@pvmdbg/types";

// Extract expandPages for testability — same logic as in MemoryPanel.tsx
const PAGE_SIZE = 4096;

interface ExpandedPage {
  address: number;
  isWritable: boolean;
}

function expandPages(pageMap: PageMapEntry[]): ExpandedPage[] {
  const pageMap_ = new Map<number, boolean>();
  for (const entry of pageMap) {
    const pageCount = Math.ceil(entry.length / PAGE_SIZE);
    for (let i = 0; i < pageCount; i++) {
      const addr = entry.address + i * PAGE_SIZE;
      pageMap_.set(addr, pageMap_.get(addr) || entry.isWritable);
    }
  }
  return [...pageMap_.entries()]
    .sort(([a], [b]) => a - b)
    .map(([address, isWritable]) => ({ address, isWritable }));
}

function computeInitializedPages(memoryChunks: MemoryChunk[]): Set<number> {
  const pages = new Set<number>();
  for (const chunk of memoryChunks) {
    const start = chunk.address;
    const end = start + chunk.data.length;
    const firstPage = Math.floor(start / PAGE_SIZE) * PAGE_SIZE;
    for (let addr = firstPage; addr < end; addr += PAGE_SIZE) {
      pages.add(addr);
    }
  }
  return pages;
}

function getPageLabel(
  address: number,
  isWritable: boolean,
  programKind: "generic" | "jam_spi",
  initializedPages: Set<number>,
): string {
  if (programKind !== "jam_spi") {
    return "Page @ 0x" + address.toString(16).toUpperCase();
  }
  if (address === 0xfeff0000) return "Arguments";
  if (address >= 0xfefe0000 && address < 0xfeff0000) return "Stack";
  if (!isWritable && address >= 0x00010000) return "RO Data";
  if (isWritable && initializedPages.has(address)) return "RW Data";
  if (isWritable) return "Heap";
  return "Page @ 0x" + address.toString(16).toUpperCase();
}

describe("expandPages", () => {
  it("returns empty array for empty page map", () => {
    expect(expandPages([])).toEqual([]);
  });

  it("returns single entry for a single 4 KiB page", () => {
    const pageMap: PageMapEntry[] = [
      { address: 0x20000, length: 4096, isWritable: true },
    ];
    expect(expandPages(pageMap)).toEqual([{ address: 0x20000, isWritable: true }]);
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
    expect(expandPages(pageMap)).toEqual([{ address: 0x20000, isWritable: true }]);
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
    expect(computeInitializedPages(chunks)).toEqual(new Set([0x10000, 0x11000]));
  });
});

describe("getPageLabel", () => {
  const emptyInit = new Set<number>();

  it("returns generic label for non-SPI programs", () => {
    expect(getPageLabel(0x20000, true, "generic", emptyInit)).toBe("Page @ 0x20000");
  });

  it("returns Arguments for SPI page at 0xFEFF0000", () => {
    expect(getPageLabel(0xfeff0000, true, "jam_spi", emptyInit)).toBe("Arguments");
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
});
