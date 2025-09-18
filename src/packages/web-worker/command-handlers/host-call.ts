import { CommandStatus, PvmApiInterface } from "../types";
import { numbers, pvm_host_calls, utils, pvm_interpreter } from "@typeberry/lib";
import { isInternalPvm } from "../utils";
import { WasmPvmShellInterface } from "../wasmBindgenShell";

const { tryAsU64 } = numbers;

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

class SimpleRegisters implements pvm_host_calls.IHostCallRegisters {
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
    return new pvm_host_calls.HostCallRegisters(regs);
  }

  const registers = new SimpleRegisters();
  const regs = new pvm_interpreter.Registers();
  const rawRegs = new BigUint64Array(pvm.getRegisters().buffer);
  regs.copyFrom(rawRegs);
  registers.flatRegisters = pvm.getRegisters();
  registers.pvm = pvm;

  return registers;
};

class SimpleMemory implements pvm_host_calls.IHostCallMemory {
  pvm!: WasmPvmShellInterface;
  memorySize: number = 4096;

  loadInto(result: Uint8Array, startAddress: numbers.U64) {
    const memoryDump = this.pvm.getPageDump(Number(startAddress / tryAsU64(this.memorySize)));
    result.set(memoryDump.subarray(0, result.length));
    // eslint-disable-next-line
    return utils.Result.ok("ok" as any);
  }

  storeFrom(address: numbers.U64, bytes: Uint8Array) {
    // TODO [ToDr] Either change the API to require handling multi-page writes or change this code to split the write into multiple pages.
    this.pvm.setMemory(Number(address), bytes);
    // eslint-disable-next-line
    return utils.Result.ok("ok" as any);
  }

  getMemory() {
    // TODO [MaSi]: This function is used only by `peek` and `poke` host calls, so dummy implementation is okay for now.
    return new pvm_interpreter.Memory();
  }
}

const getMemory = (pvm: PvmApiInterface) => {
  if (isInternalPvm(pvm)) {
    return new pvm_host_calls.HostCallMemory(pvm.getInterpreter().getMemory());
  }
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
