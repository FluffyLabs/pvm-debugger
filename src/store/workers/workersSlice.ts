import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { spawnWorker } from "@/packages/web-worker/spawnWorker.ts";
import { RootState } from "@/store";
import { CurrentInstruction, ExpectedState } from "@/types/pvm.ts";
import { selectBreakpointAddresses, selectInitialState, selectProgram } from "@/store/debugger/debuggerSlice.ts";

export interface WorkerState {
  id: string;
  worker: Worker;
  currentState: ExpectedState;
  previousState: ExpectedState;
  currentInstruction?: CurrentInstruction;
  isRunMode?: boolean;
  isDebugFinished?: boolean;
}

const initialState: WorkerState[] = [];

export const createWorker = createAsyncThunk("workers/createWorker", async (_id: string, { getState, dispatch }: {
  getState: () => RootState;
  dispatch: any;
}) => {
  const state = getState() as RootState;
  // const workersState = state.workers;
  const debuggerState = state.debugger;

  const worker = await spawnWorker({
    setCurrentState: (value) => dispatch(setWorkerCurrentState({ id: "0", currentState: value })),
    setCurrentInstruction: (value) =>
      dispatch(
        setWorkerCurrentInstruction({
          id: "0",
          instruction: value,
        }),
      ),
    breakpointAddresses: () => selectBreakpointAddresses(getState()),
    initialState: () => selectInitialState(getState()),
    program: () => selectProgram(getState()),
    setIsRunMode: () => {},
    setIsDebugFinished: () => {},
    restartProgram: () => {},
    memoryActions: {},
    memory: {},
  });

  return worker;
});

export const loadWorker = createAsyncThunk("workers/loadWorker", async (id: string, { getState }) => {
  const state = getState() as RootState;
  const worker = state.workers.find((worker) => worker.id === id);
  if (!worker) {
    return;
  }

  return worker.worker.postMessage({
    type: "load",
    payload: { type: "built-in" },
  });
});

export const initWorker = createAsyncThunk("workers/initWorker", async (id: string, { getState }) => {
  const state = getState() as RootState;
  const worker = state.workers.find((worker) => worker.id === id);
  if (!worker) {
    return;
  }

  await worker.worker.postMessage({
    type: "init",
    payload: {
      // initialState: state.initialState,
      // program: state.program,
      // breakpointAddresses: state.breakpointAddresses,
      // memoryActions: state.memoryActions,
      // memory: state.memory,
    },
  });
});

export const initAllWorkers = createAsyncThunk("workers/initAllWorkers", async (_, { getState }) => {
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
  });
});

export const runAllWorkers = createAsyncThunk("workers/runAllWorkers", async (_, { getState }) => {
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
});

export const stepAllWorkers = createAsyncThunk("workers/stepAllWorkers", async (_, { getState }) => {
  const state = getState() as RootState;
  const debuggerState = state.debugger;
  console.log({
    debuggerState,
  })

  state.workers.forEach((worker) => {
    worker.worker.postMessage({
      command: "step",
      payload: {
        program: debuggerState.program,
      },
    });
  });
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
    // setWorkerPreviousState(
    //   state,
    //   action: {
    //     payload: {
    //       id: string;
    //       previousState: ExpectedState | ((state: ExpectedState) => ExpectedState);
    //     };
    //   },
    // ) {
    //   const worker = getWorker(state, action.payload.id);
    //   if (worker) {
    //     if (typeof action.payload.previousState === "function") {
    //       worker.previousState = action.payload.previousState(worker.previousState);
    //     } else {
    //       worker.previousState = action.payload.previousState;
    //     }
    //   }
    // },
    setAllWorkersPreviousState(state, action) {
      state.forEach((worker) => {
        worker.previousState = action.payload;
      });
    },
    setWorkerCurrentInstruction(state, action) {
      // console.log('got here');
      const worker = getWorker(state, action.payload.id);
      // console.log('What?', worker);
      if (worker) {
        // console.log([worker, action.payload]);
        worker.currentInstruction = action.payload.instruction;
      }
    },
    setAllWorkersCurrentInstruction(state, action) {
      state.forEach((worker) => {
        worker.currentInstruction = action.payload;
      });
    },
  },
  extraReducers: (builder) => {
    builder.addCase(createWorker.fulfilled, (state, action) => {
      state.push({
        worker: action.payload,
        id: "0",
        currentState: {},
        previousState: {},
      });
    });
  },
});

export const {
  setWorkerCurrentState,
  // setWorkerPreviousState,
  setWorkerCurrentInstruction,
  setAllWorkersCurrentState,
  setAllWorkersPreviousState,
  setAllWorkersCurrentInstruction,
} = workers.actions;
export default workers.reducer;
