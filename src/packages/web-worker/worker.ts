import { CurrentInstruction, ExpectedState, InitialState, Pvm as InternalPvm, Status } from "@/types/pvm";
import { nextInstruction } from "./pvm";
import { getMemoryPage, getState, isInternalPvm, SupportedLangs } from "@/packages/web-worker/utils.ts";
import { WasmPvmShellInterface } from "@/packages/web-worker/wasmPvmShell.ts";
import { load } from "./command-handlers/load";
import { init } from "./command-handlers/init";

export enum Commands {
  LOAD = "load",
  INIT = "init",
  STEP = "step",
  RUN = "run",
  STOP = "stop",
  MEMORY_PAGE = "memory_page",
  MEMORY_RANGE = "memory_range",
  MEMORY_SIZE = "memory_size",
}

export enum PvmTypes {
  BUILT_IN = "built-in",
  WASM_URL = "wasm-url",
  WASM_FILE = "wasm-file",
}

export enum CommandStatus {
  SUCCESS = "success",
  ERROR = "error",
}

// TODO: unify the api
export type PvmApiInterface = WasmPvmShellInterface | InternalPvm;
let pvm: PvmApiInterface | null = null;
let isRunMode = false;

export type TargetOnMessageParams =
  | { command: Commands.LOAD; status: CommandStatus; error?: unknown }
  | { command: Commands.INIT; status: CommandStatus; error?: unknown; payload: { initialState: InitialState } }
  | {
      command: Commands.STEP;
      payload: { state: ExpectedState; result: CurrentInstruction; isFinished: boolean; isRunMode: boolean };
    }
  | { command: Commands.RUN; payload: { state: ExpectedState; isFinished: boolean; isRunMode: boolean } }
  | { command: Commands.STOP; payload: { isRunMode: boolean } }
  | { command: Commands.MEMORY_PAGE; payload: { pageNumber: number; memoryPage: Uint8Array } }
  | { command: Commands.MEMORY_RANGE; payload: { start: number; end: number; memoryRange: Uint8Array } }
  | { command: Commands.MEMORY_SIZE; payload: { pageNumber: number; memorySize: number } };

export type WorkerOnMessageParams =
  | {
      command: Commands.LOAD;
      payload: { type: PvmTypes; params: { url?: string; file?: Blob; lang?: SupportedLangs } };
    }
  | { command: Commands.INIT; payload: { program: Uint8Array; initialState: InitialState } }
  | { command: Commands.STEP; payload: { program: number[] } }
  | { command: Commands.RUN }
  | { command: Commands.STOP }
  | { command: Commands.MEMORY_PAGE; payload: { pageNumber: number } }
  | { command: Commands.MEMORY_RANGE; payload: { start: number; end: number } }
  | { command: Commands.MEMORY_SIZE };

export function postTypedMessage(msg: TargetOnMessageParams) {
  postMessage(msg);
}

onmessage = async (e: MessageEvent<WorkerOnMessageParams>) => {
  if (!e.data?.command) {
    return;
  }
  console.log("Worker received message", e.data);

  let result;
  let state;
  // let program;
  let isFinished;
  if (e.data.command === Commands.LOAD) {
    const data = await load(e.data.payload);
    pvm = data.pvm;
    postTypedMessage({ command: Commands.LOAD, status: data.status, error: data.error });
  } else if (e.data.command === Commands.INIT) {
    const data = await init({ pvm, program: e.data.payload.program, initialState: e.data.payload.initialState });

    postTypedMessage({
      command: Commands.INIT,
      status: data.status,
      error: data.error,
      payload: {
        initialState: data.initialState,
      },
    });
  } else if (e.data.command === Commands.STEP) {
    if (!pvm) {
      throw new Error("PVM is uninitialized.");
    }
    if (isInternalPvm(pvm)) {
      isFinished = pvm.nextStep() !== Status.OK;
    } else {
      isFinished = !pvm.nextStep();
    }
    if (isFinished) {
      isRunMode = false;
    }
    state = getState(pvm);
    result = nextInstruction(state.pc ?? 0, e.data.payload.program) as unknown as CurrentInstruction;

    postTypedMessage({ command: Commands.STEP, payload: { result, state, isFinished, isRunMode } });
  } else if (e.data.command === Commands.RUN) {
    isRunMode = true;
    postTypedMessage({ command: Commands.RUN, payload: { isRunMode, isFinished: true, state: state ?? {} } });
  } else if (e.data.command === Commands.STOP) {
    isRunMode = false;
    postTypedMessage({
      command: Commands.RUN,
      payload: {
        isRunMode,
        isFinished: isFinished ?? true,
        state: state ?? {},
      },
    });
  } else if (e.data.command === Commands.MEMORY_PAGE) {
    const memoryPage = getMemoryPage(e.data.payload.pageNumber, pvm);

    postMessage({
      command: Commands.MEMORY_PAGE,
      payload: { pageNumber: e.data.payload.pageNumber, memoryPage },
    });
  } else if (e.data.command === Commands.MEMORY_SIZE) {
    // Get first page to check the memory size
    const memoryPage = getMemoryPage(0, pvm);

    postMessage({
      command: Commands.MEMORY_SIZE,
      // TODO fix types
      payload: { pageNumber: 0, memorySize: (memoryPage as unknown as Array<number>)?.length },
    });
  }
  // TODO uncomennet and finish implementation
  // else if (e.data.command === Commands.MEMORY_RANGE) {
  //   const memoryRange = Object.values(memory).flat().slice(e.data.payload.start, e.data.payload.end);
  //   postMessage({
  //     command: Commands.MEMORY_RANGE,
  //     payload: {
  //       start: e.data.payload.start,
  //       end: e.data.payload.end,
  //       memoryRange: memoryRange,
  //     },
  //   });
  // }
};
