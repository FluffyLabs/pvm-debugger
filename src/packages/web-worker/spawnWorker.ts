import PvmWorker from "./worker?worker&inline";
import { Commands, TargerOnMessageParams } from "@/packages/web-worker/worker.ts";
import { CurrentInstruction, ExpectedState, InitialState } from "@/types/pvm.ts";
import { Dispatch, SetStateAction } from "react";

export const spawnWorker = async ({
  setCurrentState,
  setPreviousState,
  setCurrentInstruction,
  breakpointAddresses,
  initialState,
  program,
  setIsRunMode,
  setIsDebugFinished,
  restartProgram,
}: {
  setCurrentState: Dispatch<SetStateAction<ExpectedState>>;
  setPreviousState: Dispatch<SetStateAction<ExpectedState>>;
  setCurrentInstruction: (instruction: CurrentInstruction) => void;
  breakpointAddresses: (number | undefined)[];
  initialState: InitialState;
  program: number[];
  setIsRunMode: (isRunMode: boolean) => void;
  setIsDebugFinished: (isDebugFinished: boolean) => void;
  restartProgram: (initialState: InitialState) => void;
}) => {
  const worker = new PvmWorker();

  worker.onmessage = (e: MessageEvent<TargerOnMessageParams>) => {
    if (e.data?.command === Commands.LOAD) {
      worker?.postMessage({ command: "init", payload: { program, initialState } });
    }

    if (e.data.command === Commands.STEP) {
      const { state, isFinished, isRunMode } = e.data.payload;

      setCurrentState((prevState) => {
        setPreviousState(prevState);
        return state;
      });

      if (e.data.command === Commands.STEP) {
        setCurrentInstruction(e.data.payload.result);
      }

      if (isRunMode && !isFinished && state.pc && !breakpointAddresses.includes(state.pc)) {
        worker.postMessage({ command: "step", payload: { program } });
      }

      if (isRunMode && state.pc && breakpointAddresses.includes(state.pc)) {
        worker.postMessage({ command: "stop", payload: { program } });
        setIsRunMode(false);
      }

      if (isFinished) {
        setIsDebugFinished(true);
      }
    }
    if (e.data.command === Commands.LOAD) {
      restartProgram(initialState);
    }
  };

  return worker;
};
