import { CurrentInstruction, ExpectedState, Status } from "@/types/pvm";
import { nextInstruction } from "../pvm";
import { isInternalPvm, getState } from "../utils";
import { CommandStatus, PvmApiInterface } from "../worker";

export type StepParams = { program: number[]; pvm: PvmApiInterface | null };
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
    isFinished = pvm.nextStep() !== Status.OK;
  } else {
    isFinished = !pvm.nextStep();
  }

  const state = getState(pvm);
  const result = nextInstruction(state.pc ?? 0, program) as unknown as CurrentInstruction;

  return { result, state, isFinished };
};

export const runStep = ({ pvm, program }: StepParams): StepResponse => {
  try {
    const data = step({ pvm, program });
    return { status: CommandStatus.SUCCESS, ...data };
  } catch (error) {
    return { status: CommandStatus.ERROR, error, isFinished: true, result: {}, state: {} };
  }
};
