import { CommandStatus, PvmApiInterface } from "../types";

export type SetMemoryParams = {
  pvm: PvmApiInterface | null;
  address: number;
  data: Uint8Array;
};

export type SetMemoryResponse = {
  status: CommandStatus;
  error?: unknown;
};

export const runSetMemory = async ({ pvm, address, data }: SetMemoryParams): Promise<SetMemoryResponse> => {
  if (!pvm) {
    return {
      status: CommandStatus.ERROR,
      error: new Error("PVM is uninitialized."),
    };
  }

  try {
    // Use the PVM's setMemory API to write data
    pvm.setMemory(address, data);

    return {
      status: CommandStatus.SUCCESS,
    };
  } catch (error) {
    return {
      status: CommandStatus.ERROR,
      error,
    };
  }
};
