import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { spawnWorker } from "@/packages/web-worker/spawnWorker.ts";
import { RootState } from "@/store";
import { CurrentInstruction, ExpectedState } from "@/types/pvm.ts";
import { setIsDebugFinished } from "@/store/debugger/debuggerSlice.ts";
import { Commands, PvmTypes } from "@/packages/web-worker/worker.ts";

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

export const createWorker = createAsyncThunk("workers/createWorker", async (id: string, { getState, dispatch }) => {
  const state = getState() as RootState;
  const debuggerState = state.debugger;

  const worker = await spawnWorker({
    setCurrentState: (value) => dispatch(setWorkerCurrentState({ id, currentState: value })),
    setCurrentInstruction: (value) =>
      dispatch(
        setWorkerCurrentInstruction({
          id,
          instruction: value,
        }),
      ),
    breakpointAddresses: debuggerState.breakpointAddresses,
    initialState: debuggerState.initialState,
    program: debuggerState.program,
    setIsRunMode: () => {},
    setIsDebugFinished: () => {},
    restartProgram: () => {},
  });

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
      payload: { type: PvmTypes; params?: { url?: string; file?: Blob } };
    },
    { getState },
  ) => {
    const state = getState() as RootState;
    const worker = state.workers.find((worker) => worker.id === id);
    if (!worker) {
      return;
    }

    return worker.worker.postMessage({
      command: "load",
      payload,
    });
  },
);

export const initWorker = createAsyncThunk("workers/initWorker", async (id: string, { getState }) => {
  const state = getState() as RootState;
  const worker = state.workers.find((worker) => worker.id === id);
  const debuggerState = state.debugger;

  if (!worker) {
    return;
  }

  worker.worker.postMessage({
    command: "init",
    payload: {
      initialState: debuggerState.initialState,
      program: debuggerState.program,
    },
  });
});

export const initAllWorkers = createAsyncThunk("workers/initAllWorkers", async (_, { getState, dispatch }) => {
  const state = getState() as RootState;
  const debuggerState = state.debugger;

  state.workers.forEach((worker) => {
    worker.worker.postMessage({
      command: "init",
      payload: {
        initialState: debuggerState.initialState,
        program: debuggerState.program,
      },
    });

    const messageHandler = (event: MessageEvent) => {
      if (event.data.command === Commands.MEMORY_SIZE) {
        console.log("Memory size:", event.data.payload.memorySize);
        dispatch(setPageSize(event.data.payload.memorySize));
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

    worker.worker.addEventListener("message", messageHandler);

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
            const messageHandler = (event: MessageEvent) => {
              if (event.data.command === Commands.STEP) {
                const { state, isRunMode, isFinished } = event.data.payload;
                const currentState = getState() as RootState;
                const debuggerState = currentState.debugger;

                // TODO: check all of this stuff if needed
                if (isRunMode && !isFinished && state.pc && !debuggerState.breakpointAddresses.includes(state.pc)) {
                  // worker.worker.postMessage({ command: "step", payload: { program: debuggerState.program } });
                }

                if (isRunMode && state.pc && debuggerState.breakpointAddresses.includes(state.pc)) {
                  // worker.worker.postMessage({ command: "stop", payload: { program: debuggerState.program } });
                  // dispatch(setIsRunMode(false));
                }

                if (isFinished) {
                  dispatch(setIsDebugFinished(true));
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

export const stepAllWorkers = createAsyncThunk("workers/stepAllWorkers", async (_, { getState }) => {
  const state = getState() as RootState;
  const debuggerState = state.debugger;

  state.workers.forEach((worker) => {
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
        worker.currentInstruction = action.payload.instruction;
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
