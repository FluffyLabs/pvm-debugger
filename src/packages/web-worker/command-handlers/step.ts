import { CurrentInstruction, ExpectedState, Status } from "@/types/pvm";
import { nextInstruction } from "../pvm";
import { isInternalPvm, getState } from "../utils";
import { CommandStatus, PvmApiInterface } from "../types";

export type StepParams = { program: Uint8Array; pvm: PvmApiInterface | null };
export type StepResponse = {
  status: CommandStatus;
  error?: unknown;
  result: CurrentInstruction | object;
  state: ExpectedState;
  isFinished: boolean;
};

const step = ({ pvm, program }: StepParams) => {
  if (!pvm) {
    throw new Error("PVM is uninitialized.");
  }

  let isFinished: boolean;
  if (isInternalPvm(pvm)) {
    // TODO: remove the -1 check as soon as OK status is not -1 in PVM and PolkaVM anymore
    const nextStep = pvm.nextStep();
    isFinished = nextStep !== Status.OK && Number(nextStep) !== -1;
  } else {
    isFinished = !pvm.nextStep();
  }

  const state = getState(pvm);
  const result = nextInstruction(state.pc ?? 0, program) as unknown as CurrentInstruction;

  return { result, state, isFinished };
};

export const runStep = ({ pvm, program }: StepParams): StepResponse => {
  return { status: CommandStatus.ERROR, error: new Error("dddd"), isFinished: true, result: {}, state: {} };

  try {
    const data = step({ pvm, program });
    return { status: CommandStatus.SUCCESS, ...data };
  } catch (error) {
    return { status: CommandStatus.ERROR, error, isFinished: true, result: {}, state: {} };
  }
};
