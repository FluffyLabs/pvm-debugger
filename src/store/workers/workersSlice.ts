import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { RootState } from "@/store";
import { CurrentInstruction, ExpectedState } from "@/types/pvm.ts";
import { setIsDebugFinished } from "@/store/debugger/debuggerSlice.ts";
import PvmWorker from "@/packages/web-worker/worker?worker&inline";
import { SupportedLangs } from "@/packages/web-worker/utils.ts";
import { virtualTrapInstruction } from "@/utils/virtualTrapInstruction.ts";
import { logger } from "@/utils/loggerService";
import { Commands, CommandStatus, PvmTypes, WorkerResponseParams } from "@/packages/web-worker/types";
import { asyncWorkerPostMessage } from "../utils";

// TODO: remove this when found a workaround for BigInt support in JSON.stringify
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error
BigInt.prototype["toJSON"] = function () {
  return this.toString();
};

export interface WorkerState {
  id: string;
  worker: Worker;
  currentState: ExpectedState;
  previousState: ExpectedState;
  currentInstruction?: CurrentInstruction;
  isRunMode?: boolean;
  isDebugFinished?: boolean;
  isLoading?: boolean;
  memory?: {
    meta: {
      pageSize: number | undefined;
      isPageSizeLoading: boolean;
    };
    page: {
      data?: Uint8Array;
      isLoading: boolean;
      pageNumber: number | undefined;
    };
    range: {
      data: { start: number; end: number; data: Uint8Array | undefined }[];
      isLoading: boolean;
    };
  };
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
      payload: { type: PvmTypes; params?: { url?: string; file?: Blob; lang?: SupportedLangs } };
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
      logger.error(`An error occured on codddmmand ${data.command}`, { error: data.error });
    }
  },
);

export const initAllWorkers = createAsyncThunk("workers/initAllWorkers", async (_, { getState, dispatch }) => {
  const state = getState() as RootState;
  const debuggerState = state.debugger;

  return Promise.all(
    state.workers.map(async (worker) => {
      await asyncWorkerPostMessage(worker.id, worker.worker, {
        command: Commands.INIT,
        payload: {
          initialState: debuggerState.initialState,
          program: new Uint8Array(debuggerState.program),
        },
      });

      const memorySizeData = await asyncWorkerPostMessage(worker.id, worker.worker, {
        command: Commands.MEMORY_SIZE,
      });
      const pageSize = memorySizeData.payload.memorySize;

      dispatch(setPageSize({ pageSize, id: worker.id }));
    }),
  );
});

export const changePageAllWorkers = createAsyncThunk(
  "workers/changePageAllWorkers",
  async (pageNumber: number, { getState, dispatch }) => {
    const state = getState() as RootState;

    return Promise.all(
      state.workers.map(async (worker) => {
        const resp = await asyncWorkerPostMessage(worker.id, worker.worker, {
          command: Commands.MEMORY_PAGE,
          payload: { pageNumber },
        });

        if ("status" in resp && resp.status === CommandStatus.ERROR && resp.error instanceof Error) {
          return Promise.reject(resp.error);
        }

        dispatch(
          changePage({
            id: worker.id,
            pageNumber: resp.payload.pageNumber,
            data: resp.payload.memoryPage,
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
    const pageNumber = selectMemoryForFirstWorker(state)?.page.pageNumber;
    if (pageNumber !== undefined && pageNumber !== -1) {
      dispatch(changePageAllWorkers(state.workers[0].memory?.page.pageNumber || 0));
    }
  },
);

export const changeRangeAllWorkers = createAsyncThunk(
  "workers/changeRangeAllWorkers",
  async (
    {
      start,
      end,
    }: {
      start: number;
      end: number;
    },
    { getState, dispatch },
  ) => {
    const state = getState() as RootState;

    return Promise.all(
      state.workers.map(async (worker) => {
        const resp = await asyncWorkerPostMessage(worker.id, worker.worker, {
          command: Commands.MEMORY_RANGE,
          payload: { start, end },
        });

        dispatch(changeRange({ id: worker.id, ...resp.payload, isLoading: false }));
      }),
    );
  },
);

export const continueAllWorkers = createAsyncThunk("workers/continueAllWorkers", async (_, { getState, dispatch }) => {
  const state = getState() as RootState;
  const debuggerState = state.debugger;

  const stepAllWorkersAgain = async () => {
    const responses = await Promise.all(
      state.workers.map((worker) => {
        return new Promise(
          (
            resolve: (value: {
              isFinished: boolean;
              state: ExpectedState;
              isRunMode: boolean;
              isBreakpoint: boolean;
            }) => void,
          ) => {
            const messageHandler = (event: MessageEvent<WorkerResponseParams>) => {
              if ("status" in event.data && event.data.status === CommandStatus.ERROR) {
                logger.error(`An error occured on command ${event.data.command}`, { error: event.data.error });
              }

              if (event.data.command === Commands.STEP) {
                const { state, isRunMode, isFinished } = event.data.payload;

                // START MOVED FROM initAllWorkers
                dispatch(setWorkerCurrentState({ id: worker.id, currentState: state }));
                dispatch(
                  setWorkerCurrentInstruction({
                    id: worker.id,
                    instruction: event.data.payload.result,
                  }),
                );

                // END MOVED FOM initAllWorkers

                const currentState = getState() as RootState;
                const debuggerState = currentState.debugger;

                if (state.pc === undefined) {
                  throw new Error("Program counter is undefined");
                }

                resolve({
                  isFinished,
                  state,
                  isRunMode,
                  isBreakpoint: debuggerState.breakpointAddresses.includes(state.pc),
                });

                logger.info("Response from worker:", {
                  isFinished,
                  state,
                  isRunMode,
                  debuggerHit: debuggerState.breakpointAddresses.includes(state.pc),
                });

                worker.worker.removeEventListener("message", messageHandler);
              }
            };

            worker.worker.addEventListener("message", messageHandler);

            worker.worker.postMessage({
              command: Commands.STEP,
              payload: {
                program: debuggerState.program,
              },
            });
          },
        );
      }),
    );

    const allSame = responses.every(
      (response) => JSON.stringify(response.state) === JSON.stringify(responses[0].state),
    );

    const allFinished = responses.every((response) => response.isFinished);

    const allRunning = responses.every((response) => response.isRunMode);

    const anyBreakpoint = responses.some((response) => response.isBreakpoint);

    if (allFinished) {
      dispatch(setIsDebugFinished(true));
    }

    if (allSame && !allFinished && allRunning && !anyBreakpoint) {
      await stepAllWorkersAgain();
    }
  };

  await stepAllWorkersAgain();
});

export const runAllWorkers = createAsyncThunk("workers/runAllWorkers", async (_, { getState, dispatch }) => {
  const state = getState() as RootState;
  const debuggerState = state.debugger;

  state.workers.forEach((worker) => {
    worker.worker.postMessage({
      command: "run",
      payload: {
        program: debuggerState.program,
      },
    });
  });

  dispatch(continueAllWorkers());
});

export const stepAllWorkers = createAsyncThunk("workers/stepAllWorkers", async (_, { getState, dispatch }) => {
  const state = getState() as RootState;
  const debuggerState = state.debugger;

  if (debuggerState.isDebugFinished) {
    return;
  }

  const responses = await Promise.all(
    state.workers.map(async (worker) => {
      const data = await asyncWorkerPostMessage(worker.id, worker.worker, {
        command: Commands.STEP,
        payload: {
          program: new Uint8Array(debuggerState.program),
        },
      });

      const { state, isFinished } = data.payload;

      dispatch(setWorkerCurrentState({ id: worker.id, currentState: state }));
      dispatch(
        setWorkerCurrentInstruction({
          id: worker.id,
          instruction: data.payload.result,
        }),
      );

      if (state.pc === undefined) {
        throw new Error("Program counter is undefined");
      }

      return {
        isFinished,
      };
    }),
  );

  const allFinished = responses.every((response) => response.isFinished);

  if (allFinished) {
    dispatch(setIsDebugFinished(true));
  }
});

export const destroyWorker = createAsyncThunk("workers/destroyWorker", async (id: string, { getState }) => {
  const state = getState() as RootState;
  const worker = state.workers.find((worker) => worker.id === id);
  if (!worker) {
    return;
  }

  worker.worker.terminate();

  return id;
});

const getWorker = (state: WorkerState[], id: string) => state.find((worker) => worker.id === id);

const workers = createSlice({
  name: "workers",
  initialState,
  reducers: {
    createWorker(state, action) {
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
        worker.previousState = worker.currentState;
        worker.currentState = action.payload.currentState;
      }
    },
    setAllWorkersCurrentState(state, action) {
      state.forEach((worker) => {
        if (typeof action.payload === "function") {
          worker.currentState = action.payload(worker.currentState);
        } else {
          worker.currentState = action.payload;
        }
      });
    },
    setAllWorkersPreviousState(state, action) {
      state.forEach((worker) => {
        worker.previousState = action.payload;
      });
    },
    setWorkerCurrentInstruction(state, action) {
      const worker = getWorker(state, action.payload.id);
      if (worker) {
        if (action.payload.instruction === null) {
          worker.currentInstruction = virtualTrapInstruction;
        } else {
          worker.currentInstruction = action.payload.instruction;
        }
      }
    },
    setAllWorkersCurrentInstruction(state, action) {
      state.forEach((worker) => {
        worker.currentInstruction = action.payload;
      });
    },
    setWorkerIsLoading(state, action) {
      const worker = getWorker(state, action.payload.id);
      if (worker) {
        worker.isLoading = action.payload.isLoading;
      }
    },

    initSetPageSize: (
      state,
      action: {
        payload: {
          id: string;
        };
      },
    ) => {
      const memory = getWorker(state, action.payload.id)?.memory;
      if (!memory) {
        return;
      }
      memory.meta.isPageSizeLoading = true;
    },
    setPageSize: (
      state,
      action: {
        payload: {
          id: string;
          pageSize: number;
        };
      },
    ) => {
      const memory = getWorker(state, action.payload.id)?.memory;
      if (!memory) {
        return;
      }
      memory.meta.isPageSizeLoading = false;
      memory.meta.pageSize = action.payload.pageSize;
    },
    changePage: (
      state,
      action: {
        payload: {
          id: string;
          pageNumber: number;
          data: Uint8Array;
          isLoading: boolean;
        };
      },
    ) => {
      const memory = getWorker(state, action.payload.id)?.memory;
      if (!memory) {
        return;
      }

      if (action.payload.pageNumber === -1) {
        memory.page.pageNumber = undefined;
        memory.page.data = undefined;
        return;
      }

      memory.page.data = action.payload.data;
      memory.page.pageNumber = action.payload.pageNumber;
      memory.page.isLoading = action.payload.isLoading;
    },
    changeRange: (
      state,
      action: {
        payload: {
          id: string;
          start: number;
          end: number;
          memoryRange: Uint8Array | undefined;
          isLoading: boolean;
        };
      },
    ) => {
      const memory = getWorker(state, action.payload.id)?.memory;
      if (!memory) {
        return;
      }

      memory.range.data.push({
        start: action.payload.start,
        end: action.payload.end,
        data: action.payload.memoryRange,
      });
      memory.range.isLoading = action.payload.isLoading;
    },
    removeRange: (
      state,
      action: {
        payload: {
          id: string;
          index: number;
        };
      },
    ) => {
      const memory = getWorker(state, action.payload.id)?.memory;
      if (!memory) {
        return;
      }

      memory.range.data = memory.range.data.filter((_, i) => i !== action.payload.index);
      memory.range.isLoading = true;
    },
    removeRangeForAllWorkers: (state, action) => {
      state.forEach((worker) => {
        worker.memory?.range.data.splice(action.payload.index, 1);
      });
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
          meta: {
            pageSize: undefined,
            isPageSizeLoading: false,
          },
          page: {
            data: undefined,
            isLoading: false,
            pageNumber: 0,
          },
          range: {
            data: [],
            isLoading: false,
          },
        },
      });
    });
    builder.addCase(destroyWorker.fulfilled, (state, action) => {
      return state.filter((worker) => worker.id !== action.payload);
    });
  },
});

export const {
  setWorkerCurrentState,
  setWorkerCurrentInstruction,
  setAllWorkersCurrentState,
  setAllWorkersPreviousState,
  setAllWorkersCurrentInstruction,
  setWorkerIsLoading,
  initSetPageSize,
  setPageSize,
  changePage,
  changeRange,
  removeRange,
  removeRangeForAllWorkers,
} = workers.actions;

export const selectWorkers = (state: RootState) => state.workers;
export const selectMemory = (id: string) => (state: RootState) =>
  state.workers.find((worker) => worker.id === id)?.memory;
export const selectMemoryForFirstWorker = (state: RootState) => state.workers[0]?.memory;
export const selectIsAnyWorkerLoading = (state: RootState) => state.workers.some((worker) => worker.isLoading);

export default workers.reducer;
