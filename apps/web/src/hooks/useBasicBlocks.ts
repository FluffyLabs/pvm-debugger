import { useCallback, useMemo, useState } from "react";
import type { DecodedInstruction } from "./useDisassembly";

export interface BasicBlock {
  index: number;
  startPc: number;
  endPc: number;
  instructions: DecodedInstruction[];
  isCollapsed: boolean;
}

/** A flat row fed to the virtualizer — either a block header or an instruction. */
export type VirtualRow =
  | { kind: "header"; block: BasicBlock }
  | { kind: "instruction"; instruction: DecodedInstruction; block: BasicBlock };

export interface UseBasicBlocksResult {
  blocks: BasicBlock[];
  rows: VirtualRow[];
  toggleBlock: (blockIndex: number) => void;
}

/**
 * Pure function: groups decoded instructions into basic blocks using the
 * `blockIndex` field already computed by `useDisassembly`.
 *
 * All blocks are returned with `isCollapsed: false` — the React hook
 * layer applies collapsed state on top.
 *
 * Used by both `useBasicBlocks` (UI) and `useBlockStepping` (stepping logic).
 */
export function groupInstructionsIntoBlocks(
  instructions: DecodedInstruction[],
): BasicBlock[] {
  if (instructions.length === 0) return [];

  const result: BasicBlock[] = [];
  let current: DecodedInstruction[] = [];
  let currentIdx = instructions[0].blockIndex;

  for (const instr of instructions) {
    if (instr.blockIndex !== currentIdx) {
      result.push({
        index: currentIdx,
        startPc: current[0].pc,
        endPc: current[current.length - 1].pc,
        instructions: current,
        isCollapsed: false,
      });
      current = [];
      currentIdx = instr.blockIndex;
    }
    current.push(instr);
  }

  if (current.length > 0) {
    result.push({
      index: currentIdx,
      startPc: current[0].pc,
      endPc: current[current.length - 1].pc,
      instructions: current,
      isCollapsed: false,
    });
  }

  return result;
}

/**
 * Groups decoded instructions into basic blocks (using the `blockIndex` field
 * already computed by `useDisassembly`) and tracks per-block collapsed state.
 *
 * Returns both the block list and a flat `rows` array suitable for virtualisation
 * (block headers + visible instruction rows).
 */
export function useBasicBlocks(
  instructions: DecodedInstruction[],
  currentPc: number,
): UseBasicBlocksResult {
  const [collapsed, setCollapsed] = useState<Set<number>>(new Set());

  const blocks: BasicBlock[] = useMemo(() => {
    const raw = groupInstructionsIntoBlocks(instructions);
    // Apply collapsed state
    return raw.map((block) => ({
      ...block,
      isCollapsed: collapsed.has(block.index),
    }));
  }, [instructions, collapsed]);

  // Auto-expand the block containing the current PC so the user always sees it.
  // This runs as a derived memo — no extra state needed.
  const blocksWithAutoExpand = useMemo(() => {
    return blocks.map((block) => {
      const containsCurrentPc = block.instructions.some((i) => i.pc === currentPc);
      if (containsCurrentPc && block.isCollapsed) {
        return { ...block, isCollapsed: false };
      }
      return block;
    });
  }, [blocks, currentPc]);

  const rows: VirtualRow[] = useMemo(() => {
    const out: VirtualRow[] = [];
    for (const block of blocksWithAutoExpand) {
      out.push({ kind: "header", block });
      if (!block.isCollapsed) {
        for (const instr of block.instructions) {
          out.push({ kind: "instruction", instruction: instr, block });
        }
      }
    }
    return out;
  }, [blocksWithAutoExpand]);

  const toggleBlock = useCallback((blockIndex: number) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(blockIndex)) {
        next.delete(blockIndex);
      } else {
        next.add(blockIndex);
      }
      return next;
    });
  }, []);

  return { blocks: blocksWithAutoExpand, rows, toggleBlock };
}
