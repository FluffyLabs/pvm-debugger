import { describe, it, expect } from "vitest";

// Mock data structure matching the expected format
type Instruction = {
  address: number;
  block: {
    isEnd: boolean;
    number: number;
  };
};

type WorkerState = {
  currentState: {
    pc: number | undefined;
  };
};

// Extract the core block-stepping logic for testing
const calculateStepsToExitBlockForWorker = (workerPc: number, programPreviewResult: Instruction[]): number => {
  if (!programPreviewResult || programPreviewResult.length === 0) {
    return 1;
  }

  const currentInstruction = programPreviewResult.find((x) => x.address === workerPc);

  if (!currentInstruction) {
    return 1;
  }

  // If we're already at the end of a block, step once
  if (currentInstruction.block.isEnd) {
    return 1;
  }

  // Find the current instruction in the program preview result
  const currentIndex = programPreviewResult.findIndex((inst) => inst.address === currentInstruction.address);
  if (currentIndex === -1) {
    return 1;
  }

  // Count instructions remaining in the current block
  let stepsInBlock = 1; // Count the step from current instruction

  for (let i = currentIndex + 1; i < programPreviewResult.length; i++) {
    const instruction = programPreviewResult[i];

    // If we encounter a different block or the end of current block, stop counting
    if (instruction.block.number !== currentInstruction.block.number) {
      break;
    }

    stepsInBlock++;

    // If this instruction is the end of the block, we're done
    if (instruction.block.isEnd) {
      break;
    }
  }

  return stepsInBlock;
};

const calculateStepsToExitBlockForAllWorkers = (
  workers: WorkerState[],
  programPreviewResult: Instruction[],
): number => {
  if (!workers.length || !programPreviewResult) {
    return 1;
  }

  // Calculate steps needed for each worker and take the maximum
  // This ensures all workers step to their respective block boundaries
  const stepsForWorkers = workers.map((worker: WorkerState) => {
    const pc = worker.currentState.pc;
    if (pc === undefined) {
      return 1;
    }
    return calculateStepsToExitBlockForWorker(pc, programPreviewResult);
  });

  return Math.max(...stepsForWorkers);
};

describe("Block-stepping calculations", () => {
  const mockProgramPreviewResult: Instruction[] = [
    { address: 100, block: { number: 1, isEnd: false } },
    { address: 104, block: { number: 1, isEnd: false } },
    { address: 108, block: { number: 1, isEnd: false } },
    { address: 112, block: { number: 1, isEnd: true } }, // End of block 1
    { address: 116, block: { number: 2, isEnd: false } },
    { address: 120, block: { number: 2, isEnd: true } }, // End of block 2
    { address: 124, block: { number: 3, isEnd: false } },
    { address: 128, block: { number: 3, isEnd: true } }, // End of block 3
  ];

  describe("calculateStepsToExitBlockForWorker", () => {
    it("should return 1 when programPreviewResult is empty", () => {
      const result = calculateStepsToExitBlockForWorker(100, []);
      expect(result).toBe(1);
    });

    it("should return 1 when current instruction is not found", () => {
      const result = calculateStepsToExitBlockForWorker(999, mockProgramPreviewResult);
      expect(result).toBe(1);
    });

    it("should return 1 when already at block end", () => {
      const result = calculateStepsToExitBlockForWorker(112, mockProgramPreviewResult);
      expect(result).toBe(1);
    });

    it("should calculate correct steps to exit block from beginning", () => {
      const result = calculateStepsToExitBlockForWorker(100, mockProgramPreviewResult);
      expect(result).toBe(4); // Steps: 100 -> 104 -> 108 -> 112 (block end)
    });

    it("should calculate correct steps to exit block from middle", () => {
      const result = calculateStepsToExitBlockForWorker(104, mockProgramPreviewResult);
      expect(result).toBe(3); // Steps: 104 -> 108 -> 112 (block end)
    });

    it("should calculate correct steps for second block", () => {
      const result = calculateStepsToExitBlockForWorker(116, mockProgramPreviewResult);
      expect(result).toBe(2); // Steps: 116 -> 120 (block end)
    });

    it("should calculate correct steps for single-instruction block", () => {
      const result = calculateStepsToExitBlockForWorker(124, mockProgramPreviewResult);
      expect(result).toBe(2); // Steps: 124 -> 128 (block end)
    });

    it("should handle last instruction in block correctly", () => {
      const result = calculateStepsToExitBlockForWorker(108, mockProgramPreviewResult);
      expect(result).toBe(2); // Steps: 108 -> 112 (block end)
    });
  });

  describe("calculateStepsToExitBlockForAllWorkers", () => {
    it("should return 1 when no workers exist", () => {
      const result = calculateStepsToExitBlockForAllWorkers([], mockProgramPreviewResult);
      expect(result).toBe(1);
    });

    it("should return 1 when programPreviewResult is empty", () => {
      const mockWorkers: WorkerState[] = [{ currentState: { pc: 100 } }];
      const result = calculateStepsToExitBlockForAllWorkers(mockWorkers, []);
      expect(result).toBe(1);
    });

    it("should return maximum steps needed across all workers", () => {
      const mockWorkers: WorkerState[] = [
        { currentState: { pc: 100 } }, // Needs 4 steps to exit block 1
        { currentState: { pc: 108 } }, // Needs 2 steps to exit block 1
        { currentState: { pc: 116 } }, // Needs 2 steps to exit block 2
      ];
      const result = calculateStepsToExitBlockForAllWorkers(mockWorkers, mockProgramPreviewResult);
      expect(result).toBe(4); // Maximum across all workers
    });

    it("should handle workers with undefined PC", () => {
      const mockWorkers: WorkerState[] = [
        { currentState: { pc: 100 } }, // Needs 4 steps
        { currentState: { pc: undefined } }, // Should default to 1
      ];
      const result = calculateStepsToExitBlockForAllWorkers(mockWorkers, mockProgramPreviewResult);
      expect(result).toBe(4);
    });

    it("should handle all workers at block end", () => {
      const mockWorkers: WorkerState[] = [
        { currentState: { pc: 112 } }, // At block 1 end
        { currentState: { pc: 120 } }, // At block 2 end
      ];
      const result = calculateStepsToExitBlockForAllWorkers(mockWorkers, mockProgramPreviewResult);
      expect(result).toBe(1);
    });

    it("should handle single worker", () => {
      const mockWorkers: WorkerState[] = [
        { currentState: { pc: 104 } }, // Needs 3 steps to exit block
      ];
      const result = calculateStepsToExitBlockForAllWorkers(mockWorkers, mockProgramPreviewResult);
      expect(result).toBe(3);
    });

    it("should handle workers in different blocks correctly", () => {
      const mockWorkers: WorkerState[] = [
        { currentState: { pc: 100 } }, // Block 1, needs 4 steps
        { currentState: { pc: 116 } }, // Block 2, needs 2 steps
        { currentState: { pc: 124 } }, // Block 3, needs 2 steps
      ];
      const result = calculateStepsToExitBlockForAllWorkers(mockWorkers, mockProgramPreviewResult);
      expect(result).toBe(4); // Maximum is 4 from the first worker
    });
  });
});
