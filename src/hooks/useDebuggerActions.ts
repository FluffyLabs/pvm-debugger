import { ProgramUploadFileOutput } from "@/components/ProgramLoader/types";
import { SelectedPvmWithPayload } from "@/components/PvmSelect";
import { disassemblify } from "@/packages/pvm/pvm/disassemblify";
import { PvmTypes } from "@/packages/web-worker/worker";
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
  createWorker,
  destroyWorker,
  loadWorker,
  WorkerState,
} from "@/store/workers/workersSlice";
import { AvailablePvms, ExpectedState, Status } from "@/types/pvm";
import { logger } from "@/utils/loggerService";
import { useCallback } from "react";

export const useDebuggerActions = () => {
  const { programPreviewResult, breakpointAddresses, initialState } = useAppSelector((state) => state.debugger);
  const workers = useAppSelector((state) => state.workers);

  const dispatch = useAppDispatch();

  const restartProgram = useCallback(
    (state: ExpectedState) => {
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

      dispatch(setIsDebugFinished(false));

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
        startProgram({ ...data.initial, status: -1 }, data.program);
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

  const handlePvmTypeChange = async (selectedPvms: SelectedPvmWithPayload[]) => {
    logger.debug("selectedPvms vs workers ", selectedPvms, workers);

    await Promise.all(
      workers.map((worker: WorkerState) => {
        dispatch(destroyWorker(worker.id)).unwrap();
      }),
    );

    await Promise.all(
      selectedPvms.map(async ({ id, type, params }) => {
        logger.info("Selected PVM type", id, type, params);

        if (workers.find((worker: WorkerState) => worker.id === id)) {
          logger.info("Worker already initialized");
          // TODO: for now just initialize the worker one more time
        }
        logger.info("Worker not initialized");

        if (id === AvailablePvms.POLKAVM) {
          await dispatch(createWorker(AvailablePvms.POLKAVM)).unwrap();
          await dispatch(
            loadWorker({
              id,
              payload: {
                type: PvmTypes.WASM_URL as PvmTypes,
                params,
              },
            }),
          ).unwrap();
        } else if (id === AvailablePvms.TYPEBERRY) {
          await dispatch(createWorker(AvailablePvms.TYPEBERRY)).unwrap();
          await dispatch(
            loadWorker({
              id,
              payload: {
                type: PvmTypes.BUILT_IN,
              },
            }),
          ).unwrap();
        } else if (type === AvailablePvms.WASM_FILE) {
          await dispatch(createWorker(id)).unwrap();
          await dispatch(
            loadWorker({
              id,
              payload: {
                type: PvmTypes.WASM_FILE,
                params,
              },
            }),
          ).unwrap();
        } else if (type === AvailablePvms.WASM_URL) {
          await dispatch(createWorker(id)).unwrap();
          await dispatch(
            loadWorker({
              id,
              payload: {
                type: PvmTypes.WASM_URL,
                params,
              },
            }),
          ).unwrap();
        }
      }),
    );

    restartProgram(initialState);
  };

  return {
    startProgram,
    restartProgram,
    handleProgramLoad,
    handleBreakpointClick,
    handlePvmTypeChange,
  };
};
