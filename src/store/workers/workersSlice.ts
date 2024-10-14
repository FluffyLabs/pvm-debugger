import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { spawnWorker } from "@/packages/web-worker/spawnWorker.ts";
import { RootState } from "@/store";
import { CurrentInstruction, ExpectedState } from "@/types/pvm.ts";
import {
  selectBreakpointAddresses,
  selectInitialState,
  selectProgram,
  setIsDebugFinished,
  setIsRunMode,
} from "@/store/debugger/debuggerSlice.ts";
import { Commands } from "@/packages/web-worker/worker.ts";

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

export const createWorker = createAsyncThunk("workers/createWorker", async (id: string, { getState, dispatch }) => {
  const state = getState() as RootState;
  // const workersState = state.workers;
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
    breakpointAddresses: () => selectBreakpointAddresses(getState() as RootState),
    initialState: () => selectInitialState(getState() as RootState),
    program: () => selectProgram(getState() as RootState),
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
  const debuggerState = state.debugger;

  if (!worker) {
    return;
  }

  console.log("is init ");

  worker.worker.postMessage({
    type: "init",
    payload: {
      initialState: debuggerState.initialState,
      program: debuggerState.program,
    },
  });
});

export const initAllWorkers = createAsyncThunk("workers/initAllWorkers", async (_, { getState }) => {
  const state = getState() as RootState;
  const debuggerState = state.debugger;

  state.workers.forEach((worker) => {
    console.log("is initod ");
    worker.worker.postMessage({
      command: "init",
      payload: {
        initialState: debuggerState.initialState,
        program: debuggerState.program,
      },
    });
  });
});

export const runAllWorkers = createAsyncThunk("workers/runAllWorkers", async (_, { getState, dispatch }) => {
  const state = getState() as RootState;
  const debuggerState = state.debugger;

  // TODO: probably run is no more needed
  // state.workers.forEach((worker) => {
  //   worker.worker.postMessage({
  //     command: "run",
  //     payload: {
  //       program: debuggerState.program,
  //     },
  //   });
  // });

  const stepAllWorkersAgain = async () => {
    const responses = await Promise.all(
      state.workers.map((worker) => {
        return new Promise((resolve: (value: { isFinished: boolean; state: ExpectedState }) => void) => {
          const messageHandler = (event: MessageEvent) => {
            if (event.data.command === Commands.STEP) {
              const { state, isRunMode, isFinished } = event.data.payload;
              const currentState = getState() as RootState;
              const debuggerState = currentState.debugger;

              if (isRunMode && !isFinished && state.pc && !debuggerState.breakpointAddresses.includes(state.pc)) {
                worker.worker.postMessage({ command: "step", payload: { program: debuggerState.program } });
              }

              if (isRunMode && state.pc && debuggerState.breakpointAddresses.includes(state.pc)) {
                worker.worker.postMessage({ command: "stop", payload: { program: debuggerState.program } });
                dispatch(setIsRunMode(false));
              }

              if (isFinished) {
                dispatch(setIsDebugFinished(true));
              }

              resolve({
                isFinished,
                state,
              });

              console.log("Response from worker:", {
                isFinished,
                state,
              });
            }
            worker.worker.removeEventListener("message", messageHandler);
          };

          worker.worker.addEventListener("message", messageHandler);

          worker.worker.postMessage({
            command: "step",
            payload: {
              program: debuggerState.program,
            },
          });
        });
      }),
    );

    const allSame = responses.every(
      (response) => JSON.stringify(response.state) === JSON.stringify(responses[0].state),
    );
    const anyFinished = responses.some((response) => response.isFinished);

    console.log("All responses:", responses);
    console.log("Are all responses the same?", allSame);
    console.log("Is any finished ?", anyFinished);

    if (allSame && !anyFinished) {
      await stepAllWorkersAgain();
    }
  };

  await stepAllWorkersAgain();
});

export const stepAllWorkers = createAsyncThunk("workers/stepAllWorkers", async (_, { getState }) => {
  const state = getState() as RootState;
  const debuggerState = state.debugger;
  console.log({
    debuggerState,
  });

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
