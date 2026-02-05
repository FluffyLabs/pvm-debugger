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
  setPvmLoaded,
  resetHostCallIndex,
} from "@/store/debugger/debuggerSlice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  createWorker,
  destroyWorker,
  initAllWorkers,
  loadWorker,
  refreshMemoryRangeAllWorkers,
  refreshPageAllWorkers,
  setAllWorkersCurrentPc,
  setAllWorkersCurrentState,
  setAllWorkersPreviousState,
  syncMemoryRangeAllWorkers,
  WorkerState,
} from "@/store/workers/workersSlice";
import { AvailablePvms, ExpectedState, SpiProgram, Status } from "@/types/pvm";
import { logger } from "@/utils/loggerService";
import { useCallback } from "react";
import { storageManager } from "@/components/HostCallDialog/handlers/storageManager";

export const useDebuggerActions = () => {
  const { breakpointAddresses, initialState, pvmOptions } = useAppSelector((state) => state.debugger);
  const workers = useAppSelector((state) => state.workers);
  const dispatch = useAppDispatch();

  const recreateWorker = useCallback(
    async ({ id, type, params }: SelectedPvmWithPayload) => {
      await dispatch(createWorker(id)).unwrap();

      let pvmType: PvmTypes;
      if (id === AvailablePvms.TYPEBERRY) {
        pvmType = PvmTypes.BUILT_IN;
      } else if (type === AvailablePvms.WASM_FILE) {
        pvmType = PvmTypes.WASM_FILE;
      } else if (type === AvailablePvms.WASM_WS) {
        pvmType = PvmTypes.WASM_WS;
      } else {
        // Default to WASM_URL for POLKAVM and others
        pvmType = PvmTypes.WASM_URL;
      }

      await dispatch(
        loadWorker({
          id,
          payload: {
            type: pvmType,
            params,
          },
        }),
      ).unwrap();
    },
    [dispatch],
  );

  const restartProgram = useCallback(
    async (state: ExpectedState) => {
      storageManager.clear();
      dispatch(setInitialState(state));
      dispatch(setIsDebugFinished(false));
      dispatch(setIsRunMode(false));
      dispatch(setIsStepMode(false));
      dispatch(resetHostCallIndex());

      // Save memory ranges before destroying workers
      const memoryRanges = workers[0]?.memoryRanges;

      // Destroy all existing workers to clear message listeners
      await Promise.all(workers.map((worker: WorkerState) => dispatch(destroyWorker(worker.id)).unwrap()));

      // Recreate workers with the same PVM configurations
      const selectedPvmConfigs = pvmOptions.allAvailablePvms.filter((pvm) => pvmOptions.selectedPvm.includes(pvm.id));
      await Promise.all(selectedPvmConfigs.map(recreateWorker));

      // Restore memory ranges and initialize
      await dispatch(syncMemoryRangeAllWorkers({ memoryRanges }));
      dispatch(setAllWorkersCurrentState(state));
      dispatch(setAllWorkersPreviousState(state));
      await dispatch(initAllWorkers()).unwrap();
      await dispatch(refreshPageAllWorkers()).unwrap();
      await dispatch(refreshMemoryRangeAllWorkers()).unwrap();
      dispatch(setAllWorkersCurrentPc(state.pc));
      dispatch(setClickedInstruction(null));
    },
    [dispatch, workers, pvmOptions, recreateWorker],
  );

  const startProgram = useCallback(
    async (
      initialState: ExpectedState,
      newProgram: number[],
      programName: string,
      spiProgram: SpiProgram | null,
      exampleName?: string,
    ) => {
      storageManager.clear();
      dispatch(setInitialState(initialState));
      dispatch(setProgram({ program: newProgram, programName, exampleName, spiProgram }));
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
      dispatch(setAllWorkersCurrentPc(initialState.pc ?? 0));
      dispatch(setPvmInitialized(true));
    },
    [dispatch],
  );

  const handleProgramLoad = useCallback(
    async (data?: ProgramUploadFileOutput) => {
      if (data) {
        const response = await startProgram(
          { ...data.initial, status: Status.OK },
          data.program,
          data.name,
          data.spiProgram,
          data.exampleName,
        );
        if (
          (
            response as unknown as {
              error: string;
            }
          )?.error
        ) {
          dispatch(setIsProgramInvalid(true));
        } else {
          dispatch(setIsProgramInvalid(false));
        }
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

      const memoryRanges = workers[0]?.memoryRanges;

      // Destroy all existing workers
      await Promise.all(workers.map((worker: WorkerState) => dispatch(destroyWorker(worker.id)).unwrap()));

      await dispatch(syncMemoryRangeAllWorkers({ memoryRanges }));
      await dispatch(refreshMemoryRangeAllWorkers()).unwrap();
      await restartProgram(initialState);
      dispatch(setPvmLoaded(true));
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
