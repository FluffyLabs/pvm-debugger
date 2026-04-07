import type { MachineStateSnapshot, PvmLifecycle } from "@pvmdbg/types";
import type { BasicBlock } from "./useBasicBlocks";
import { groupInstructionsIntoBlocks } from "./useBasicBlocks";
import type { DecodedInstruction } from "./useDisassembly";

/**
 * Given an array of basic blocks and a PC, compute the number of remaining
 * instructions from the current position to the end of its containing block.
 *
 * Returns 1 when:
 * - The PC is outside every known block
 * - There are no blocks
 */
export function computeBlockStepCount(
  blocks: BasicBlock[],
  pc: number,
): number {
  for (const block of blocks) {
    const idx = block.instructions.findIndex((i) => i.pc === pc);
    if (idx !== -1) {
      // Remaining instructions = from current (inclusive) to end of block
      return block.instructions.length - idx;
    }
  }
  // PC not found in any block — fall back to single step
  return 1;
}

/**
 * Build basic blocks from decoded instructions (pure function, no React hooks).
 * Delegates to the shared grouping logic in useBasicBlocks.
 */
export function buildBlocksFromInstructions(
  instructions: DecodedInstruction[],
): BasicBlock[] {
  return groupInstructionsIntoBlocks(instructions);
}

/**
 * Compute the block step count for multi-PVM scenarios.
 * Uses the smallest remaining block length across all paused PVMs
 * so that no PVM overshoots its block boundary.
 *
 * Returns 1 when there are no paused PVM snapshots.
 */
export function computeMultiPvmBlockStepCount(
  blocks: BasicBlock[],
  snapshots: Map<
    string,
    { snapshot: MachineStateSnapshot; lifecycle: PvmLifecycle }
  >,
): number {
  let minCount = Infinity;
  let hasPaused = false;

  for (const [, entry] of snapshots) {
    // Only consider paused or paused_host_call PVMs (not terminal, not running)
    if (
      entry.lifecycle !== "paused" &&
      entry.lifecycle !== "paused_host_call"
    ) {
      continue;
    }
    hasPaused = true;
    const count = computeBlockStepCount(blocks, entry.snapshot.pc);
    if (count < minCount) {
      minCount = count;
    }
  }

  if (!hasPaused) return 1;
  return minCount;
}
