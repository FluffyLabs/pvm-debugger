import { InitialState, SpiProgram } from "@/types/pvm";
import { initPvm } from "../pvm";
import { chunksAsUint8, getState, isInternalPvm, pageMapAsUint8, regsAsUint8 } from "../utils";
import { logger } from "@/utils/loggerService";
import { CommandStatus, PvmApiInterface } from "../types";

export type InitParams = {
  pvm: PvmApiInterface | null;
  spiProgram: SpiProgram | null;
  spiArgs: Uint8Array | null;
  program: Uint8Array;
  initialState: InitialState;
};
export type InitResponse = {
  initialState: InitialState;
  status: CommandStatus;
  error?: unknown;
};

const init = async ({ pvm, spiProgram, spiArgs, program, initialState }: InitParams) => {
  if (!pvm) {
    throw new Error("PVM is uninitialized.");
  }

  const pc = initialState.pc ?? 0;
  const gas = initialState.gas ?? 10_000n;

  const initRest = () => {
    if (pvm.setNextProgramCounter) {
      pvm.setNextProgramCounter(initialState.pc ?? 0);
    }
    if (pvm.setGasLeft) {
      pvm.setGasLeft(BigInt(gas));
    }
    if (!isInternalPvm(pvm)) {
      pvm.nextStep();
    }
  };

  if (pvm.resetJAM && spiProgram !== null) {
    pvm.resetJAM(spiProgram.program, pc, gas, spiArgs ?? new Uint8Array(), spiProgram.hasMetadata);
    initRest();
    return;
  }

  if (isInternalPvm(pvm)) {
    logger.info("PVM init internal", pvm);
    initPvm(pvm, program, initialState);
    initRest();
    return;
  }

  if (pvm.resetGenericWithMemory) {
    if (spiProgram !== null) {
      console.warn("JAM fallback initialization - no resetJAM method");
    }
    pvm.resetGenericWithMemory(
      program,
      regsAsUint8(initialState.regs),
      pageMapAsUint8(initialState.pageMap),
      chunksAsUint8(initialState.memory),
      BigInt(gas),
    );
    initRest();
    return;
  }

  if (pvm.resetGeneric) {
    console.warn("Ignoring memory initialization, because there is no resetGenericWithMemory");
    pvm.resetGeneric(program, regsAsUint8(initialState.regs), BigInt(gas));
    initRest();
    return;
  }

  throw new Error("Unable to reset the PVM - unknown API");
};

export const runInit = async ({
  spiArgs,
  spiProgram,
  pvm,
  program,
  initialState,
}: InitParams): Promise<InitResponse> => {
  if (program.length === 0) {
    console.warn("Skipping init, no program yet.");
    return {
      status: CommandStatus.SUCCESS,
      initialState: {},
    };
  }

  try {
    await init({ spiArgs, spiProgram, pvm, program, initialState });

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
