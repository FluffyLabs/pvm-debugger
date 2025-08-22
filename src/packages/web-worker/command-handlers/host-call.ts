import { CommandStatus, PvmApiInterface } from "../types";
import { TracesFile, TraceVmState } from "@/types/pvm";

type HostCallParams = {
  pvm: PvmApiInterface | null;
  hostCallIdentifier: number;
  tracesFile?: TracesFile | null;
  currentHostCallIndex?: number;
};

type HostCallResponse =
  | {
      hostCallIdentifier: number;
      status: CommandStatus;
      error?: unknown;
    }
  | {
      hostCallIdentifier: number;
      status: CommandStatus;
      error?: unknown;
    };

// Removed unused classes and functions

const validateVmState = async (
  pvm: PvmApiInterface,
  expectedState: TraceVmState,
): Promise<{ isValid: boolean; errors: string[] }> => {
  const errors: string[] = [];

  try {
    // Validate gas if specified
    if (expectedState.gas) {
      const currentGas = await pvm.getGasLeft();
      const expectedGas = BigInt(expectedState.gas);
      if (currentGas !== expectedGas) {
        errors.push(`Gas mismatch: expected ${expectedGas}, got ${currentGas}`);
      }
    }

    // Validate registers if specified
    if (expectedState.regs) {
      const currentRegs = pvm.getRegisters();
      const currentRegsBigInt = new BigUint64Array(currentRegs.buffer);

      for (const [regIndex, expectedValue] of Object.entries(expectedState.regs)) {
        const index = parseInt(regIndex);
        const expected = BigInt(expectedValue);
        const current = currentRegsBigInt[index];

        if (current !== expected) {
          errors.push(`Register ${index} mismatch: expected ${expected}, got ${current}`);
        }
      }
    }

    // Validate memory if specified
    if (expectedState.memory && expectedState.memory.length > 0) {
      for (const memEntry of expectedState.memory) {
        const address = memEntry.address;
        const expectedBytes = new Uint8Array(Buffer.from(memEntry.contents.slice(2), "hex"));

        try {
          // Get current memory at address
          const pageSize = 4096; // Standard page size
          const pageIndex = Math.floor(address / pageSize);
          const offsetInPage = address % pageSize;
          const currentPage = pvm.getPageDump(pageIndex);
          if (!currentPage) {
            errors.push(`Failed to read memory page ${pageIndex} at address ${address}`);
            continue;
          }
          const currentBytes = currentPage.slice(offsetInPage, offsetInPage + expectedBytes.length);

          for (let i = 0; i < expectedBytes.length; i++) {
            if (currentBytes[i] !== expectedBytes[i]) {
              errors.push(
                `Memory at address ${address + i} mismatch: expected 0x${expectedBytes[i].toString(16).padStart(2, "0")}, got 0x${currentBytes[i].toString(16).padStart(2, "0")}`,
              );
            }
          }
        } catch (memError) {
          errors.push(`Failed to read memory at address ${address}: ${memError}`);
        }
      }
    }
  } catch (error) {
    errors.push(`Validation failed: ${error}`);
  }

  return { isValid: errors.length === 0, errors };
};

const applyVmState = async (pvm: PvmApiInterface, newState: TraceVmState): Promise<void> => {
  // Apply gas changes
  if (newState.gas) {
    const newGas = BigInt(newState.gas);
    if (pvm.setGasLeft) {
      pvm.setGasLeft(newGas);
    }
  }

  // Apply register changes
  if (newState.regs) {
    const currentRegs = pvm.getRegisters();
    const regsBigInt = new BigUint64Array(currentRegs.buffer);

    for (const [regIndex, newValue] of Object.entries(newState.regs)) {
      const index = parseInt(regIndex);
      const value = BigInt(newValue);
      regsBigInt[index] = value;
    }

    pvm.setRegisters(new Uint8Array(regsBigInt.buffer));
  }

  // Apply memory changes
  if (newState.memory && newState.memory.length > 0) {
    for (const memEntry of newState.memory) {
      const address = memEntry.address;
      const bytes = new Uint8Array(Buffer.from(memEntry.contents.slice(2), "hex"));
      pvm.setMemory(address, bytes);
    }
  }
};

const hostCall = async ({
  pvm,
  hostCallIdentifier,
  tracesFile,
  currentHostCallIndex,
}: {
  pvm: PvmApiInterface;
  hostCallIdentifier: number;
  tracesFile?: TracesFile | null;
  currentHostCallIndex?: number;
}): Promise<HostCallResponse> => {
  // If no traces file is provided, return error
  if (!tracesFile) {
    return {
      hostCallIdentifier,
      status: CommandStatus.ERROR,
      error: new Error("No host calls trace file provided"),
    };
  }

  // If no current index is provided, return error
  if (currentHostCallIndex === undefined || currentHostCallIndex === null) {
    return {
      hostCallIdentifier,
      status: CommandStatus.ERROR,
      error: new Error("No current host call index provided"),
    };
  }

  // Check if we have more host calls to process
  if (currentHostCallIndex >= tracesFile["host-calls-trace"].length) {
    return {
      hostCallIdentifier,
      status: CommandStatus.ERROR,
      error: new Error(
        `Host call index ${currentHostCallIndex} exceeds available traces (${tracesFile["host-calls-trace"].length})`,
      ),
    };
  }

  const currentTraceEntry = tracesFile["host-calls-trace"][currentHostCallIndex];

  try {
    // Validate the "before" state if provided
    if (currentTraceEntry.before) {
      const validation = await validateVmState(pvm, currentTraceEntry.before);
      if (!validation.isValid) {
        return {
          hostCallIdentifier,
          status: CommandStatus.ERROR,
          error: new Error(`Pre-condition validation failed:\n${validation.errors.join("\n")}`),
        };
      }
    }

    // Apply the "after" state changes
    await applyVmState(pvm, currentTraceEntry.after);

    return {
      hostCallIdentifier,
      status: CommandStatus.SUCCESS,
    };
  } catch (error) {
    return {
      hostCallIdentifier,
      status: CommandStatus.ERROR,
      error: new Error(error instanceof Error ? error.message : "Unknown error during host call processing"),
    };
  }
};

export const runHostCall = async ({
  pvm,
  hostCallIdentifier,
  tracesFile,
  currentHostCallIndex,
}: HostCallParams): Promise<HostCallResponse> => {
  if (!pvm) {
    throw new Error("PVM is uninitialized.");
  }

  try {
    return await hostCall({
      pvm,
      hostCallIdentifier,
      tracesFile,
      currentHostCallIndex,
    });
  } catch (error) {
    return {
      hostCallIdentifier,
      status: CommandStatus.ERROR,
      error: new Error(error instanceof Error ? error.message : "Unknown error"),
    };
  }
};
