import { describe, it, expect } from "vitest";
import { coalesceMemoryWrites } from "./PendingChanges";

describe("coalesceMemoryWrites", () => {
  it("returns empty array for no writes", () => {
    expect(coalesceMemoryWrites([])).toEqual([]);
  });

  it("returns single range for a single write", () => {
    const result = coalesceMemoryWrites([
      { address: 0x100, data: new Uint8Array([1, 2, 3]) },
    ]);
    expect(result).toHaveLength(1);
    expect(result[0].address).toBe(0x100);
    expect(result[0].totalBytes).toBe(3);
  });

  it("merges adjacent writes into one range", () => {
    const result = coalesceMemoryWrites([
      { address: 0x100, data: new Uint8Array([1, 2]) },
      { address: 0x102, data: new Uint8Array([3, 4]) },
    ]);
    expect(result).toHaveLength(1);
    expect(result[0].address).toBe(0x100);
    expect(result[0].totalBytes).toBe(4);
  });

  it("merges overlapping writes", () => {
    const result = coalesceMemoryWrites([
      { address: 0x100, data: new Uint8Array([1, 2, 3]) },
      { address: 0x101, data: new Uint8Array([4, 5]) },
    ]);
    expect(result).toHaveLength(1);
    expect(result[0].address).toBe(0x100);
    expect(result[0].totalBytes).toBe(3); // 0x100-0x103
  });

  it("keeps non-adjacent writes separate", () => {
    const result = coalesceMemoryWrites([
      { address: 0x100, data: new Uint8Array([1]) },
      { address: 0x200, data: new Uint8Array([2]) },
    ]);
    expect(result).toHaveLength(2);
    expect(result[0].address).toBe(0x100);
    expect(result[1].address).toBe(0x200);
  });

  it("handles unsorted input", () => {
    const result = coalesceMemoryWrites([
      { address: 0x200, data: new Uint8Array([3]) },
      { address: 0x100, data: new Uint8Array([1, 2]) },
      { address: 0x102, data: new Uint8Array([4]) },
    ]);
    expect(result).toHaveLength(2);
    expect(result[0].address).toBe(0x100);
    expect(result[0].totalBytes).toBe(3);
    expect(result[1].address).toBe(0x200);
    expect(result[1].totalBytes).toBe(1);
  });

  it("merges many adjacent single-byte writes", () => {
    const writes = Array.from({ length: 32 }, (_, i) => ({
      address: 0x100 + i,
      data: new Uint8Array([i]),
    }));
    const result = coalesceMemoryWrites(writes);
    expect(result).toHaveLength(1);
    expect(result[0].address).toBe(0x100);
    expect(result[0].totalBytes).toBe(32);
  });

  it("preview contains hex representation", () => {
    const result = coalesceMemoryWrites([
      { address: 0x100, data: new Uint8Array([0xaa, 0xbb]) },
    ]);
    expect(result[0].preview).toContain("AA BB");
  });
});
