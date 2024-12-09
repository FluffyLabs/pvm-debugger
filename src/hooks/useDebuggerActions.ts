import { ProgramUploadFileOutput } from "@/components/ProgramLoader/types";
import { SelectedPvmWithPayload } from "@/components/PvmSelect";
import { disassemblify } from "@/packages/pvm/pvm/disassemblify";
import { PvmTypes } from "@/packages/web-worker/types";
import {
  setBreakpointAddresses,
  setClickedInstruction,
  setInitialState,
  setIsProgramInvalid,
  setIsDebugFinished,
  setIsRunMode,
  setProgram,
  setProgramPreviewResult,
  setPvmInitialized,
  setIsStepMode,
} from "@/store/debugger/debuggerSlice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  createWorker,
  destroyWorker,
  initAllWorkers,
  loadWorker,
  refreshPageAllWorkers,
  setAllWorkersCurrentInstruction,
  setAllWorkersCurrentState,
  setAllWorkersPreviousState,
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
    async (state: ExpectedState) => {
      dispatch(setInitialState(state));
      dispatch(setIsDebugFinished(false));
      dispatch(setIsRunMode(false));
      dispatch(setIsStepMode(false));
      dispatch(setAllWorkersCurrentState(state));
      dispatch(setAllWorkersPreviousState(state));
      await dispatch(initAllWorkers()).unwrap();
      await dispatch(refreshPageAllWorkers()).unwrap();
      dispatch(setAllWorkersCurrentInstruction(programPreviewResult?.[0]));
      dispatch(setClickedInstruction(null));
    },
    [dispatch, programPreviewResult],
  );

  const startProgram = useCallback(
    async (initialState: ExpectedState, newProgram: number[]) => {
      dispatch(setInitialState(initialState));
      dispatch(setProgram(newProgram));
      const currentState = {
        pc: initialState.pc ?? 0,
        regs: initialState.regs,
        gas: initialState.gas,
        pageMap: initialState.pageMap,
        status: Status.OK,
      };
      dispatch(setAllWorkersCurrentState(currentState));
      dispatch(setAllWorkersPreviousState(currentState));
      dispatch(setIsDebugFinished(false));
      dispatch(setIsRunMode(false));
      await dispatch(initAllWorkers()).unwrap();

      const result = disassemblify(new Uint8Array(newProgram));
      logger.info("Disassembly result:", result);
      dispatch(setProgramPreviewResult(result));
      dispatch(setAllWorkersCurrentInstruction(result?.[0]));
      dispatch(setPvmInitialized(true));
    },
    [dispatch],
  );

  const handleProgramLoad = useCallback(
    async (data?: ProgramUploadFileOutput) => {
      if (data) {
        await startProgram({ ...data.initial, status: Status.OK }, data.program);

        dispatch(setIsProgramInvalid(false));
      } else {
        dispatch(setIsProgramInvalid(true));
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

  const handlePvmTypeChange = useCallback(
    async (selectedPvms: SelectedPvmWithPayload[]) => {
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

      await restartProgram(initialState);
    },
    [dispatch, initialState, restartProgram, workers],
  );

  return {
    startProgram,
    restartProgram,
    handleProgramLoad,
    handleBreakpointClick,
    handlePvmTypeChange,
  };
};
