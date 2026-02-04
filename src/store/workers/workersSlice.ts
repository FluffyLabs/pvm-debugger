import { createSlice, createAsyncThunk, isRejected } from "@reduxjs/toolkit";
import { RootState } from "@/store";
import { ExpectedState, Status } from "@/types/pvm.ts";
import {
  selectIsDebugFinished,
  setIsDebugFinished,
  setIsRunMode,
  setIsStepMode,
  setPendingHostCall,
} from "@/store/debugger/debuggerSlice.ts";
import { findHostCallEntry, HostCallEntry, StateMismatch } from "@/lib/hostCallTrace";
import PvmWorker from "@/packages/web-worker/worker?worker&inline";
import { logger } from "@/utils/loggerService";
import { Commands, PvmTypes } from "@/packages/web-worker/types";
import { asyncWorkerPostMessage, hasCommandStatusError, LOAD_MEMORY_CHUNK_SIZE, MEMORY_SPLIT_STEP } from "../utils";
import { chunk, inRange, isNumber } from "lodash";
import { SerializedFile } from "@/lib/utils.ts";

// TODO: remove this when found a workaround for BigInt support in JSON.stringify
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error
BigInt.prototype["toJSON"] = function () {
  return this.toString();
};

const toMemoryPageTabData = (memoryPage: number[] | undefined, startAddress: number) => {
  const data = chunk(memoryPage || [], MEMORY_SPLIT_STEP).map((chunk, index) => {
    return {
      address: index * MEMORY_SPLIT_STEP + startAddress,
      bytes: chunk,
    };
  });

  return data;
};

export interface WorkerState {
  id: string;
  worker: Worker;
  currentState: ExpectedState;
  previousState: ExpectedState;
  currentPc?: number;
  exitArg?: number;
  isRunMode?: boolean;
  isBreakpoint?: boolean;
  isDebugFinished?: boolean;
  isLoading?: boolean;
  memory: {
    data?: {
      address: number;
      bytes: number[];
    }[];
    isLoading: boolean;
    startAddress: number;
    stopAddress: number;
  };
  memoryRanges: {
    id: string;
    startAddress: number;
    length: number;
    isLoading: boolean;
    data?: {
      address: number;
      bytes: number[];
    }[];
  }[];
}

const initialState: WorkerState[] = [];

export const createWorker = createAsyncThunk("workers/createWorker", async (id: string) => {
  const worker = new PvmWorker();

  return {
    id,
    worker,
  };
});

export const loadWorker = createAsyncThunk(
  "workers/loadWorker",
  async (
    {
      id,
      payload,
    }: {
      id: string;
      payload: { type: PvmTypes; params?: { url?: string; file?: SerializedFile } };
    },
    { getState, dispatch },
  ) => {
    const state = getState() as RootState;
    const worker = state.workers.find((worker) => worker.id === id);
    if (!worker) {
      return;
    }

    dispatch(setWorkerIsLoading({ id, isLoading: true }));

    const data = await asyncWorkerPostMessage(id, worker.worker, {
      command: Commands.LOAD,
      payload: {
        type: payload.type,
        params: payload.params || {},
      },
    });

    dispatch(setWorkerIsLoading({ id, isLoading: false }));

    if ("status" in data && data.status === "error") {
      logger.error(`An error occured on command ${data.command}`, { error: data.error });
    }
  },
);

export const setAllWorkersServiceId = createAsyncThunk("workers/setAllStorage", async (_, { getState }) => {
  const state = getState() as RootState;
  const debuggerState = state.debugger;
  const serviceId = debuggerState.serviceId;

  if (serviceId === null) {
    throw new Error("Service id is not set");
  }

  return Promise.all(
    state.workers.map(async (worker) => {
      await asyncWorkerPostMessage(worker.id, worker.worker, {
        command: Commands.SET_SERVICE_ID,
        payload: {
          serviceId,
        },
      });
    }),
  );
});

export const initAllWorkers = createAsyncThunk("workers/initAllWorkers", async (_, { getState, dispatch }) => {
  const state = getState() as RootState;
  const debuggerState = state.debugger;

  return Promise.all(
    state.workers.map(async (worker) => {
      const initData = await asyncWorkerPostMessage(worker.id, worker.worker, {
        command: Commands.INIT,
        payload: {
          spiProgram: state.debugger.spiProgram,
          spiArgs: state.debugger.spiArgs,
          initialState: debuggerState.initialState,
          program: new Uint8Array(debuggerState.program),
        },
      });

      if (hasCommandStatusError(initData)) {
        throw new Error(`Failed to initialize "${worker.id}": ${initData.error.message}`);
      }

      // Initialize memory with default range
      await dispatch(
        loadMemoryChunkAllWorkers({
          startAddress: worker.memory.startAddress,
          stopAddress: worker.memory.stopAddress,
          loadType: "replace",
        }),
      ).unwrap();
    }),
  );
});

export const loadMemoryChunkAllWorkers = createAsyncThunk(
  "workers/loadMemoryChunkAllWorkers",
  async (
    {
      startAddress,
      stopAddress,
      // Load type determines if new chunk should be added to the existing memory (and where) or replace it
      loadType,
    }: { startAddress: number; stopAddress: number; loadType: "start" | "end" | "replace" },
    { getState, dispatch },
  ) => {
    const state = getState() as RootState;

    return Promise.all(
      state.workers.map(async (worker) => {
        const resp = await asyncWorkerPostMessage(worker.id, worker.worker, {
          command: Commands.MEMORY,
          payload: { startAddress, stopAddress },
        });

        if (hasCommandStatusError(resp)) {
          throw resp.error;
        }

        dispatch(
          appendMemory({
            id: worker.id,
            startAddress,
            stopAddress,
            chunk: resp.payload.memoryChunk,
            loadType,
            isLoading: false,
          }),
        );
      }),
    );
  },
);

export const refreshPageAllWorkers = createAsyncThunk(
  "workers/refreshPageAllWorkers",
  async (_, { getState, dispatch }) => {
    const state = getState() as RootState;

    return Promise.all(
      state.workers.map(async (worker) => {
        // No memory, nothing to refresh
        if (
          !worker.memory?.data ||
          worker.memory.startAddress === undefined ||
          worker.memory.stopAddress === undefined
        ) {
          return;
        }

        const resp = await asyncWorkerPostMessage(worker.id, worker.worker, {
          command: Commands.MEMORY,
          payload: { startAddress: worker.memory.startAddress, stopAddress: worker.memory.stopAddress },
        });

        if (hasCommandStatusError(resp)) {
          throw resp.error;
        }

        dispatch(
          appendMemory({
            id: worker.id,
            startAddress: worker.memory.startAddress,
            stopAddress: worker.memory.stopAddress,
            chunk: resp.payload.memoryChunk,
            loadType: "replace",
            isLoading: false,
          }),
        );
      }),
    );
  },
);

export const handleHostCall = createAsyncThunk(
  "workers/handleHostCall",
  async ({ workerId }: { workerId?: string }, { getState, dispatch }) => {
    const state = getState() as RootState;

    const exitArg = state.workers[0]?.exitArg ?? -1;
    const trace = state.debugger.hostCallsTrace;
    const nextHostCallIndex = state.debugger.nextHostCallIndex;
    const autoContinue = state.debugger.autoContinueOnHostCalls;

    const openDialog = (hcId: number, entry: HostCallEntry | null, mismatches: StateMismatch[] = []) => {
      dispatch(
        setPendingHostCall({
          pendingHostCall: {
            hostCallId: hcId,
            entry,
            mismatches,
          },
          nextHostCallIndex: nextHostCallIndex,
        }),
      );
    };

    // just open the dialog
    if (trace === null || !trace.parsed) {
      logger.info("  [handleHostCall] No trace -> opening dialog");
      openDialog(exitArg, null);
      return;
    }

    const currentState = state.workers[0]?.currentState;
    const pc = currentState?.pc ?? 0;
    const gas = currentState?.gas ?? 0n;
    const regs = (currentState?.regs ?? []) as bigint[];

    const result = findHostCallEntry(trace.parsed, nextHostCallIndex, pc, gas, regs, exitArg);

    if (result.entry === null) {
      logger.info("  [handleHostCall] No entry found -> opening dialog");
      openDialog(exitArg, null);
      return;
    }

    if (result.mismatches.length > 0) {
      logger.info("  [handleHostCall] Mismatches found -> stopping, opening dialog");
      openDialog(exitArg, result.entry, result.mismatches);
      return;
    }

    if (!autoContinue) {
      logger.debug("  [handleHostCall] autoContinue=false -> opening dialog");
      openDialog(exitArg, result.entry, result.mismatches);
      return;
    }

    logger.debug("  [handleHostCall] AUTO-CONTINUING with trace data");
    // TODO [ToDr] This should be a separate method?
    const newRegs = [...regs];
    for (const rw of result.entry.registerWrites) {
      newRegs[rw.index] = rw.value;
    }
    const newGas = result.entry.gasAfter ?? gas;
    const memoryEdits = result.entry.memoryWrites.map((mw) => ({
      address: mw.address,
      data: mw.data,
    }));

    logger.debug(`  [handleHostCall] Setting state: gas=${newGas}, memEdits=${memoryEdits.length}`);
    await Promise.all(
      state.workers
        .filter(({ id }) => {
          return workerId ? workerId === id : true;
        })
        .map(async (worker) => {
          const resp = await asyncWorkerPostMessage(worker.id, worker.worker, {
            command: Commands.SET_STATE,
            payload: { regs: newRegs, gas: newGas },
          });

          if (hasCommandStatusError(resp)) {
            throw new Error(resp.error.message);
          }

          logger.info(`  [handleHostCall] dispatching setWorkerCurrentState for ${worker.id}`);
          dispatch(setWorkerCurrentState({ id: worker.id, currentState: resp.payload.state }));

          for (const mem of memoryEdits) {
            const memResp = await asyncWorkerPostMessage(worker.id, worker.worker, {
              command: Commands.SET_MEMORY,
              payload: { address: mem.address, data: mem.data },
            });

            if (hasCommandStatusError(memResp)) {
              throw new Error(memResp.error.message);
            }
          }
        }),
    );

    logger.info("  [handleHostCall] Done - returning without opening dialog");
    return;
  },
);

// Calculate steps based on whether we're using block stepping or not
function getStepsToPerform(state: RootState) {
  const { uiRefreshRate } = state.debugger;
  if (uiRefreshRate.mode === "block") {
    return calculateStepsToExitBlockForAllWorkers(state);
  }
  return uiRefreshRate.instructionCount;
}

export const continueAllWorkers = createAsyncThunk("workers/continueAllWorkers", async (_, { getState, dispatch }) => {
  const stepAllWorkersAgain = async () => {
    const state = getState() as RootState;

    const stepsToPerform = getStepsToPerform(state);

    await dispatch(stepAllWorkers({ stepsToPerform })).unwrap();
    const allSame = selectHasAllSameState(getState() as RootState);

    if (!allSame) {
      dispatch(setIsRunMode(false));
    }

    const newState = getState() as RootState;

    if (selectShouldContinueRunning(newState)) {
      await stepAllWorkersAgain();
    }
  };

  await stepAllWorkersAgain();
});

export const runAllWorkers = createAsyncThunk("workers/runAllWorkers", async (_, { getState, dispatch }) => {
  const state = getState() as RootState;

  // Calculate initial steps based on whether we're using block stepping
  const batchedSteps = getStepsToPerform(state);

  await Promise.all(
    state.workers.map(async (worker) => {
      const data = await asyncWorkerPostMessage(worker.id, worker.worker, {
        command: Commands.RUN,
        payload: {
          batchedSteps,
        },
      });

      if (hasCommandStatusError(data)) {
        throw data.error;
      }
    }),
  );

  const continueAction = await dispatch(continueAllWorkers());

  if (isRejected(continueAction)) {
    throw continueAction.error;
  }
});

export const stepAllWorkers = createAsyncThunk(
  "workers/stepAllWorkers",
  async (params: { stepsToPerform?: number }, { getState, dispatch }) => {
    const state = getState() as RootState;
    const debuggerState = state.debugger;
    const stepsToPerform = params?.stepsToPerform || debuggerState.stepsToPerform;

    if (debuggerState.isDebugFinished) {
      return;
    }

    const responses = await Promise.all(
      state.workers.map(async (worker) => {
        const data = await asyncWorkerPostMessage(worker.id, worker.worker, {
          command: Commands.STEP,
          payload: {
            stepsToPerform,
          },
        });

        if (hasCommandStatusError(data)) {
          throw data.error;
        }

        const { state, isFinished, isRunMode, exitArg } = data.payload;

        dispatch(setWorkerCurrentState({ id: worker.id, currentState: state }));
        dispatch(setWorkerExitArg({ id: worker.id, exitArg }));

        dispatch(
          setWorkerCurrentInstruction({
            id: worker.id,
            pc: data.payload.currentPc,
          }),
        );
        dispatch(setIsStepMode(true));

        if (state.pc === undefined) {
          throw new Error("Program counter is undefined");
        }

        const isBreakpoint = debuggerState.breakpointAddresses.includes(state.pc);

        if (isBreakpoint) {
          dispatch(setIsRunMode(false));
          dispatch(setIsBreakpoint({ id: worker.id, isBreakpoint: true }));
        }

        if (state.status === Status.HOST) {
          logger.group(`[HOST CALL] PVM stopped at pc=${state.pc}, exitArg=${exitArg}`);
          dispatch(setIsRunMode(false));
          await dispatch(handleHostCall({ workerId: worker.id })).unwrap();
          logger.groupEnd();
        }

        return {
          isFinished,
          state,
          isRunMode,
          isBreakpoint,
        };
      }),
    );

    const allFinished = responses.every((response) => response.isFinished);

    await dispatch(refreshPageAllWorkers());
    await dispatch(refreshMemoryRangeAllWorkers()).unwrap();

    if (allFinished) {
      dispatch(setIsDebugFinished(true));
    }
  },
);

export const syncMemoryRangeAllWorkers = createAsyncThunk(
  "workers/syncMemoryRangeAllWorkers",
  async ({ memoryRanges }: { memoryRanges: { id: string; startAddress: number; length: number }[] }, { dispatch }) => {
    for (const range of memoryRanges) {
      await dispatch(
        loadMemoryRangeAllWorkers({
          rangeId: range.id,
          startAddress: range.startAddress,
          length: range.length,
        }),
      ).unwrap();
    }
  },
);
export const refreshMemoryRangeAllWorkers = createAsyncThunk(
  "workers/refreshAllMemoryRanges",
  async (_, { getState, dispatch }) => {
    const state = getState() as RootState;

    await Promise.all(
      state.workers.map(async (worker) => {
        await Promise.all(
          worker.memoryRanges.map(async (range) => {
            const { id: rangeId, startAddress, length } = range;
            const stopAddress = startAddress + length;

            const resp = await asyncWorkerPostMessage(worker.id, worker.worker, {
              command: Commands.MEMORY,
              payload: { startAddress, stopAddress },
            });

            if (hasCommandStatusError(resp)) {
              throw resp.error;
            }

            dispatch(
              appendMemoryRange({
                workerId: worker.id,
                rangeId,
                startAddress,
                length,
                chunk: resp.payload.memoryChunk,
              }),
            );
          }),
        );
      }),
    );
  },
);

export const loadMemoryRangeAllWorkers = createAsyncThunk(
  "workers/loadMemoryRangeAllWorkers",
  async (
    { rangeId, startAddress, length }: { rangeId: string; startAddress: number; length: number },
    { getState, dispatch },
  ) => {
    const state = getState() as RootState;
    const stopAddress = startAddress + length;

    return Promise.all(
      state.workers.map(async (worker) => {
        const resp = await asyncWorkerPostMessage(worker.id, worker.worker, {
          command: Commands.MEMORY,
          payload: { startAddress, stopAddress },
        });

        if (hasCommandStatusError(resp)) {
          throw resp.error;
        }

        dispatch(
          appendMemoryRange({
            workerId: worker.id,
            rangeId,
            startAddress,
            length,
            chunk: resp.payload.memoryChunk,
          }),
        );
      }),
    );
  },
);

// Utility function to calculate steps needed to exit the current block for a specific worker
const calculateStepsToExitBlockForWorker = (
  workerPc: number,
  programPreviewResult: Array<{ address: number; block: { isEnd: boolean; number: number } }>,
): number => {
  if (!programPreviewResult || programPreviewResult.length === 0) {
    return 1;
  }

  const currentInstruction = programPreviewResult.find((x) => x.address === workerPc);

  if (!currentInstruction) {
    return 1;
  }

  // If we're already at the end of a block, step once
  if (currentInstruction.block.isEnd) {
    return 1;
  }

  // Find the current instruction in the program preview result
  const currentIndex = programPreviewResult.findIndex((inst) => inst.address === currentInstruction.address);
  if (currentIndex === -1) {
    return 1;
  }

  // Count instructions remaining in the current block
  let stepsInBlock = 1; // Count the step from current instruction

  for (let i = currentIndex + 1; i < programPreviewResult.length; i++) {
    const instruction = programPreviewResult[i];

    // If we encounter a different block or the end of current block, stop counting
    if (instruction.block.number !== currentInstruction.block.number) {
      break;
    }

    stepsInBlock++;

    // If this instruction is the end of the block, we're done
    if (instruction.block.isEnd) {
      break;
    }
  }

  return stepsInBlock;
};

// Utility function to calculate steps needed to exit current blocks for all workers
const calculateStepsToExitBlockForAllWorkers = (state: RootState): number => {
  const workers = state.workers;
  const { programPreviewResult } = state.debugger;

  if (!workers.length || !programPreviewResult) {
    return 1;
  }

  // Calculate steps needed for each worker and take the maximum
  // This ensures all workers step to their respective block boundaries
  const stepsForWorkers = workers.map((worker: WorkerState) => {
    const pc = worker.currentState.pc;
    if (pc === undefined) {
      return 1;
    }
    return calculateStepsToExitBlockForWorker(pc, programPreviewResult);
  });

  return Math.max(...stepsForWorkers);
};

export const selectMemoryRangesForFirstWorker = (state: RootState) => {
  return state.workers[0]?.memoryRanges ?? [];
};

export type HostCallResumeMode = "step" | "block" | "run";

export const readMemoryRange = createAsyncThunk(
  "workers/readMemoryRange",
  async ({ startAddress, length }: { startAddress: number; length: number }, { getState }) => {
    const state = getState() as RootState;
    const worker = state.workers[0];

    if (!worker) {
      throw new Error("No workers available");
    }

    const stopAddress = startAddress + length;
    const resp = await asyncWorkerPostMessage(worker.id, worker.worker, {
      command: Commands.MEMORY,
      payload: { startAddress, stopAddress },
    });

    if (hasCommandStatusError(resp)) {
      throw resp.error;
    }

    return resp.payload.memoryChunk;
  },
);

export interface MemoryEdit {
  address: number;
  data: Uint8Array;
}

export const resumeAfterHostCall = createAsyncThunk(
  "workers/resumeAfterHostCall",
  async (
    {
      regs,
      gas,
      mode,
      memoryEdits,
    }: { regs: bigint[]; gas: bigint; mode: HostCallResumeMode; memoryEdits?: MemoryEdit[] },
    { getState, dispatch },
  ) => {
    logger.group(`[resumeAfterHostCall] mode=${mode}, gas=${gas}, memEdits=${memoryEdits?.length ?? 0}`);
    const state = getState() as RootState;

    logger.log("Setting state for all workers...");
    await Promise.all(
      state.workers.map(async (worker) => {
        const resp = await asyncWorkerPostMessage(worker.id, worker.worker, {
          command: Commands.SET_STATE,
          payload: { regs, gas },
        });

        if (hasCommandStatusError(resp)) {
          throw resp.error;
        }

        dispatch(setWorkerCurrentState({ id: worker.id, currentState: resp.payload.state }));
      }),
    );

    if (memoryEdits && memoryEdits.length > 0) {
      logger.info(`Writing ${memoryEdits.length} memory edits...`);
      await Promise.all(
        state.workers.map(async (worker) => {
          for (const memory of memoryEdits) {
            const resp = await asyncWorkerPostMessage(worker.id, worker.worker, {
              command: Commands.SET_MEMORY,
              payload: { address: memory.address, data: memory.data },
            });

            if (hasCommandStatusError(resp)) {
              throw resp.error;
            }
          }
        }),
      );
    }

    logger.info("Closing dialog...");
    dispatch(
      setPendingHostCall({
        pendingHostCall: null,
        nextHostCallIndex: state.debugger.nextHostCallIndex + 1,
      }),
    );

    // Resume execution based on mode
    logger.info(`Resuming execution in mode: ${mode}`);
    if (mode === "run") {
      dispatch(setIsRunMode(true));
      await dispatch(runAllWorkers()).unwrap();
    } else if (mode === "block") {
      const stepsToPerform = calculateStepsToExitBlockForAllWorkers(getState() as RootState);
      await dispatch(stepAllWorkers({ stepsToPerform })).unwrap();
    } else {
      await dispatch(stepAllWorkers({ stepsToPerform: 1 })).unwrap();
    }

    await dispatch(refreshPageAllWorkers());
    await dispatch(refreshMemoryRangeAllWorkers()).unwrap();
    logger.info("resumeAfterHostCall complete");
    logger.groupEnd();
  },
);

export const destroyWorker = createAsyncThunk("workers/destroyWorker", async (id: string, { getState }) => {
  const state = getState() as RootState;
  const worker = state.workers.find((worker) => worker.id === id);
  if (!worker) {
    return;
  }

  await Promise.all(
    state.workers.map(async (worker) => {
      const data = await asyncWorkerPostMessage(worker.id, worker.worker, {
        command: Commands.UNLOAD,
      });

      if (hasCommandStatusError(data)) {
        throw data.error;
      }
    }),
  );

  worker.worker.terminate();

  return id;
});

const getWorker = <T extends { id: string }>(state: T[], id: string) => state.find((worker) => worker.id === id);

const workers = createSlice({
  name: "workers",
  initialState,
  reducers: {
    createWorker(state, action: { payload: WorkerState }) {
      state.push(action.payload);
    },
    setWorkerCurrentState(
      state,
      action: {
        payload: {
          id: string;
          currentState: ExpectedState;
        };
      },
    ) {
      const worker = getWorker(state, action.payload.id);
      if (worker) {
        // TODO: remove the check and the mapping to status 255 as soon as OK status is not -1 in PVM and PolkaVM anymore
        if (Number(action.payload.currentState.status) === -1) {
          worker.previousState = worker.currentState;
          worker.currentState = {
            ...action.payload.currentState,
            status: 255,
          };
        } else {
          // TODO: just these lines should be left as the issue above is resolved
          worker.previousState = worker.currentState;
          worker.currentState = action.payload.currentState;
        }
      }
    },
    setAllWorkersCurrentState(state, action: { payload: ExpectedState | ((s: ExpectedState) => ExpectedState) }) {
      state.forEach((worker) => {
        if (typeof action.payload === "function") {
          worker.currentState = action.payload(worker.currentState);
        } else {
          worker.currentState = action.payload;
        }
      });
    },
    setAllWorkersPreviousState(state, action: { payload: ExpectedState }) {
      state.forEach((worker) => {
        worker.previousState = action.payload;
      });
    },
    setWorkerCurrentPc(state, action: { payload: { id: string; pc?: number } }) {
      const worker = getWorker(state, action.payload.id);

      if (worker) {
        worker.currentPc = action.payload.pc;
      }
    },
    setAllWorkersCurrentPc(state, action: { payload: number | undefined }) {
      state.forEach((worker) => {
        worker.currentPc = action.payload;
      });
    },
    setWorkerIsLoading(state, action: { payload: { id: string; isLoading?: boolean } }) {
      const worker = getWorker(state, action.payload.id);
      if (worker) {
        worker.isLoading = action.payload.isLoading;
      }
    },
    setIsBreakpoint(state, action: { payload: { id: string; isBreakpoint?: boolean } }) {
      const worker = getWorker(state, action.payload.id);
      if (worker) {
        worker.isBreakpoint = action.payload.isBreakpoint;
      }
    },
    appendMemory: (
      state,
      action: {
        payload: {
          id: string;
          startAddress: number;
          stopAddress: number;
          chunk: Uint8Array;
          loadType: "start" | "end" | "replace";
          isLoading: boolean;
        };
      },
    ) => {
      const memory = getWorker(state, action.payload.id)?.memory;
      if (!memory) {
        return;
      }

      if (
        action.payload.loadType !== "replace" &&
        isNumber(memory.startAddress) &&
        isNumber(memory.stopAddress) &&
        inRange(action.payload.startAddress, memory.startAddress, memory.stopAddress)
      ) {
        logger.info("Memory chunk is already loaded");
        return;
      }

      const paggedData = toMemoryPageTabData(Array.from(action.payload.chunk), action.payload.startAddress);

      if (action.payload.loadType === "end") {
        memory.data = [...(memory.data || []), ...paggedData];
        memory.stopAddress = action.payload.stopAddress;
      } else if (action.payload.loadType === "start") {
        memory.data = [...paggedData, ...(memory.data || [])];
        memory.startAddress = action.payload.startAddress;
      } else if (action.payload.loadType === "replace") {
        memory.data = paggedData;
        memory.startAddress = action.payload.startAddress;
        memory.stopAddress = action.payload.stopAddress;
      }

      memory.isLoading = action.payload.isLoading;
    },
    setWorkerExitArg(state, action: { payload: { id: string; exitArg?: number } }) {
      const worker = getWorker(state, action.payload.id);
      if (worker) {
        worker.exitArg = action.payload.exitArg;
      }
    },
    appendMemoryRange: (
      state,
      action: {
        payload: {
          workerId: string;
          rangeId: string;
          startAddress: number;
          length: number;
          chunk: Uint8Array;
        };
      },
    ) => {
      const worker = getWorker(state, action.payload.workerId);
      if (!worker) return;

      const { rangeId, startAddress, length, chunk } = action.payload;

      let memoryRange = worker.memoryRanges.find((r) => r.id === rangeId);
      if (!memoryRange) {
        memoryRange = {
          id: rangeId,
          startAddress,
          length,
          isLoading: false,
          data: [],
        };
        worker.memoryRanges.push(memoryRange);
      }

      const pagedData = toMemoryPageTabData(Array.from(chunk), startAddress);

      memoryRange.data = pagedData;
      memoryRange.startAddress = startAddress;
      memoryRange.length = length;
      memoryRange.isLoading = false;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(createWorker.fulfilled, (state, action) => {
      logger.info("Worker created", action.payload);
      state.push({
        worker: action.payload.worker,
        id: action.payload.id,
        currentState: {},
        previousState: {},
        memory: {
          data: [],
          isLoading: false,
          startAddress: 0x1000,
          stopAddress: 0x1000 + LOAD_MEMORY_CHUNK_SIZE,
        },
        memoryRanges: [],
      });
    });
    builder.addCase(destroyWorker.fulfilled, (state, action) => {
      return state.filter((worker) => worker.id !== action.payload);
    });
  },
});

export const {
  setWorkerCurrentState,
  setWorkerCurrentPc: setWorkerCurrentInstruction,
  setAllWorkersCurrentState,
  setAllWorkersPreviousState,
  setAllWorkersCurrentPc,
  setWorkerIsLoading,
  setIsBreakpoint,
  appendMemory,
  appendMemoryRange,
  setWorkerExitArg,
} = workers.actions;

export const selectWorkers = (state: RootState) => state.workers;
export const selectMemory = (id: string) => (state: RootState) =>
  state.workers.find((worker) => worker.id === id)?.memory;
export const selectMemoryForFirstWorker = (state: RootState) => {
  const worker = state.workers?.[0];

  if (!worker) {
    return null;
  }

  return worker.memory;
};

export const selectHasAllSameState = (state: RootState) => {
  const allSame = state.workers.every(
    ({ currentState }) => JSON.stringify(currentState) === JSON.stringify(state.workers[0].currentState),
  );

  return allSame;
};

export const selectShouldContinueRunning = (state: RootState) => {
  const allSame = selectHasAllSameState(state);
  const allFinished = selectIsDebugFinished(state);
  const anyBreakpoint = state.workers.some((response) => response.isBreakpoint);

  return state.debugger.isRunMode && allSame && !allFinished && !anyBreakpoint;
};

export const selectIsAnyWorkerLoading = (state: RootState) => state.workers.some((worker) => worker.isLoading);

export default workers.reducer;
