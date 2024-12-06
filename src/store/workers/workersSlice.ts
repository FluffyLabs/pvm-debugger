import { createSlice, createAsyncThunk, isRejected } from "@reduxjs/toolkit";
import { RootState } from "@/store";
import { CurrentInstruction, ExpectedState } from "@/types/pvm.ts";
import { setIsDebugFinished, setIsRunMode, setIsStepMode } from "@/store/debugger/debuggerSlice.ts";
import PvmWorker from "@/packages/web-worker/worker?worker&inline";
import { SupportedLangs } from "@/packages/web-worker/utils.ts";
import { virtualTrapInstruction } from "@/utils/virtualTrapInstruction.ts";
import { logger } from "@/utils/loggerService";
import { Commands, PvmTypes } from "@/packages/web-worker/types";
import { asyncWorkerPostMessage, hasCommandStatusError, LOAD_MEMORY_CHUNK_SIZE, MEMORY_SPLIT_STEP } from "../utils";
import { chunk, inRange, isNumber } from "lodash";

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
  currentInstruction?: CurrentInstruction;
  isRunMode?: boolean;
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
      logger.error(`An error occured on command ${data.command}`, { error: data.error });
    }
  },
);

export const initAllWorkers = createAsyncThunk("workers/initAllWorkers", async (_, { getState, dispatch }) => {
  const state = getState() as RootState;
  const debuggerState = state.debugger;

  return Promise.all(
    state.workers.map(async (worker) => {
      const initData = await asyncWorkerPostMessage(worker.id, worker.worker, {
        command: Commands.INIT,
        payload: {
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

export const continueAllWorkers = createAsyncThunk("workers/continueAllWorkers", async (_, { getState, dispatch }) => {
  const state = getState() as RootState;
  let debuggerState = state.debugger;

  const stepAllWorkersAgain = async () => {
    const responses = await Promise.all(
      state.workers.map(async (worker) => {
        const data = await asyncWorkerPostMessage(worker.id, worker.worker, {
          command: Commands.STEP,
          payload: {
            program: new Uint8Array(debuggerState.program),
            stepsToPerform: debuggerState.stepsToPerform,
          },
        });

        if (hasCommandStatusError(data)) {
          throw data.error;
        }

        const { state, isRunMode, isFinished } = data.payload;

        // START MOVED FROM initAllWorkers
        dispatch(setWorkerCurrentState({ id: worker.id, currentState: state }));
        dispatch(
          setWorkerCurrentInstruction({
            id: worker.id,
            instruction: data.payload.result,
          }),
        );

        // END MOVED FOM initAllWorkers

        const currentState = getState() as RootState;
        debuggerState = currentState.debugger;

        if (state.pc === undefined) {
          throw new Error("Program counter is undefined");
        }

        const isBreakpoint = debuggerState.breakpointAddresses.includes(state.pc);

        logger.info("Response from worker:", {
          isFinished,
          state,
          isRunMode,
          debuggerHit: isBreakpoint,
        });

        if (isBreakpoint) {
          dispatch(setIsRunMode(false));
        }

        return {
          isFinished,
          state,
          isRunMode,
          isBreakpoint,
        };
      }),
    );

    const { workers } = getState() as RootState;
    const allSame = workers.every(
      ({ currentState }) => JSON.stringify(currentState) === JSON.stringify(workers[0].currentState),
    );

    const allFinished = responses.every((response) => response.isFinished);
    const allRunning = responses.every((response) => response.isRunMode);
    const anyBreakpoint = responses.some((response) => response.isBreakpoint);

    if (allFinished) {
      dispatch(setIsDebugFinished(true));
    }

    if (!allSame) {
      dispatch(setIsRunMode(false));
    }

    await dispatch(refreshPageAllWorkers());

    if (debuggerState.isRunMode && allSame && !allFinished && allRunning && !anyBreakpoint) {
      await stepAllWorkersAgain();
    }
  };

  await stepAllWorkersAgain();
});

export const runAllWorkers = createAsyncThunk("workers/runAllWorkers", async (_, { getState, dispatch }) => {
  const state = getState() as RootState;

  await Promise.all(
    state.workers.map(async (worker) => {
      const data = await asyncWorkerPostMessage(worker.id, worker.worker, {
        command: Commands.RUN,
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
          stepsToPerform: debuggerState.stepsToPerform,
        },
      });

      if (hasCommandStatusError(data)) {
        throw data.error;
      }

      const { state, isFinished } = data.payload;

      dispatch(setWorkerCurrentState({ id: worker.id, currentState: state }));
      dispatch(
        setWorkerCurrentInstruction({
          id: worker.id,
          instruction: data.payload.result,
        }),
      );

      dispatch(setIsStepMode(true));

      if (state.pc === undefined) {
        throw new Error("Program counter is undefined");
      }

      return {
        isFinished,
      };
    }),
  );

  const allFinished = responses.every((response) => response.isFinished);

  await dispatch(refreshPageAllWorkers());

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

const getWorker = <T extends { id: string }>(state: T[], id: string) => state.find((worker) => worker.id === id);

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
    setAllWorkersCurrentState(state, action) {
      state.forEach((worker) => {
        if (typeof action.payload === "function") {
          worker.currentState = action.payload(worker.currentState);
        } else {
          // TODO: remove the check and the mapping to status 255 as soon as OK status is not -1 in PVM and PolkaVM anymore
          if (Number(action.payload.currentState?.status) === -1) {
            worker.currentState = {
              ...action.payload,
              status: 255,
            };
          } else {
            worker.currentState = action.payload;
          }
        }
      });
    },
    setAllWorkersPreviousState(state, action) {
      state.forEach((worker) => {
        // TODO: remove the check and the mapping to status 255 as soon as OK status is not -1 in PVM and PolkaVM anymore
        if (Number(action.payload.currentState?.status) === -1) {
          worker.previousState = {
            ...action.payload,
            status: 255,
          };
        } else {
          worker.previousState = action.payload;
        }
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
          startAddress: 0,
          stopAddress: LOAD_MEMORY_CHUNK_SIZE,
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
  appendMemory,
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
export const selectIsAnyWorkerLoading = (state: RootState) => state.workers.some((worker) => worker.isLoading);

export default workers.reducer;
