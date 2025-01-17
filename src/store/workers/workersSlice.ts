import { createSlice, createAsyncThunk, isRejected } from "@reduxjs/toolkit";
import { RootState } from "@/store";
import { CurrentInstruction, ExpectedState, HostCallIdentifiers, Status } from "@/types/pvm.ts";
import {
  selectIsDebugFinished,
  setHasHostCallOpen,
  setIsDebugFinished,
  setIsRunMode,
  setIsStepMode,
  setStorage,
} from "@/store/debugger/debuggerSlice.ts";
import PvmWorker from "@/packages/web-worker/worker?worker&inline";
import { SupportedLangs } from "@/packages/web-worker/utils.ts";
import { virtualTrapInstruction } from "@/utils/virtualTrapInstruction.ts";
import { logger } from "@/utils/loggerService";
import { Commands, PvmTypes } from "@/packages/web-worker/types";
import {
  asyncWorkerPostMessage,
  hasCommandStatusError,
  LOAD_MEMORY_CHUNK_SIZE,
  MEMORY_SPLIT_STEP,
  mergePVMAndDebuggerEcalliStorage,
  toPvmStorage,
} from "../utils";
import { chunk, inRange, isNumber } from "lodash";
import { isInstructionError } from "@/types/type-guards";
import { nextInstruction } from "@/packages/web-worker/pvm.ts";

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

export const setAllWorkersStorage = createAsyncThunk("workers/setAllStorage", async (_, { getState }) => {
  const state = getState() as RootState;
  const debuggerState = state.debugger;
  const storage = debuggerState.storage;

  if (storage === null) {
    throw new Error("Storage is not set");
  }

  return Promise.all(
    await state.workers.map(async (worker) => {
      await asyncWorkerPostMessage(worker.id, worker.worker, {
        command: Commands.SET_STORAGE,
        payload: {
          storage: toPvmStorage(storage),
        },
      });
    }),
  );
});

export const setAllWorkersServiceId = createAsyncThunk("workers/setAllStorage", async (_, { getState }) => {
  const state = getState() as RootState;
  const debuggerState = state.debugger;
  const serviceId = debuggerState.serviceId;

  if (serviceId === null) {
    throw new Error("Service id is not set");
  }

  return Promise.all(
    await state.workers.map(async (worker) => {
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

    if (state.debugger.storage === null) {
      return dispatch(setHasHostCallOpen(true));
    } else {
      const previousInstruction = nextInstruction(
        state.workers[0].previousState.pc ?? 0,
        new Uint8Array(state.debugger.program),
      );

      const instructionEnriched = state.debugger.programPreviewResult.find(
        (instruction) => instruction.instructionCode === previousInstruction?.instructionCode,
      );

      if (
        !instructionEnriched ||
        isInstructionError(instructionEnriched)
        // !isOneImmediateArgs(instructionEnriched.args)
      ) {
        throw new Error("Invalid host call instruction");
      }

      await Promise.all(
        state.workers
          .filter(({ id }) => {
            // Allow to call it for a single worker
            return workerId ? workerId === id : true;
          })
          .map(async (worker) => {
            const resp = await asyncWorkerPostMessage(worker.id, worker.worker, {
              command: Commands.HOST_CALL,
              payload: { hostCallIdentifier: worker.exitArg as HostCallIdentifiers },
            });
            if (
              resp.payload.hostCallIdentifier === HostCallIdentifiers.WRITE &&
              resp.payload.storage &&
              // Remove if we decide to make storage initialization optional
              state.debugger.storage
            ) {
              const newStorage = mergePVMAndDebuggerEcalliStorage(resp.payload.storage, state.debugger.storage);
              dispatch(setStorage(newStorage));
            }

            if ((getState() as RootState).debugger.isRunMode) {
              dispatch(continueAllWorkers());
            }

            if (hasCommandStatusError(resp)) {
              throw new Error(resp.error.message);
            }
          }),
      );

      if (selectShouldContinueRunning(state)) {
        dispatch(continueAllWorkers());
      }

      return;
    }
  },
);

export const continueAllWorkers = createAsyncThunk("workers/continueAllWorkers", async (_, { getState, dispatch }) => {
  const stepAllWorkersAgain = async () => {
    await dispatch(stepAllWorkers({})).unwrap();
    const allSame = selectHasAllSameState(getState() as RootState);

    if (!allSame) {
      dispatch(setIsRunMode(false));
    }

    const state = getState() as RootState;

    if (selectShouldContinueRunning(state)) {
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
            program: new Uint8Array(debuggerState.program),
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
            instruction: data.payload.result,
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
          if (debuggerState.storage === null) {
            dispatch(setIsRunMode(false));
          }

          await dispatch(handleHostCall({ workerId: worker.id })).unwrap();
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

    if (allFinished) {
      dispatch(setIsDebugFinished(true));
    }
  },
);

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
    setIsBreakpoint(state, action) {
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
    setWorkerExitArg(state, action) {
      const worker = getWorker(state, action.payload.id);
      if (worker) {
        worker.exitArg = action.payload.exitArg;
      }
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
  setIsBreakpoint,
  appendMemory,
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
