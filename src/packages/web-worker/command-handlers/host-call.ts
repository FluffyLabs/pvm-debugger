import { HostCallIdentifiers } from "@/types/pvm";
import { CommandStatus, PvmApiInterface, Storage } from "../types";
import { read, Registers, write, Memory, gas } from "@typeberry/jam-host-calls";
import { WriteAccounts } from "@/packages/host-calls/write";
import { isInternalPvm } from "../utils";
import { ReadAccounts } from "@/packages/host-calls/read";
import { tryAsServiceId } from "@typeberry/block";
import { Gas, MemoryIndex, tryAsGas } from "@typeberry/pvm-debugger-adapter";
import { WasmPvmShellInterface } from "../wasmBindgenShell";

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

class SimpleGas {
  pvm!: WasmPvmShellInterface;

  get(): Gas {
    return tryAsGas(this.pvm.getGasLeft());
  }
  set(gas: Gas) {
    if (this.pvm.setGasLeft) {
      this.pvm.setGasLeft(BigInt(gas));
    }
  }
  sub(v: Gas) {
    const current = this.get();
    if (current > v) {
      this.set(tryAsGas(BigInt(current) - BigInt(v)));
      return false;
    }
    // underflow
    this.set(tryAsGas(0));
    return true;
  }
}

const getGasCounter = (pvm: PvmApiInterface) => {
  if (isInternalPvm(pvm)) {
    return pvm.getInterpreter().getGasCounter();
  }

  const gas = new SimpleGas();
  gas.pvm = pvm;

  return gas;
};

class SimpleRegisters implements Registers {
  flatRegisters!: Uint8Array;
  pvm!: WasmPvmShellInterface;

  getU32(registerIndex: number): number {
    return Number(this.getU64(registerIndex) & 0xffff_ffffn);
  }
  getI32(registerIndex: number): number {
    return Number(this.getU32(registerIndex)) >> 0;
  }
  setU32(registerIndex: number, value: number): void {
    this.setU64(registerIndex, BigInt(value));
  }
  setI32(registerIndex: number, value: number): void {
    this.setI64(registerIndex, BigInt(value));
  }
  getU64(registerIndex: number): bigint {
    return new BigUint64Array(this.flatRegisters.buffer)[registerIndex];
  }
  getI64(registerIndex: number): bigint {
    return new BigInt64Array(this.flatRegisters.buffer)[registerIndex];
  }
  setU64(registerIndex: number, value: bigint): void {
    new BigUint64Array(this.flatRegisters.buffer)[registerIndex] = value;
    this.pvm.setRegisters(this.flatRegisters);
  }
  setI64(registerIndex: number, value: bigint): void {
    new BigInt64Array(this.flatRegisters.buffer)[registerIndex] = value;
    this.pvm.setRegisters(this.flatRegisters);
  }
}

const getRegisters = (pvm: PvmApiInterface) => {
  if (isInternalPvm(pvm)) {
    return pvm.getInterpreter().getRegisters();
  }

  const registers = new SimpleRegisters();
  registers.flatRegisters = pvm.getRegisters();
  registers.pvm = pvm;

  return registers;
};

class SimpleMemory implements Memory {
  pvm!: WasmPvmShellInterface;
  memorySize: number = 4096;

  loadInto(result: Uint8Array, startAddress: MemoryIndex) {
    const memoryDump = this.pvm.getPageDump(startAddress / this.memorySize);
    result.set(memoryDump.subarray(0, result.length));

    return null;
  }
  /* eslint-disable-next-line @typescript-eslint/no-unused-vars */
  isWriteable(_destinationStart: MemoryIndex, _length: number) {
    return true;
  }

  storeFrom(address: MemoryIndex, bytes: Uint8Array) {
    // TODO [ToDr] Either change the API to require handling multi-page writes or change this code to split the write into multiple pages.
    this.pvm.setMemory(address, bytes);
    return null;
  }
}

const getMemory = (pvm: PvmApiInterface) => {
  if (isInternalPvm(pvm)) {
    return pvm.getInterpreter().getMemory();
  }
  const memory = new SimpleMemory();
  memory.pvm = pvm;

  return memory;
};

const hostCall = async ({
  pvm,
  hostCallIdentifier,
  storage,
  serviceId,
}: {
  pvm: PvmApiInterface;
  hostCallIdentifier: HostCallIdentifiers;
  storage: Storage | null;
  serviceId: number;
}): Promise<HostCallResponse> => {
  if (hostCallIdentifier === HostCallIdentifiers.READ) {
    if (storage === null) {
      throw new Error("Storage is uninitialized.");
    }

    const readAccounts = new ReadAccounts(storage);
    const jamHostCall = new read.Read(readAccounts);
    // TODO the types are the same, but exported from different packages and lost track of the type
    jamHostCall.currentServiceId = tryAsServiceId(serviceId) as unknown as typeof jamHostCall.currentServiceId;
    const registers = getRegisters(pvm);
    await jamHostCall.execute(getGasCounter(pvm), registers, getMemory(pvm));

    return { hostCallIdentifier, status: CommandStatus.SUCCESS };
  } else if (hostCallIdentifier === HostCallIdentifiers.WRITE) {
    if (storage === null) {
      throw new Error("Storage is uninitialized.");
    }

    const writeAccounts = new WriteAccounts(storage);
    const jamHostCall = new write.Write(writeAccounts);

    await jamHostCall.execute(getGasCounter(pvm), getRegisters(pvm), getMemory(pvm));

    return { hostCallIdentifier, storage, status: CommandStatus.SUCCESS };
  } else if (hostCallIdentifier === HostCallIdentifiers.GAS) {
    const jamHostCall = new gas.Gas();

    await jamHostCall.execute(getGasCounter(pvm), getRegisters(pvm));

    return { hostCallIdentifier, status: CommandStatus.SUCCESS };
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
