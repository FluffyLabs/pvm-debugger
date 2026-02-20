import { CommandStatus, PvmApiInterface } from "../types";
import * as numbers from "@typeberry/lib/numbers";
import * as utils from "@typeberry/lib/utils";
import * as pvm from "@typeberry/lib/pvm-interface";

type HostCallParams = {
  pvm: PvmApiInterface | null;
  hostCallIdentifier: number;
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

class SimpleRegisters implements pvm.IRegisters {
  flatRegisters!: Uint8Array;
  pvm!: PvmApiInterface;

  getAllEncoded(): Uint8Array {
    return this.flatRegisters;
  }
  setAllEncoded(bytes: Uint8Array): void {
    this.flatRegisters = bytes;
    this.pvm.setRegisters(this.flatRegisters);
  }
}

const getRegisters = (pvm: PvmApiInterface) => {
  const registers = new SimpleRegisters();
  registers.flatRegisters = pvm.getRegisters();
  registers.pvm = pvm;

  return registers;
};

class SimpleMemory implements pvm.IMemory {
  pvm!: PvmApiInterface;
  memorySize: number = 4096;

  read(startAddress: numbers.U32, result: Uint8Array) {
    const memoryDump = this.pvm.getPageDump(Number(startAddress / this.memorySize));
    if (memoryDump !== null) {
      result.set(memoryDump.subarray(0, result.length));
    }
    // eslint-disable-next-line
    return utils.Result.ok("ok" as any);
  }

  store(address: numbers.U32, bytes: Uint8Array) {
    // TODO [ToDr] Either change the API to require handling multi-page writes or change this code to split the write into multiple pages.
    this.pvm.setMemory(Number(address), bytes);
    // eslint-disable-next-line
    return utils.Result.ok("ok" as any);
  }
}

const getMemory = (pvm: PvmApiInterface) => {
  const memory = new SimpleMemory();
  memory.pvm = pvm;

  return memory;
};

const hostCall = async ({
  pvm,
  hostCallIdentifier,
}: {
  pvm: PvmApiInterface;
  hostCallIdentifier: number;
}): Promise<HostCallResponse> => {
  // TODO [ToDr] Introduce host calls handling via JSON trace.
  getRegisters(pvm);
  getMemory(pvm);
  // return { hostCallIdentifier, status: CommandStatus.SUCCESS };
  return { hostCallIdentifier, status: CommandStatus.ERROR, error: new Error("Unknown host call identifier") };
};

export const runHostCall = async ({ pvm, hostCallIdentifier }: HostCallParams): Promise<HostCallResponse> => {
  if (!pvm) {
    throw new Error("PVM is uninitialized.");
  }

  try {
    return await hostCall({ pvm, hostCallIdentifier });
  } catch (error) {
    return {
      hostCallIdentifier,
      status: CommandStatus.ERROR,
      error: new Error(error instanceof Error ? error.message : "Unknown error"),
    };
  }
};
