import { InitialState } from "@/types/pvm";
import { initPvm } from "../pvm";
import { chunksAsUint8, getState, isInternalPvm, pageMapAsUint8, regsAsUint8 } from "../utils";
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
    initPvm(pvm, program, initialState);
  } else {
    logger.info("PVM init external", pvm);
    const gas = initialState.gas || 10000;
    if (pvm.resetGenericWithMemory) {
      pvm.resetGenericWithMemory(
        program,
        regsAsUint8(initialState.regs),
        pageMapAsUint8(initialState.pageMap),
        chunksAsUint8(initialState.memory),
        BigInt(gas),
      );
    } else if (pvm.resetGeneric) {
      pvm.resetGeneric(program, regsAsUint8(initialState.regs), BigInt(gas));
    }
    pvm.setNextProgramCounter && pvm.setNextProgramCounter(initialState.pc ?? 0);
    pvm.setGasLeft && pvm.setGasLeft(BigInt(gas));
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
      initialState: pvm ? await getState(pvm) : {},
    };
  } catch (error) {
    return {
      status: CommandStatus.ERROR,
      error,
      initialState: pvm ? await getState(pvm) : {},
    };
  }
};
