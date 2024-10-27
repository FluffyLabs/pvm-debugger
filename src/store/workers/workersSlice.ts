import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { RootState } from "@/store";
import { CurrentInstruction, ExpectedState } from "@/types/pvm.ts";
import { setIsDebugFinished } from "@/store/debugger/debuggerSlice.ts";
import { Commands, PvmTypes, TargetOnMessageParams } from "@/packages/web-worker/worker.ts";
import PvmWorker from "@/packages/web-worker/worker?worker&inline";
import { SupportedLangs } from "@/packages/web-worker/utils.ts";
import { virtualTrapInstruction } from "@/utils/virtualTrapInstruction.ts";
import { logError } from "@/utils/loggerService";

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

const globalMessageHandlers: Record<string, (event: MessageEvent<TargetOnMessageParams>) => void> = {};

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
    { getState },
  ) => {
    const state = getState() as RootState;
    const worker = state.workers.find((worker) => worker.id === id);
    if (!worker) {
      return;
    }

    return new Promise<boolean>((resolve) => {
      const messageHandler = (event: MessageEvent<TargetOnMessageParams>) => {
        if ("status" in event.data && event.data.status === "error") {
          logError(`An error occured on command ${event.data.command}`, event.data.error);
        }

        if (event.data.command === Commands.LOAD) {
          if (event.data.status === "success") {
            resolve(true);
            worker.worker.removeEventListener("message", messageHandler);
          } else if (event.data.status === "error") {
            resolve(false);
            logError("Error loading PVM worker", event.data.error);
            worker.worker.removeEventListener("message", messageHandler);
          }
        }
      };

      worker.worker.addEventListener("message", messageHandler);

      worker.worker.postMessage({
        command: "load",
        payload,
      });
    });
  },
);

export const initAllWorkers = createAsyncThunk("workers/initAllWorkers", async (_, { getState, dispatch }) => {
  const state = getState() as RootState;
  const debuggerState = state.debugger;

  state.workers.forEach((worker) => {
    worker.worker.removeEventListener("message", globalMessageHandlers[worker.id]);

    worker.worker.postMessage({
      command: "init",
      payload: {
        initialState: debuggerState.initialState,
        program: debuggerState.program,
      },
    });

    globalMessageHandlers[worker.id] = (event: MessageEvent<TargetOnMessageParams>) => {
      if ("status" in event.data && event.data.status === "error") {
        logError(`An error occured on command ${event.data.command}`, event.data.error);
      }

      if (event.data.command === Commands.STEP) {
        const { state, isFinished } = event.data.payload;

        dispatch(setWorkerCurrentState({ id: worker.id, currentState: state }));

        dispatch(
          setWorkerCurrentInstruction({
            id: worker.id,
            instruction: event.data.payload.result,
          }),
        );

        if (isFinished) {
          setIsDebugFinished(true);
        }
      }

      if (event.data.command === Commands.MEMORY_SIZE) {
        const pageSize = event.data.payload.memorySize as number;
        dispatch(setPageSize({ pageSize, id: worker.id }));
      }
      if (event.data.command === Commands.MEMORY_PAGE) {
        dispatch(
          changePage({
            id: worker.id,
            pageNumber: event.data.payload.pageNumber,
            data: event.data.payload.memoryPage,

            isLoading: false,
          }),
        );
      } else if (event.data.command === Commands.MEMORY_RANGE) {
        const { start, end, memoryRange } = event.data.payload;
        dispatch(changeRange({ id: worker.id, start, end, memoryRange, isLoading: false }));
      }
    };

    worker.worker.addEventListener("message", globalMessageHandlers[worker.id]);

    worker.worker.postMessage({
      command: Commands.INIT,
      payload: {
        initialState: debuggerState.initialState,
        program: debuggerState.program,
      },
    });

    worker.worker.postMessage({
      command: Commands.MEMORY_SIZE,
    });
  });
});

export const changePageAllWorkers = createAsyncThunk(
  "workers/changePageAllWorkers",
  async (pageNumber: number, { getState }) => {
    const state = getState() as RootState;

    state.workers.forEach((worker) => {
      worker.worker.postMessage({ command: Commands.MEMORY_PAGE, payload: { pageNumber } });
    });
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
    { getState },
  ) => {
    const state = getState() as RootState;

    state.workers.forEach((worker) => {
      worker.worker.postMessage({ command: Commands.MEMORY_RANGE, payload: { start, end } });
    });
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
            const messageHandler = (event: MessageEvent<TargetOnMessageParams>) => {
              if ("status" in event.data && event.data.status === "error") {
                logError(`An error occured on command ${event.data.command}`, event.data.error);
              }

              if (event.data.command === Commands.STEP) {
                const { state, isRunMode, isFinished } = event.data.payload;
                const currentState = getState() as RootState;
                const debuggerState = currentState.debugger;

                if (isFinished) {
                  dispatch(setIsDebugFinished(true));
                }

                if (state.pc === undefined) {
                  throw new Error("Program counter is undefined");
                }

                resolve({
                  isFinished,
                  state,
                  isRunMode,
                  isBreakpoint: debuggerState.breakpointAddresses.includes(state.pc),
                });

                console.log("Response from worker:", {
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
              command: "step",
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

    const anyFinished = responses.some((response) => response.isFinished);

    const allRunning = responses.every((response) => response.isRunMode);

    const anyBreakpoint = responses.some((response) => response.isBreakpoint);

    if (allSame && !anyFinished && allRunning && !anyBreakpoint) {
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

  state.workers.forEach((worker) => {
    const messageHandler = (event: MessageEvent<TargetOnMessageParams>) => {
      if (event.data.command === Commands.STEP) {
        const { state, isFinished } = event.data.payload;

        if (isFinished) {
          dispatch(setIsDebugFinished(true));
        }

        if (state.pc === undefined) {
          throw new Error("Program counter is undefined");
        }

        worker.worker.removeEventListener("message", messageHandler);
      }
    };

    worker.worker.addEventListener("message", messageHandler);

    worker.worker.postMessage({
      command: "step",
      payload: {
        program: debuggerState.program,
      },
    });
  });
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
      console.log("Worker created", action.payload);
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
            pageNumber: undefined,
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

export default workers.reducer;
