import { CurrentInstruction, ExpectedState, Status } from "@/types/pvm";
import { nextInstruction } from "../pvm";
import { getState } from "../utils";
import { CommandStatus, PvmApiInterface, Storage } from "../types";

export type StepParams = {
  program: Uint8Array;
  pvm: PvmApiInterface | null;
  stepsToPerform: number;
  storage: Storage | null;
  serviceId: number | null;
};
export type StepResponse = {
  status: CommandStatus;
  error?: unknown;
  result: CurrentInstruction | object;
  state: ExpectedState;
  exitArg: number;
  isFinished: boolean;
};

const step = async ({ pvm, program, stepsToPerform }: StepParams) => {
  if (!pvm) {
    throw new Error("PVM is uninitialized.");
  }

  let isFinished = stepsToPerform > 1 ? !pvm.nSteps(stepsToPerform) : !pvm.nextStep();
  const state = await getState(pvm);

  // It's not really finished if we're in host status
  if (isFinished && state.status === Status.HOST) {
    isFinished = false;
  }

  const result = nextInstruction(state.pc ?? 0, program) as unknown as CurrentInstruction;

  return { result, state, isFinished, exitArg: await pvm.getExitArg() };
};

export const runStep = async ({
  pvm,
  program,
  stepsToPerform,
  storage,
  serviceId,
}: StepParams): Promise<StepResponse> => {
  try {
    const data = await step({ pvm, program, stepsToPerform, storage, serviceId });
    return { status: CommandStatus.SUCCESS, ...data };
  } catch (error) {
    return { status: CommandStatus.ERROR, error, isFinished: true, result: {}, state: {}, exitArg: 0 };
  }
};
