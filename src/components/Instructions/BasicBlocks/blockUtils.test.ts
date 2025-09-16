import { describe, it, expect } from 'vitest';
import { Args } from '@typeberry/pvm-debugger-adapter';
import {
  groupInstructionsByBlocks,
  getVisibleInstructionCount,
  findBlockContainingAddress,
  getVirtualIndexForAddress,
  virtualIndexToBlockAndInstruction,
  toggleBlockExpanded,
  expandAllBlocks,
  collapseAllBlocks,
  BasicBlockGroup,
} from './blockUtils';
import { CurrentInstruction } from '@/types/pvm';

// Helper function to create mock instructions
function createMockInstruction(
  address: number,
  blockNumber: number,
  isStart: boolean = false,
  isEnd: boolean = false
): CurrentInstruction {
  return {
    address,
    name: `INST_${address}`,
    gas: 100,
    instructionCode: 1,
    instructionBytes: new Uint8Array([1, 2, 3]),
    args: {} as Args,
    block: {
      isStart,
      isEnd,
      name: `block${blockNumber}`,
      number: blockNumber,
    },
  };
}

describe('groupInstructionsByBlocks', () => {
  it('should group instructions into basic blocks', () => {
    const instructions: CurrentInstruction[] = [
      createMockInstruction(0, 0, true, false),
      createMockInstruction(1, 0, false, false),
      createMockInstruction(2, 0, false, true),
      createMockInstruction(3, 1, true, false),
      createMockInstruction(4, 1, false, true),
    ];

    const blocks = groupInstructionsByBlocks(instructions);

    expect(blocks).toHaveLength(2);
    expect(blocks[0].blockNumber).toBe(0);
    expect(blocks[0].instructionCount).toBe(3);
    expect(blocks[0].startAddress).toBe(0);
    expect(blocks[0].endAddress).toBe(2);
    expect(blocks[1].blockNumber).toBe(1);
    expect(blocks[1].instructionCount).toBe(2);
    expect(blocks[1].startAddress).toBe(3);
    expect(blocks[1].endAddress).toBe(4);
  });

  it('should handle single instruction blocks', () => {
    const instructions: CurrentInstruction[] = [
      createMockInstruction(0, 0, true, true),
      createMockInstruction(1, 1, true, true),
    ];

    const blocks = groupInstructionsByBlocks(instructions);

    expect(blocks).toHaveLength(2);
    expect(blocks[0].instructionCount).toBe(1);
    expect(blocks[1].instructionCount).toBe(1);
  });

  it('should handle empty instruction list', () => {
    const blocks = groupInstructionsByBlocks([]);
    expect(blocks).toHaveLength(0);
  });
});

describe('getVisibleInstructionCount', () => {
  const mockBlocks: BasicBlockGroup[] = [
    {
      blockNumber: 0,
      blockName: 'Block 0',
      instructions: [createMockInstruction(0, 0), createMockInstruction(1, 0)],
      startAddress: 0,
      endAddress: 1,
      instructionCount: 2,
      isExpanded: true,
      isSingleInstruction: false,
    },
    {
      blockNumber: 1,
      blockName: 'Block 1',
      instructions: [createMockInstruction(2, 1), createMockInstruction(3, 1), createMockInstruction(4, 1)],
      startAddress: 2,
      endAddress: 4,
      instructionCount: 3,
      isExpanded: true,
      isSingleInstruction: false,
    },
  ];

  it('should count all items when all blocks are expanded', () => {
    const expandedBlocks = new Set([0, 1]);
    const count = getVisibleInstructionCount(mockBlocks, expandedBlocks);
    // 2 block headers + 2 instructions + 3 instructions = 7
    expect(count).toBe(7);
  });

  it('should count only headers when all blocks are collapsed', () => {
    const expandedBlocks = new Set<number>();
    const count = getVisibleInstructionCount(mockBlocks, expandedBlocks);
    // 2 block headers only
    expect(count).toBe(2);
  });

  it('should handle mixed expanded/collapsed state', () => {
    const expandedBlocks = new Set([0]); // Only block 0 expanded
    const count = getVisibleInstructionCount(mockBlocks, expandedBlocks);
    // 2 block headers + 2 instructions from block 0 = 4
    expect(count).toBe(4);
  });
});

describe('findBlockContainingAddress', () => {
  const mockBlocks: BasicBlockGroup[] = [
    {
      blockNumber: 0,
      blockName: 'Block 0',
      instructions: [],
      startAddress: 0,
      endAddress: 10,
      instructionCount: 2,
      isExpanded: true,
      isSingleInstruction: false,
    },
    {
      blockNumber: 1,
      blockName: 'Block 1',
      instructions: [],
      startAddress: 11,
      endAddress: 20,
      instructionCount: 3,
      isExpanded: true,
      isSingleInstruction: false,
    },
  ];

  it('should find block containing the address', () => {
    const block = findBlockContainingAddress(mockBlocks, 5);
    expect(block).toBeDefined();
    expect(block?.blockNumber).toBe(0);
  });

  it('should find block at boundary addresses', () => {
    const blockStart = findBlockContainingAddress(mockBlocks, 11);
    expect(blockStart?.blockNumber).toBe(1);
    
    const blockEnd = findBlockContainingAddress(mockBlocks, 20);
    expect(blockEnd?.blockNumber).toBe(1);
  });

  it('should return undefined for address not in any block', () => {
    const block = findBlockContainingAddress(mockBlocks, 100);
    expect(block).toBeUndefined();
  });
});

describe('getVirtualIndexForAddress', () => {
  const mockBlocks: BasicBlockGroup[] = [
    {
      blockNumber: 0,
      blockName: 'Block 0',
      instructions: [createMockInstruction(0, 0), createMockInstruction(1, 0)],
      startAddress: 0,
      endAddress: 1,
      instructionCount: 2,
      isExpanded: true,
      isSingleInstruction: false,
    },
    {
      blockNumber: 1,
      blockName: 'Block 1',
      instructions: [createMockInstruction(2, 1), createMockInstruction(3, 1)],
      startAddress: 2,
      endAddress: 3,
      instructionCount: 2,
      isExpanded: true,
      isSingleInstruction: false,
    },
  ];

  it('should get correct virtual index when blocks are expanded', () => {
    const expandedBlocks = new Set([0, 1]);
    
    // First instruction in first block (after header)
    expect(getVirtualIndexForAddress(mockBlocks, expandedBlocks, 0)).toBe(1);
    // Second instruction in first block
    expect(getVirtualIndexForAddress(mockBlocks, expandedBlocks, 1)).toBe(2);
    // First instruction in second block (after header)
    expect(getVirtualIndexForAddress(mockBlocks, expandedBlocks, 2)).toBe(4);
  });

  it('should return -1 for address not found', () => {
    const expandedBlocks = new Set([0, 1]);
    expect(getVirtualIndexForAddress(mockBlocks, expandedBlocks, 100)).toBe(-1);
  });
});

describe('virtualIndexToBlockAndInstruction', () => {
  const mockBlocks: BasicBlockGroup[] = [
    {
      blockNumber: 0,
      blockName: 'Block 0',
      instructions: [createMockInstruction(0, 0), createMockInstruction(1, 0)],
      startAddress: 0,
      endAddress: 1,
      instructionCount: 2,
      isExpanded: true,
      isSingleInstruction: false,
    },
  ];

  it('should correctly identify block header', () => {
    const expandedBlocks = new Set([0]);
    const result = virtualIndexToBlockAndInstruction(mockBlocks, expandedBlocks, 0);
    
    expect(result).toBeDefined();
    expect(result?.blockIndex).toBe(0);
    expect(result?.instructionIndex).toBeNull();
  });

  it('should correctly identify instruction within block', () => {
    const expandedBlocks = new Set([0]);
    const result = virtualIndexToBlockAndInstruction(mockBlocks, expandedBlocks, 1);
    
    expect(result).toBeDefined();
    expect(result?.blockIndex).toBe(0);
    expect(result?.instructionIndex).toBe(0);
  });

  it('should return null for invalid virtual index', () => {
    const expandedBlocks = new Set([0]);
    const result = virtualIndexToBlockAndInstruction(mockBlocks, expandedBlocks, 100);
    expect(result).toBeNull();
  });
});

describe('toggleBlockExpanded', () => {
  it('should add block number when not present', () => {
    const expandedBlocks = new Set([1, 2]);
    const newSet = toggleBlockExpanded(expandedBlocks, 3);
    
    expect(newSet.has(3)).toBe(true);
    expect(newSet.size).toBe(3);
  });

  it('should remove block number when present', () => {
    const expandedBlocks = new Set([1, 2, 3]);
    const newSet = toggleBlockExpanded(expandedBlocks, 2);
    
    expect(newSet.has(2)).toBe(false);
    expect(newSet.size).toBe(2);
  });
});

describe('expandAllBlocks and collapseAllBlocks', () => {
  const mockBlocks: BasicBlockGroup[] = [
    {
      blockNumber: 0,
      blockName: 'Block 0',
      instructions: [],
      startAddress: 0,
      endAddress: 1,
      instructionCount: 2,
      isExpanded: true,
      isSingleInstruction: false,
    },
    {
      blockNumber: 1,
      blockName: 'Block 1',
      instructions: [],
      startAddress: 2,
      endAddress: 3,
      instructionCount: 2,
      isExpanded: true,
      isSingleInstruction: false,
    },
  ];

  it('should expand all blocks', () => {
    const expandedSet = expandAllBlocks(mockBlocks);
    expect(expandedSet.size).toBe(2);
    expect(expandedSet.has(0)).toBe(true);
    expect(expandedSet.has(1)).toBe(true);
  });

  it('should collapse all blocks', () => {
    const collapsedSet = collapseAllBlocks();
    expect(collapsedSet.size).toBe(0);
  });
});

describe('single instruction blocks', () => {
  it('should handle single instruction blocks in getVisibleInstructionCount', () => {
    const mockBlocks: BasicBlockGroup[] = [
      {
        blockNumber: 0,
        blockName: 'Block 0',
        instructions: [createMockInstruction(0, 0)],
        startAddress: 0,
        endAddress: 0,
        instructionCount: 1,
        isExpanded: true,
        isSingleInstruction: true,
      },
      {
        blockNumber: 1,
        blockName: 'Block 1',
        instructions: [createMockInstruction(1, 1), createMockInstruction(2, 1)],
        startAddress: 1,
        endAddress: 2,
        instructionCount: 2,
        isExpanded: true,
        isSingleInstruction: false,
      },
    ];

    const expandedBlocks = new Set([0, 1]);
    const count = getVisibleInstructionCount(mockBlocks, expandedBlocks);
    // 1 (single instruction) + 1 (header) + 2 (instructions) = 4
    expect(count).toBe(4);
  });

  it('should handle single instruction blocks in getVirtualIndexForAddress', () => {
    const mockBlocks: BasicBlockGroup[] = [
      {
        blockNumber: 0,
        blockName: 'Block 0',
        instructions: [createMockInstruction(0, 0)],
        startAddress: 0,
        endAddress: 0,
        instructionCount: 1,
        isExpanded: true,
        isSingleInstruction: true,
      },
      {
        blockNumber: 1,
        blockName: 'Block 1',
        instructions: [createMockInstruction(1, 1), createMockInstruction(2, 1)],
        startAddress: 1,
        endAddress: 2,
        instructionCount: 2,
        isExpanded: true,
        isSingleInstruction: false,
      },
    ];

    const expandedBlocks = new Set([0, 1]);
    
    // Address 0 is at virtual index 0 (single instruction block)
    expect(getVirtualIndexForAddress(mockBlocks, expandedBlocks, 0)).toBe(0);
    // Address 1 is at virtual index 2 (after single instruction and block header)
    expect(getVirtualIndexForAddress(mockBlocks, expandedBlocks, 1)).toBe(2);
    // Address 2 is at virtual index 3
    expect(getVirtualIndexForAddress(mockBlocks, expandedBlocks, 2)).toBe(3);
  });
});