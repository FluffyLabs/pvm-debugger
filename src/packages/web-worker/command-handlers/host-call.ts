import { HostCallIdentifiers } from "@/types/pvm";
import { CommandStatus, PvmApiInterface, Storage } from "../types";
import { read, write } from "@typeberry/jam-host-calls";
import { WriteAccounts } from "@/packages/host-calls/write";
import { isInternalPvm } from "../utils";
import { ReadAccounts } from "@/packages/host-calls/read";
import { tryAsServiceId } from "@typeberry/block";
import { Memory, MemoryIndex, SbrkIndex, tryAsGas } from "@typeberry/pvm-debugger-adapter";

type HostCallParams = {
  pvm: PvmApiInterface | null;
  hostCallIdentifier: HostCallIdentifiers;
  storage: Storage | null;
  serviceId: number | null;
};

type HostCallResponse =
  | {
      hostCallIdentifier: Exclude<HostCallIdentifiers, HostCallIdentifiers.WRITE>;
      status: CommandStatus;
      error?: unknown;
    }
  | {
      hostCallIdentifier: HostCallIdentifiers.WRITE;
      storage?: Storage;
      status: CommandStatus;
      error?: unknown;
    };

// [KrFr] Gas counter is not used. Can be mocked for now.
const getGasCounter = (pvm: PvmApiInterface) => {
  if (isInternalPvm(pvm)) {
    return pvm.getInterpreter().getGasCounter();
  }

  return {
    get: () => {
      return tryAsGas(10_000);
    },
    set: () => {},
    sub: () => {
      return false;
    },
  };
};

const getRegisters = (pvm: PvmApiInterface) => {
  if (isInternalPvm(pvm)) {
    return pvm.getInterpreter().getRegisters();
  }

  return {
    getU32: (registerIndex: number) => {
      return pvm.getRegisters()[registerIndex];
    },
    setU32: (registerIndex: number, value: number) => {
      const registers = pvm.getRegisters();
      registers[registerIndex] = value;
      pvm.setRegisters(registers);
    },

    // [KrFr] The following functions are not used in the read and write host call handlers. Can be mocked for now.
    /* eslint-disable @typescript-eslint/no-unused-vars */
    getI32: (_registerIndex: number) => {
      return 0;
    },
    setI32: (_registerIndex: number, _value: number) => {},

    getU64: (_registerIndex: number) => {
      return BigInt(0);
    },
    getI64: (_registerIndex: number) => {
      return BigInt(0);
    },
    setU64: (_registerIndex: number, _value: bigint) => {},
    setI64: (_registerIndex: number, _value: bigint) => {},
    /* eslint-enable @typescript-eslint/no-unused-vars */
  };
};

const getMemory = (pvm: PvmApiInterface) => {
  if (isInternalPvm(pvm)) {
    return pvm.getInterpreter().getMemory();
  }

  return {
    loadInto: (result: Uint8Array, startAddress: MemoryIndex) => {
      result = pvm.getPageDump(startAddress);
      return null;
    },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    isWriteable: (_destinationStart: MemoryIndex, _length: number) => {
      return true; // Simulates that the memory slice is writeable
    },
    storeFrom: (address: MemoryIndex, bytes: Uint8Array) => {
      pvm.setMemory(address, bytes);
      return null;
    },

    // [KrFr] The following functions are not used in the read and write host call handlers. Can be mocked for now.
    /* eslint-disable @typescript-eslint/no-unused-vars */
    fromInitialMemory: () => {
      return new Memory(); // Returns the mock itself for simplicity
    },
    reset: () => {},
    copyFrom: (_memory: Memory) => {},
    sbrk: (_length: number) => {
      return 0 as SbrkIndex; // Simulates returning the current sbrk index
    },
    getPageDump: (_pageNumber: number) => {
      return null; // Simulates no page dump available
    },
    getDirtyPages: function* () {
      // Simulates an empty iterator
      yield* [];
    },
    /* eslint-enable @typescript-eslint/no-unused-vars */
  };
};

const hostCall = async ({
  pvm,
  hostCallIdentifier,
  storage,
  serviceId,
}: {
  pvm: PvmApiInterface;
  hostCallIdentifier: HostCallIdentifiers;
  storage: Storage;
  serviceId: number;
}): Promise<HostCallResponse> => {
  if (hostCallIdentifier === HostCallIdentifiers.READ) {
    const readAccounts = new ReadAccounts(storage);
    const jamHostCall = new read.Read(readAccounts);
    // TODO the types are the same, but exported from different packages and lost track of the type
    jamHostCall.currentServiceId = tryAsServiceId(serviceId) as unknown as typeof jamHostCall.currentServiceId;

    await jamHostCall.execute(getGasCounter(pvm), getRegisters(pvm), getMemory(pvm));

    return { hostCallIdentifier, status: CommandStatus.SUCCESS };
  } else if (hostCallIdentifier === HostCallIdentifiers.WRITE) {
    const writeAccounts = new WriteAccounts(storage);
    const jamHostCall = new write.Write(writeAccounts);

    await jamHostCall.execute(getGasCounter(pvm), getRegisters(pvm), getMemory(pvm));

    return { hostCallIdentifier, storage, status: CommandStatus.SUCCESS };
  }

  return { hostCallIdentifier, status: CommandStatus.ERROR, error: new Error("Unknown host call identifier") };
};

export const runHostCall = async ({
  pvm,
  hostCallIdentifier,
  storage,
  serviceId,
}: HostCallParams): Promise<HostCallResponse> => {
  if (!pvm) {
    throw new Error("PVM is uninitialized.");
  }

  if (storage === null) {
    throw new Error("Storage is uninitialized.");
  }

  if (serviceId === null) {
    throw new Error("Service ID is uninitialized.");
  }

  try {
    return await hostCall({ pvm, hostCallIdentifier, storage, serviceId });
  } catch (error) {
    return {
      hostCallIdentifier,
      status: CommandStatus.ERROR,
      error: new Error(error instanceof Error ? error.message : "Unknown error"),
    };
  }
};
