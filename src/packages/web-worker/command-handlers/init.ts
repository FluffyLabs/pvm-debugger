import { InitialState } from "@/types/pvm";
import { initPvm } from "../pvm";
import { getState, isInternalPvm, regsAsUint8 } from "../utils";
import { Pvm as InternalPvmInstance } from "@typeberry/pvm-debugger-adapter";
import { logger } from "@/utils/loggerService";
import { CommandStatus, PvmApiInterface } from "../types";

export type InitParams = {
  pvm: PvmApiInterface | null;
  program: Uint8Array;
  initialState: InitialState;
};
export type InitResponse = {
  initialState: InitialState;
  status: CommandStatus;
  error?: unknown;
};

const init = async ({ pvm, program, initialState }: InitParams) => {
  if (!pvm) {
    throw new Error("PVM is uninitialized.");
  }
  if (isInternalPvm(pvm)) {
    logger.info("PVM init internal", pvm);
    // TODO Fix type guards
    initPvm(pvm as InternalPvmInstance, program, initialState);
  } else {
    logger.info("PVM init external", pvm);
    const gas = initialState.gas || 10000;
    pvm.resetGeneric(program, regsAsUint8(initialState.regs), BigInt(gas));
    pvm.setNextProgramCounter(initialState.pc ?? 0);
    pvm.setGasLeft(BigInt(gas));
    pvm.nextStep();
  }
};

export const runInit = async ({ pvm, program, initialState }: InitParams): Promise<InitResponse> => {
  if (program.length === 0) {
    console.warn("Skipping init, no program yet.");
    return {
      status: CommandStatus.SUCCESS,
      initialState: {},
    };
  }

  try {
    await init({ pvm, program, initialState });

    return {
      status: CommandStatus.SUCCESS,
      initialState: pvm ? getState(pvm) : {},
    };
  } catch (error) {
    return {
      status: CommandStatus.ERROR,
      error,
      initialState: pvm ? getState(pvm) : {},
    };
  }
};
