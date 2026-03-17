import { describe, it, expect } from "vitest";
import type { PageMapEntry } from "@pvmdbg/types";

// Extract expandPages for testability — same logic as in MemoryPanel.tsx
const PAGE_SIZE = 4096;
function expandPages(pageMap: PageMapEntry[]): number[] {
  const addresses: number[] = [];
  for (const entry of pageMap) {
    const pageCount = Math.ceil(entry.length / PAGE_SIZE);
    for (let i = 0; i < pageCount; i++) {
      addresses.push(entry.address + i * PAGE_SIZE);
    }
  }
  addresses.sort((a, b) => a - b);
  return [...new Set(addresses)];
}

describe("expandPages", () => {
  it("returns empty array for empty page map", () => {
    expect(expandPages([])).toEqual([]);
  });

  it("returns single address for a single 4 KiB page", () => {
    const pageMap: PageMapEntry[] = [
      { address: 0x20000, length: 4096, isWritable: true },
    ];
    expect(expandPages(pageMap)).toEqual([0x20000]);
  });

  it("expands multi-page segment into individual 4 KiB pages", () => {
    const pageMap: PageMapEntry[] = [
      { address: 0x10000, length: 12288, isWritable: false }, // 3 pages
    ];
    expect(expandPages(pageMap)).toEqual([0x10000, 0x11000, 0x12000]);
  });

  it("sorts pages by ascending address across multiple segments", () => {
    const pageMap: PageMapEntry[] = [
      { address: 0x30000, length: 4096, isWritable: true },
      { address: 0x10000, length: 4096, isWritable: false },
    ];
    expect(expandPages(pageMap)).toEqual([0x10000, 0x30000]);
  });

  it("deduplicates overlapping segments", () => {
    const pageMap: PageMapEntry[] = [
      { address: 0x10000, length: 8192, isWritable: true }, // 0x10000, 0x11000
      { address: 0x11000, length: 4096, isWritable: false }, // 0x11000 (overlap)
    ];
    expect(expandPages(pageMap)).toEqual([0x10000, 0x11000]);
  });

  it("handles sub-page length by rounding up to 1 page", () => {
    const pageMap: PageMapEntry[] = [
      { address: 0x20000, length: 100, isWritable: true },
    ];
    expect(expandPages(pageMap)).toEqual([0x20000]);
  });

  it("handles zero-length segment by producing no pages", () => {
    const pageMap: PageMapEntry[] = [
      { address: 0x20000, length: 0, isWritable: true },
    ];
    expect(expandPages(pageMap)).toEqual([]);
  });
});
