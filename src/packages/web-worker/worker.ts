/* eslint-disable no-case-declarations */

import { CurrentInstruction, ExpectedState, InitialState, PageMapItem, RegistersArray, Status } from "@/types/pvm";
import { initPvm, nextInstruction } from "./pvm";
import { Pvm as PvmInstance } from "@typeberry/pvm";

export enum Commands {
  INIT = "init",
  STEP = "step",
}

let pvm: typeof PvmInstance | null = null;

export type TargerOnMessageParams =
  | { command: Commands.INIT; payload: { program: number[]; initialState: InitialState } }
  | { command: Commands.STEP; payload: { state: ExpectedState; result: CurrentInstruction; isFinished: boolean } };

export type WorkerOnMessageParams =
  | { command: Commands.INIT; payload: { program: number[]; initialState: InitialState } }
  | { command: Commands.STEP; payload: { program: number[] } };

onmessage = async (e: MessageEvent<WorkerOnMessageParams>) => {
  console.log(e.data.command);
  switch (e.data?.command) {
    case Commands.INIT:
      pvm = initPvm(e.data.payload.program, e.data.payload.initialState);
      postMessage({ command: Commands.INIT, result: "success" });
      break;
    case Commands.STEP:
      const result = nextInstruction(pvm, e.data.payload.program);
      const state = {
        pc: pvm.getPC(),
        regs: Array.from(pvm.getRegisters()) as RegistersArray,
        gas: pvm.getGas(),
        pageMap: pvm.getMemory() as unknown as PageMapItem[],
        memory: pvm.getMemory(),
        status: pvm.getStatus() as unknown as Status,
      };

      postMessage({ command: Commands.STEP, result: { result, state, isFinished: pvm.nextStep() !== Status.OK } });
      break;
    default:
      break;
  }

  postMessage(["received", e.data]);
};
