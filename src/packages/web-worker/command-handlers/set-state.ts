import { ExpectedState } from "@/types/pvm";
import { getState, regsAsUint8 } from "../utils";
import { CommandStatus, PvmApiInterface } from "../types";

export type SetStateParams = {
  pvm: PvmApiInterface | null;
  regs: bigint[];
  gas: bigint;
};

export type SetStateResponse = {
  state: ExpectedState;
  status: CommandStatus;
  error?: unknown;
};

export const runSetState = async ({ pvm, regs, gas }: SetStateParams): Promise<SetStateResponse> => {
  if (!pvm) {
    return {
      status: CommandStatus.ERROR,
      error: new Error("PVM is uninitialized."),
      state: {},
    };
  }

  try {
    // Set registers
    const regsArray =
      regs.length === 13
        ? (regs as [
            bigint,
            bigint,
            bigint,
            bigint,
            bigint,
            bigint,
            bigint,
            bigint,
            bigint,
            bigint,
            bigint,
            bigint,
            bigint,
          ])
        : undefined;
    const regsBytes = regsAsUint8(regsArray);
    pvm.setRegisters(regsBytes);

    // Set gas
    if (pvm.setGasLeft) {
      pvm.setGasLeft(gas);
    }

    const state = await getState(pvm);

    return {
      status: CommandStatus.SUCCESS,
      state,
    };
  } catch (error) {
    return {
      status: CommandStatus.ERROR,
      error,
      state: pvm ? await getState(pvm) : {},
    };
  }
};
