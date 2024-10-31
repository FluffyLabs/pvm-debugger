import { CurrentInstruction, ExpectedState, InitialState, Pvm as InternalPvm } from "@/types/pvm";
import { getMemoryPage, SupportedLangs } from "@/packages/web-worker/utils.ts";
import { WasmPvmShellInterface } from "@/packages/web-worker/wasmPvmShell.ts";
import commandHandlers from "./command-handlers";
import { logger } from "@/utils/loggerService";

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
  | { command: Commands.LOAD; status: CommandStatus; error?: unknown; messageId: string }
  | {
      command: Commands.INIT;
      status: CommandStatus;
      error?: unknown;
      payload: { initialState: InitialState };
      messageId: string;
    }
  | {
      command: Commands.STEP;
      status: CommandStatus;
      error?: unknown;
      payload: { state: ExpectedState; result: CurrentInstruction | object; isFinished: boolean; isRunMode: boolean };
      messageId: string;
    }
  | {
      command: Commands.RUN;
      payload: { state: ExpectedState; isFinished: boolean; isRunMode: boolean };
      messageId: string;
    }
  | { command: Commands.STOP; payload: { isRunMode: boolean }; messageId: string }
  | { command: Commands.MEMORY_PAGE; payload: { pageNumber: number; memoryPage: Uint8Array }; messageId: string }
  | {
      command: Commands.MEMORY_RANGE;
      payload: { start: number; end: number; memoryRange: Uint8Array };
      messageId: string;
    }
  | { command: Commands.MEMORY_SIZE; payload: { pageNumber: number; memorySize: number }; messageId: string };

export type WorkerOnMessageParams =
  | {
      command: Commands.LOAD;
      payload: { type: PvmTypes; params: { url?: string; file?: Blob; lang?: SupportedLangs } };
      messageId: string;
    }
  | { command: Commands.INIT; payload: { program: Uint8Array; initialState: InitialState }; messageId: string }
  | { command: Commands.STEP; payload: { program: number[] }; messageId: string }
  | { command: Commands.RUN; messageId: string }
  | { command: Commands.STOP; messageId: string }
  | { command: Commands.MEMORY_PAGE; payload: { pageNumber: number }; messageId: string }
  | { command: Commands.MEMORY_RANGE; payload: { start: number; end: number }; messageId: string }
  | { command: Commands.MEMORY_SIZE; messageId: string };

export function postTypedMessage(msg: TargetOnMessageParams) {
  postMessage(msg);
}

onmessage = async (e: MessageEvent<WorkerOnMessageParams>) => {
  if (!e.data?.command) {
    return;
  }
  logger.info("Worker received message", e.data);

  let state;
  // let program;
  let isFinished;
  if (e.data.command === Commands.LOAD) {
    const data = await commandHandlers.runLoad(e.data.payload);
    pvm = data.pvm;
    postTypedMessage({ command: Commands.LOAD, status: data.status, error: data.error, messageId: e.data.messageId });
  } else if (e.data.command === Commands.INIT) {
    const data = await commandHandlers.runInit({
      pvm,
      program: e.data.payload.program,
      initialState: e.data.payload.initialState,
    });

    postTypedMessage({
      command: Commands.INIT,
      status: data.status,
      error: data.error,
      payload: {
        initialState: data.initialState,
      },
      messageId: e.data.messageId,
    });
  } else if (e.data.command === Commands.STEP) {
    const { result, state, isFinished, status, error } = commandHandlers.runStep({
      pvm,
      program: e.data.payload.program,
    });
    isRunMode = !isFinished;

    postTypedMessage({
      command: Commands.STEP,
      status,
      error,
      payload: { result, state, isFinished, isRunMode },
      messageId: e.data.messageId,
    });
  } else if (e.data.command === Commands.RUN) {
    isRunMode = true;
    postTypedMessage({
      command: Commands.RUN,
      payload: { isRunMode, isFinished: true, state: state ?? {} },
      messageId: e.data.messageId,
    });
  } else if (e.data.command === Commands.STOP) {
    isRunMode = false;
    postTypedMessage({
      command: Commands.RUN,
      payload: {
        isRunMode,
        isFinished: isFinished ?? true,
        state: state ?? {},
      },
      messageId: e.data.messageId,
    });
  } else if (e.data.command === Commands.MEMORY_PAGE) {
    const memoryPage = getMemoryPage(e.data.payload.pageNumber, pvm);

    postMessage({
      command: Commands.MEMORY_PAGE,
      messageId: e.data.messageId,
      payload: { pageNumber: e.data.payload.pageNumber, memoryPage },
    });
  } else if (e.data.command === Commands.MEMORY_SIZE) {
    // Get first page to check the memory size
    const memoryPage = getMemoryPage(0, pvm);

    postMessage({
      command: Commands.MEMORY_SIZE,
      messageId: e.data.messageId,
      // TODO fix types
      payload: { pageNumber: 0, memorySize: (memoryPage as unknown as Array<number>)?.length },
    });
  }
  // TODO uncomment and finish implementation
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
