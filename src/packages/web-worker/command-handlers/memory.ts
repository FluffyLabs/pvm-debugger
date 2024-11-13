import { CommandStatus, PvmApiInterface } from "../types";
import { isInternalPvm } from "../utils";

// Max memory size defined by the Gray paper (4GB)
const MAX_ADDRESS = Math.pow(2, 32);

export type MemoryParams = {
  pvm: PvmApiInterface | null;
  startAddress: number;
  stopAddress: number;
  memorySize: number | null;
};

export type MemoryResponse = {
  memoryChunk: Uint8Array;
  status: CommandStatus;
  error?: unknown;
};

const getMemoryPage = (pageNumber: number, pvm: PvmApiInterface | null) => {
  if (!pvm) {
    return new Uint8Array();
  }

  if (isInternalPvm(pvm)) {
    return pvm.getMemoryPage(pageNumber) || new Uint8Array();
  }
  return pvm.getPageDump(pageNumber) || new Uint8Array();
};

const getMemory = ({
  pvm,
  startAddress,
  stopAddress,
  memorySize,
}: {
  pvm: PvmApiInterface;
  startAddress: number;
  stopAddress: number;
  memorySize: number;
}): Uint8Array => {
  const memoryChunk = new Uint8Array(stopAddress - startAddress);
  let memoryIndex = 0;
  let address = startAddress;

  while (address < stopAddress) {
    const pageNumber = Math.floor(address / memorySize);
    const page = getMemoryPage(pageNumber, pvm);
    let offset = address % memorySize;

    while (address < stopAddress && offset < memorySize) {
      memoryChunk[memoryIndex] = page[offset];
      memoryIndex++;
      address++;
      offset++;
    }
  }

  return memoryChunk;
};

export const runMemory = async (params: MemoryParams): Promise<MemoryResponse> => {
  if (!params.pvm) {
    return {
      memoryChunk: new Uint8Array(),
      status: CommandStatus.ERROR,
      error: new Error("PVM is uninitialized."),
    };
  }

  if (!params.memorySize) {
    return {
      memoryChunk: new Uint8Array(),
      status: CommandStatus.ERROR,
      error: new Error("Memory size is not defined"),
    };
  }

  if (params.startAddress < 0 || params.stopAddress < 0) {
    return {
      memoryChunk: new Uint8Array(),
      status: CommandStatus.ERROR,
      error: new Error("Invalid memory address"),
    };
  }

  if (params.stopAddress > MAX_ADDRESS) {
    return {
      memoryChunk: new Uint8Array(),
      status: CommandStatus.ERROR,
      error: new Error("Memory range is out of bounds"),
    };
  }

  if (params.startAddress > params.stopAddress) {
    return {
      memoryChunk: new Uint8Array(),
      status: CommandStatus.ERROR,
      error: new Error("Invalid memory range"),
    };
  }

  try {
    const memoryChunk = getMemory({
      pvm: params.pvm,
      startAddress: params.startAddress,
      stopAddress: params.stopAddress,
      memorySize: params.memorySize,
    });

    return {
      memoryChunk,
      status: CommandStatus.SUCCESS,
    };
  } catch (error) {
    return { memoryChunk: new Uint8Array(), status: CommandStatus.ERROR, error };
  }
};
