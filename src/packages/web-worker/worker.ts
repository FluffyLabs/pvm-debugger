import { CurrentInstruction, ExpectedState, InitialState, PageMapItem, RegistersArray, Status } from "@/types/pvm";
import { initPvm, nextInstruction } from "./pvm";
import { Pvm as PvmInstance } from "@typeberry/pvm";

export enum Commands {
  INIT = "init",
  STEP = "step",
  RUN = "run",
  STOP = "stop",
}

let pvm: typeof PvmInstance | null = null;
let isRunMode = false;

export type TargerOnMessageParams =
  | { command: Commands.INIT; payload: { program: number[]; initialState: InitialState } }
  | {
      command: Commands.STEP;
      payload: { state: ExpectedState; result: CurrentInstruction; isFinished: boolean; isRunMode: boolean };
    }
  | { command: Commands.RUN; payload: { state: ExpectedState; isFinished: boolean; isRunMode: boolean } }
  | { command: Commands.STOP; payload: { isRunMode: boolean } };

export type WorkerOnMessageParams =
  | { command: Commands.INIT; payload: { program: number[]; initialState: InitialState } }
  | { command: Commands.STEP; payload: { program: number[] } }
  | { command: Commands.RUN }
  | { command: Commands.STOP };

onmessage = async (e: MessageEvent<WorkerOnMessageParams>) => {
  if (!e.data?.command) {
    return;
  }

  let result;
  let state;
  // let program;
  let isFinished;
  switch (e.data.command) {
    case Commands.INIT:
      pvm = initPvm(e.data.payload.program, e.data.payload.initialState);
      postMessage({ command: Commands.INIT, result: "success" });
      break;
    case Commands.STEP:
      isFinished = pvm.nextStep() !== Status.OK;
      result = nextInstruction(pvm, e.data.payload.program);
      state = {
        pc: pvm.getPC(),
        regs: Array.from(pvm.getRegisters()) as RegistersArray,
        gas: pvm.getGas(),
        pageMap: pvm.getMemory() as unknown as PageMapItem[],
        memory: pvm.getMemory(),
        status: pvm.getStatus() as unknown as Status,
      };

      postMessage({ command: Commands.STEP, payload: { result, state, isFinished, isRunMode } });
      break;
    case Commands.RUN:
      isRunMode = true;
      state = {
        pc: pvm.getPC(),
        regs: Array.from(pvm.getRegisters()) as RegistersArray,
        gas: pvm.getGas(),
        pageMap: pvm.getMemory() as unknown as PageMapItem[],
        memory: pvm.getMemory(),
        status: pvm.getStatus() as unknown as Status,
      };
      postMessage({ command: Commands.RUN, payload: { isRunMode, state, isFinished: true } });
      break;
    case Commands.STOP:
      isRunMode = false;
      postMessage({ command: Commands.RUN, payload: { isRunMode } });
      break;
    default:
      break;
  }

  postMessage(["received", e.data]);
};
