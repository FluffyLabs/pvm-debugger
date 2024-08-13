import { CurrentInstruction, ExpectedState, InitialState, PageMapItem, RegistersArray, Status } from "@/types/pvm";
import { initPvm, nextInstruction } from "./pvm";
import { Pvm as PvmInstance } from "@typeberry/pvm";

export enum Commands {
  INIT = "init",
  STEP = "step",
  RUN = "run",
}

let pvm: typeof PvmInstance | null = null;

export type TargerOnMessageParams =
  | { command: Commands.INIT; payload: { program: number[]; initialState: InitialState } }
  | { command: Commands.STEP; payload: { state: ExpectedState; result: CurrentInstruction; isFinished: boolean } }
  | { command: Commands.RUN; payload: { state: ExpectedState; isFinished: boolean } };

export type WorkerOnMessageParams =
  | { command: Commands.INIT; payload: { program: number[]; initialState: InitialState } }
  | { command: Commands.STEP; payload: { program: number[] } }
  | { command: Commands.RUN };

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
      console.log("step");
      result = nextInstruction(pvm, e.data.payload.program);
      isFinished = pvm.nextStep() !== Status.OK;
      state = {
        pc: pvm.getPC(),
        regs: Array.from(pvm.getRegisters()) as RegistersArray,
        gas: pvm.getGas(),
        pageMap: pvm.getMemory() as unknown as PageMapItem[],
        memory: pvm.getMemory(),
        status: pvm.getStatus() as unknown as Status,
      };

      postMessage({ command: Commands.STEP, payload: { result, state, isFinished } });
      break;
    case Commands.RUN:
      pvm.runProgram();
      state = {
        pc: pvm.getPC(),
        regs: Array.from(pvm.getRegisters()) as RegistersArray,
        gas: pvm.getGas(),
        pageMap: pvm.getMemory() as unknown as PageMapItem[],
        memory: pvm.getMemory(),
        status: pvm.getStatus() as unknown as Status,
      };

      postMessage({ command: Commands.RUN, payload: { state, isFinished: true } });
      break;
    default:
      break;
  }

  postMessage(["received", e.data]);
};
