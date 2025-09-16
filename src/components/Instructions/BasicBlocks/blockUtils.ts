import { CurrentInstruction } from "@/types/pvm";

export interface BasicBlockGroup {
  blockNumber: number;
  blockName: string;
  instructions: CurrentInstruction[];
  startAddress: number;
  endAddress: number;
  instructionCount: number;
  isExpanded: boolean;
  isSingleInstruction: boolean;
}

export interface BlocksState {
  blocks: BasicBlockGroup[];
  expandedBlocks: Set<number>;
}

/**
 * Groups instructions into basic blocks based on their block information
 */
export function groupInstructionsByBlocks(instructions: CurrentInstruction[]): BasicBlockGroup[] {
  const blocks: BasicBlockGroup[] = [];
  let currentBlock: CurrentInstruction[] = [];
  let currentBlockNumber = -1;
  let blockStartAddress = 0;

  instructions.forEach((instruction, index) => {
    // Start a new block when we encounter a block start
    if (instruction.block.isStart || currentBlockNumber !== instruction.block.number) {
      // Save the previous block if it exists
      if (currentBlock.length > 0 && currentBlockNumber >= 0) {
        const lastInstruction = currentBlock[currentBlock.length - 1];
        blocks.push({
          blockNumber: currentBlockNumber,
          blockName: `Block ${currentBlockNumber}`,
          instructions: currentBlock,
          startAddress: blockStartAddress,
          endAddress: lastInstruction.address,
          instructionCount: currentBlock.length,
          isExpanded: true, // Default to expanded
          isSingleInstruction: currentBlock.length === 1,
        });
      }

      // Start new block
      currentBlock = [instruction];
      currentBlockNumber = instruction.block.number;
      blockStartAddress = instruction.address;
    } else {
      // Add instruction to current block
      currentBlock.push(instruction);
    }

    // Handle the last instruction
    if (index === instructions.length - 1 && currentBlock.length > 0) {
      blocks.push({
        blockNumber: currentBlockNumber,
        blockName: `Block ${currentBlockNumber}`,
        instructions: currentBlock,
        startAddress: blockStartAddress,
        endAddress: instruction.address,
        instructionCount: currentBlock.length,
        isExpanded: true,
        isSingleInstruction: currentBlock.length === 1,
      });
    }
  });

  return blocks;
}

/**
 * Calculates the visible instruction count based on expanded/collapsed state
 */
export function getVisibleInstructionCount(
  blocks: BasicBlockGroup[],
  expandedBlocks: Set<number>
): number {
  return blocks.reduce((count, block) => {
    // Single instruction blocks don't have headers
    if (block.isSingleInstruction) {
      return count + 1;
    }
    // Always count 1 for the block header
    const headerCount = 1;
    // Add instructions only if block is expanded
    const instructionsCount = expandedBlocks.has(block.blockNumber) ? block.instructionCount : 0;
    return count + headerCount + instructionsCount;
  }, 0);
}

/**
 * Finds the block containing a given program counter address
 */
export function findBlockContainingAddress(
  blocks: BasicBlockGroup[],
  address: number
): BasicBlockGroup | undefined {
  return blocks.find(
    block => address >= block.startAddress && address <= block.endAddress
  );
}

/**
 * Gets the virtual index for a given address in the flattened view
 */
export function getVirtualIndexForAddress(
  blocks: BasicBlockGroup[],
  expandedBlocks: Set<number>,
  address: number
): number {
  let virtualIndex = 0;

  for (const block of blocks) {
    // Check if the address is in this block
    if (address >= block.startAddress && address <= block.endAddress) {
      // Single instruction blocks don't have headers
      if (block.isSingleInstruction) {
        return virtualIndex;
      }

      // Add 1 for the block header
      virtualIndex += 1;

      // If block is expanded, find the instruction index
      if (expandedBlocks.has(block.blockNumber)) {
        const instructionIndex = block.instructions.findIndex(
          inst => inst.address === address
        );
        if (instructionIndex >= 0) {
          virtualIndex += instructionIndex;
        }
      }
      return virtualIndex;
    }

    // Add this block's contribution to the virtual index
    if (block.isSingleInstruction) {
      virtualIndex += 1; // Just the instruction
    } else {
      virtualIndex += 1; // Block header
      if (expandedBlocks.has(block.blockNumber)) {
        virtualIndex += block.instructionCount;
      }
    }
  }

  return -1; // Address not found
}

/**
 * Converts a virtual index to block and instruction indices
 */
export function virtualIndexToBlockAndInstruction(
  blocks: BasicBlockGroup[],
  expandedBlocks: Set<number>,
  virtualIndex: number
): { blockIndex: number; instructionIndex: number | null } | null {
  let currentVirtualIndex = 0;

  for (let blockIndex = 0; blockIndex < blocks.length; blockIndex++) {
    const block = blocks[blockIndex];

    // Single instruction blocks are treated as instructions directly
    if (block.isSingleInstruction) {
      if (currentVirtualIndex === virtualIndex) {
        return { blockIndex, instructionIndex: 0 };
      }
      currentVirtualIndex++;
      continue;
    }

    // Check if virtual index is the block header
    if (currentVirtualIndex === virtualIndex) {
      return { blockIndex, instructionIndex: null };
    }
    currentVirtualIndex++;

    // If block is expanded, check instructions
    if (expandedBlocks.has(block.blockNumber)) {
      for (let instIndex = 0; instIndex < block.instructionCount; instIndex++) {
        if (currentVirtualIndex === virtualIndex) {
          return { blockIndex, instructionIndex: instIndex };
        }
        currentVirtualIndex++;
      }
    }
  }

  return null;
}

/**
 * Toggles the expanded state of a block
 */
export function toggleBlockExpanded(
  expandedBlocks: Set<number>,
  blockNumber: number
): Set<number> {
  const newSet = new Set(expandedBlocks);
  if (newSet.has(blockNumber)) {
    newSet.delete(blockNumber);
  } else {
    newSet.add(blockNumber);
  }
  return newSet;
}

/**
 * Expands all blocks
 */
export function expandAllBlocks(blocks: BasicBlockGroup[]): Set<number> {
  return new Set(blocks.map(block => block.blockNumber));
}

/**
 * Collapses all blocks
 */
export function collapseAllBlocks(): Set<number> {
  return new Set();
}
