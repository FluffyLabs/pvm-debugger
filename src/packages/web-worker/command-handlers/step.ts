import { ExpectedState, Status } from "@/types/pvm";
import { getState } from "../utils";
import { CommandStatus, PvmApiInterface } from "../types";

export type StepParams = {
  pvm: PvmApiInterface | null;
  stepsToPerform: number;
  serviceId: number | null;
};
export type StepResponse = {
  status: CommandStatus;
  error?: unknown;
  currentPc: number;
  state: ExpectedState;
  exitArg: number;
  isFinished: boolean;
};

const step = async ({ pvm, stepsToPerform }: StepParams) => {
  if (!pvm) {
    throw new Error("PVM is uninitialized.");
  }

  let isFinished = await new Promise<boolean>((resolve) => {
    // make sure that we don't block the thread on internal pvm
    // NOTE maybe it would be better if the internal PVM was async?
    setTimeout(() => {
      resolve(stepsToPerform > 1 ? !pvm.nSteps(stepsToPerform) : !pvm.nextStep());
    }, 0);
  });
  const state = await getState(pvm);

  // It's not really finished if we're in host status
  if (isFinished && state.status === Status.HOST) {
    isFinished = false;
  }

  return { state, isFinished, currentPc: state.pc ?? 0, exitArg: pvm.getExitArg() };
};

export const runStep = async ({ pvm, stepsToPerform, serviceId }: StepParams): Promise<StepResponse> => {
  try {
    const data = await step({ pvm, stepsToPerform, serviceId });
    return { status: CommandStatus.SUCCESS, ...data };
  } catch (error) {
    return { status: CommandStatus.ERROR, error, isFinished: true, currentPc: 0, state: {}, exitArg: 0 };
  }
};
