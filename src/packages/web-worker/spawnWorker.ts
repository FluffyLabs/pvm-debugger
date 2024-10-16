import PvmWorker from "./worker?worker&inline";
import { Commands, TargetOnMessageParams } from "@/packages/web-worker/worker.ts";
import { CurrentInstruction, ExpectedState, InitialState } from "@/types/pvm.ts";
import { Dispatch } from "react";

export const spawnWorker = async ({
  setCurrentState,
  setCurrentInstruction,
  initialState,
  program,
  setIsDebugFinished,
  restartProgram,
}: {
  setCurrentState: Dispatch<ExpectedState>;
  setCurrentInstruction: (instruction: CurrentInstruction) => void;
  breakpointAddresses: number[];
  initialState: InitialState;
  program: number[];
  setIsRunMode: (isRunMode: boolean) => void;
  setIsDebugFinished: (isDebugFinished: boolean) => void;
  restartProgram: (initialState: InitialState) => void;
}) => {
  const worker = new PvmWorker();

  worker.onmessage = (e: MessageEvent<TargetOnMessageParams>) => {
    if (e.data?.command === Commands.LOAD) {
      worker?.postMessage({ command: "init", payload: { program, initialState } });
    }

    if (e.data.command === Commands.STEP) {
      // const { state, isFinished, isRunMode } = e.data.payload;
      const { state, isFinished } = e.data.payload;

      setCurrentState(state);

      setCurrentInstruction(e.data.payload.result);

      // if (isRunMode && !isFinished && state.pc && !breakpointAddresses().includes(state.pc)) {
      //   worker.postMessage({ command: "step", payload: { program: program() } });
      // }
      //
      // if (isRunMode && state.pc && breakpointAddresses().includes(state.pc)) {
      //   worker.postMessage({ command: "stop", payload: { program: program() } });
      //   setIsRunMode(false);
      // }

      if (isFinished) {
        setIsDebugFinished(true);
      }
    }
    if (e.data.command === Commands.LOAD) {
      restartProgram(initialState);
    }

    // if (e.data.command === Commands.INIT) {
    //   memoryActions.initSetPageSize();
    // }

    // if (e.data.command === Commands.MEMORY_SIZE) {
    //   memoryActions.setPageSize(e.data.payload.memorySize);
    // }
    // if (e.data.command === Commands.MEMORY_PAGE) {
    //   if (memory.page.state.isLoading) {
    //     memory.page.setState({
    //       ...memory.page.state,
    //       data: e.data.payload.memoryPage,
    //       pageNumber: e.data.payload.pageNumber,
    //       isLoading: false,
    //     });
    //   }
    // } else if (e.data.command === Commands.MEMORY_RANGE) {
    //   const { start, end, memoryRange } = e.data.payload;
    //   memory.range.setState({
    //     ...memory.range.state,
    //     data: [
    //       ...memory.range.state.data.map((el) =>
    //         el.start === start && el.end === end ? { start, end, data: memoryRange } : el,
    //       ),
    //     ],
    //     isLoading: false,
    //   });
    // }
  };

  return worker;
};
