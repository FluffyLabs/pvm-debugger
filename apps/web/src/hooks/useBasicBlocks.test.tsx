import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useBasicBlocks } from "./useBasicBlocks";
import type { DecodedInstruction } from "./useDisassembly";

function makeInstr(pc: number, blockIndex: number): DecodedInstruction {
  return {
    pc,
    opcode: 0,
    mnemonic: "nop",
    rawBytes: new Uint8Array([0]),
    args: "",
    blockIndex,
  };
}

describe("useBasicBlocks", () => {
  it("returns empty arrays for empty instructions", () => {
    const { result } = renderHook(() => useBasicBlocks([], 0));
    expect(result.current.blocks).toEqual([]);
    expect(result.current.rows).toEqual([]);
  });

  it("groups instructions into blocks by blockIndex", () => {
    const instructions = [
      makeInstr(0, 0),
      makeInstr(2, 0),
      makeInstr(5, 1),
      makeInstr(8, 1),
      makeInstr(10, 2),
    ];
    const { result } = renderHook(() => useBasicBlocks(instructions, 0));

    expect(result.current.blocks).toHaveLength(3);
    expect(result.current.blocks[0].index).toBe(0);
    expect(result.current.blocks[0].startPc).toBe(0);
    expect(result.current.blocks[0].endPc).toBe(2);
    expect(result.current.blocks[0].instructions).toHaveLength(2);

    expect(result.current.blocks[1].index).toBe(1);
    expect(result.current.blocks[1].startPc).toBe(5);
    expect(result.current.blocks[1].endPc).toBe(8);

    expect(result.current.blocks[2].index).toBe(2);
    expect(result.current.blocks[2].startPc).toBe(10);
    expect(result.current.blocks[2].endPc).toBe(10);
    expect(result.current.blocks[2].instructions).toHaveLength(1);
  });

  it("produces header + instruction rows when all blocks are expanded", () => {
    const instructions = [
      makeInstr(0, 0),
      makeInstr(2, 0),
      makeInstr(5, 1),
    ];
    const { result } = renderHook(() => useBasicBlocks(instructions, 0));

    // 2 block headers + 3 instruction rows = 5 total rows
    expect(result.current.rows).toHaveLength(5);
    expect(result.current.rows[0].kind).toBe("header");
    expect(result.current.rows[1].kind).toBe("instruction");
    expect(result.current.rows[2].kind).toBe("instruction");
    expect(result.current.rows[3].kind).toBe("header");
    expect(result.current.rows[4].kind).toBe("instruction");
  });

  it("toggleBlock collapses a block and hides its instruction rows", () => {
    const instructions = [
      makeInstr(0, 0),
      makeInstr(2, 0),
      makeInstr(5, 1),
    ];
    // currentPc is in block 0, so collapsing block 1 should work
    const { result } = renderHook(() => useBasicBlocks(instructions, 0));

    expect(result.current.rows).toHaveLength(5);

    act(() => {
      result.current.toggleBlock(1);
    });

    // Block 1 collapsed: header still present but its instruction hidden
    // Block 0: 1 header + 2 instructions = 3
    // Block 1: 1 header + 0 instructions = 1
    expect(result.current.rows).toHaveLength(4);
    expect(result.current.blocks[1].isCollapsed).toBe(true);

    // The last row should be the block 1 header (no instruction after it)
    const lastRow = result.current.rows[result.current.rows.length - 1];
    expect(lastRow.kind).toBe("header");
  });

  it("toggleBlock expands a previously collapsed block", () => {
    const instructions = [
      makeInstr(0, 0),
      makeInstr(5, 1),
      makeInstr(8, 1),
    ];
    const { result } = renderHook(() => useBasicBlocks(instructions, 0));

    // Collapse block 1
    act(() => {
      result.current.toggleBlock(1);
    });
    expect(result.current.rows).toHaveLength(3); // h0 + i0 + h1

    // Expand block 1
    act(() => {
      result.current.toggleBlock(1);
    });
    expect(result.current.rows).toHaveLength(5); // h0 + i0 + h1 + i5 + i8
    expect(result.current.blocks[1].isCollapsed).toBe(false);
  });

  it("auto-expands a collapsed block that contains the current PC", () => {
    const instructions = [
      makeInstr(0, 0),
      makeInstr(5, 1),
      makeInstr(8, 1),
    ];
    // Start with currentPc=0 (block 0), collapse block 1
    const { result, rerender } = renderHook(
      ({ currentPc }) => useBasicBlocks(instructions, currentPc),
      { initialProps: { currentPc: 0 } },
    );

    act(() => {
      result.current.toggleBlock(1);
    });
    expect(result.current.blocks[1].isCollapsed).toBe(true);
    expect(result.current.rows).toHaveLength(3);

    // Now change currentPc to 5 (inside block 1) — it should auto-expand
    rerender({ currentPc: 5 });
    expect(result.current.blocks[1].isCollapsed).toBe(false);
    expect(result.current.rows).toHaveLength(5);
  });

  it("handles a single block correctly", () => {
    const instructions = [
      makeInstr(0, 0),
      makeInstr(3, 0),
      makeInstr(7, 0),
    ];
    const { result } = renderHook(() => useBasicBlocks(instructions, 0));

    expect(result.current.blocks).toHaveLength(1);
    expect(result.current.rows).toHaveLength(4); // 1 header + 3 instructions
  });

  it("collapsing the current-PC block is overridden by auto-expand", () => {
    const instructions = [
      makeInstr(0, 0),
      makeInstr(2, 0),
    ];
    const { result } = renderHook(() => useBasicBlocks(instructions, 0));

    // Try to collapse block 0 which contains the current PC
    act(() => {
      result.current.toggleBlock(0);
    });

    // Auto-expand should override — block 0 contains currentPc=0
    expect(result.current.blocks[0].isCollapsed).toBe(false);
    // All rows should still be visible
    expect(result.current.rows).toHaveLength(3); // header + 2 instructions
  });
});
