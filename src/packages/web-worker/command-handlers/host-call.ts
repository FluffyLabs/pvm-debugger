import { HostCallIdentifiers } from "@/types/pvm";
import { CommandStatus, PvmApiInterface, Storage } from "../types";
import {
  read,
  write,
  gas,
  HostCallRegisters,
  Result,
  interpreter,
  numbers,
  Registers,
  IHostCallMemory,
  IHostCallRegisters,
  OK,
  HostCallMemory,
} from "@typeberry/pvm-debugger-adapter";
import { WriteAccounts } from "@/packages/host-calls/write";
import { isInternalPvm } from "../utils";
import { ReadAccounts } from "@/packages/host-calls/read";
import { block } from "@typeberry/pvm-debugger-adapter";
import { WasmPvmShellInterface } from "../wasmBindgenShell";

const { tryAsGas } = interpreter;
const { tryAsU64 } = numbers;
const { tryAsServiceId } = block;
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

  get() {
    return tryAsGas(this.pvm.getGasLeft());
  }
  set(gas: interpreter.Gas) {
    if (this.pvm.setGasLeft) {
      this.pvm.setGasLeft(BigInt(gas));
    }
  }
  sub(v: interpreter.Gas) {
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
class SimpleRegisters implements IHostCallRegisters {
  flatRegisters!: Uint8Array;
  pvm!: WasmPvmShellInterface;

  get(registerIndex: number): numbers.U64 {
    return tryAsU64(new BigUint64Array(this.flatRegisters.buffer)[registerIndex]);
  }

  set(registerIndex: number, value: numbers.U64): void {
    new BigUint64Array(this.flatRegisters.buffer)[registerIndex] = value;
    this.pvm.setRegisters(this.flatRegisters);
  }
}

const getRegisters = (pvm: PvmApiInterface) => {
  if (isInternalPvm(pvm)) {
    const regs = pvm.getInterpreter().getRegisters();
    return new HostCallRegisters(regs);
  }

  const registers = new SimpleRegisters();
  const regs = new Registers();
  const rawRegs = new BigUint64Array(pvm.getRegisters().buffer);
  regs.copyFrom(rawRegs);
  registers.flatRegisters = pvm.getRegisters();
  registers.pvm = pvm;

  return registers;
};

class SimpleMemory implements IHostCallMemory {
  pvm!: WasmPvmShellInterface;
  memorySize: number = 4096;

  loadInto(result: Uint8Array, startAddress: numbers.U64) {
    const memoryDump = this.pvm.getPageDump(Number(startAddress / tryAsU64(this.memorySize)));
    result.set(memoryDump.subarray(0, result.length));

    return Result.ok(OK);
  }

  storeFrom(address: numbers.U64, bytes: Uint8Array) {
    // TODO [ToDr] Either change the API to require handling multi-page writes or change this code to split the write into multiple pages.
    this.pvm.setMemory(Number(address), bytes);
    return Result.ok(OK);
  }

  getMemory() {
    // TODO [MaSi]: This function is used only by `peek` and `poke` host calls, so dummy implementation is okay for now.
    return new interpreter.Memory();
  }
}

const getMemory = (pvm: PvmApiInterface) => {
  if (isInternalPvm(pvm)) {
    return new HostCallMemory(pvm.getInterpreter().getMemory());
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
    const jamHostCall = new gas.GasHostCall();

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
