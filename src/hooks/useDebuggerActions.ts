import { ProgramUploadFileOutput } from "@/components/ProgramLoader/types";
import { disassemblify } from "@/packages/pvm/pvm/disassemblify";
import {
  setInitialState,
  setIsDebugFinished,
  setIsRunMode,
  setClickedInstruction,
  setProgram,
  setProgramPreviewResult,
  setPvmInitialized,
  setIsAsmError,
  setBreakpointAddresses,
} from "@/store/debugger/debuggerSlice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  setAllWorkersCurrentState,
  setAllWorkersPreviousState,
  initAllWorkers,
  refreshPageAllWorkers,
  setAllWorkersCurrentInstruction,
} from "@/store/workers/workersSlice";
import { ExpectedState } from "@/types/pvm";
import { logger } from "@/utils/loggerService";
import { InitialState, Status } from "@typeberry/pvm-debugger-adapter";
import { useCallback } from "react";

export const useDebuggerActions = () => {
  const { programPreviewResult, breakpointAddresses } = useAppSelector((state) => state.debugger);

  const dispatch = useAppDispatch();

  const restartProgram = useCallback(
    (state: InitialState) => {
      setInitialState(state);
      dispatch(setIsDebugFinished(false));
      dispatch(setIsRunMode(false));
      dispatch(setAllWorkersCurrentState(state));
      dispatch(setAllWorkersPreviousState(state));
      dispatch(initAllWorkers());
      dispatch(refreshPageAllWorkers());
      dispatch(setAllWorkersCurrentInstruction(programPreviewResult?.[0]));
      dispatch(setClickedInstruction(null));
    },
    [dispatch, programPreviewResult],
  );

  const startProgram = useCallback(
    (initialState: ExpectedState, newProgram: number[]) => {
      dispatch(setInitialState(initialState));
      dispatch(setProgram(newProgram));
      const currentState = {
        pc: 0,
        regs: initialState.regs,
        gas: initialState.gas,
        pageMap: initialState.pageMap,
        status: Status.OK,
      };
      dispatch(setAllWorkersCurrentState(currentState));
      dispatch(setAllWorkersPreviousState(currentState));

      setIsDebugFinished(false);

      dispatch(initAllWorkers());

      try {
        const result = disassemblify(new Uint8Array(newProgram));
        logger.info("Disassembly result:", result);
        dispatch(setProgramPreviewResult(result));
        dispatch(setAllWorkersCurrentInstruction(result?.[0]));
        dispatch(setPvmInitialized(true));
      } catch (e) {
        console.error("Error disassembling program", e);
      }
    },
    [dispatch],
  );

  const handleProgramLoad = useCallback(
    (data?: ProgramUploadFileOutput) => {
      if (data) {
        startProgram(data.initial, data.program);
        dispatch(setIsAsmError(false));
      } else {
        dispatch(setIsAsmError(true));
      }
    },
    [startProgram, dispatch],
  );

  const handleBreakpointClick = (address: number) => {
    if (breakpointAddresses.includes(address)) {
      dispatch(setBreakpointAddresses(breakpointAddresses.filter((x) => x !== address)));
    } else {
      dispatch(setBreakpointAddresses([...breakpointAddresses, address]));
    }
  };

  return {
    startProgram,
    restartProgram,
    handleProgramLoad,
    handleBreakpointClick,
  };
};
