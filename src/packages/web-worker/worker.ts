import { CurrentInstruction, ExpectedState, InitialState, Pvm as InternalPvm, Status } from "@/types/pvm";
import { initPvm, nextInstruction } from "./pvm";
import {
  getMemoryPage,
  getState,
  isInternalPvm,
  loadArrayBufferAsWasm,
  regsAsUint8,
} from "@/packages/web-worker/utils.ts";
import { WasmPvmShellInterface } from "@/packages/web-worker/wasmPvmShell.ts";

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

export enum CommandResult {
  SUCCESS = "success",
  ERROR = "error",
}

// TODO: unify the api
export type PvmApiInterface = WasmPvmShellInterface | InternalPvm;
let pvm: PvmApiInterface | null = null;
let isRunMode = false;

export type TargetOnMessageParams =
  | { command: Commands.LOAD; result: CommandResult }
  | { command: Commands.INIT; payload: { initialState: InitialState } }
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
  | { command: Commands.LOAD; payload: { type: PvmTypes; params: { url?: string; file?: Blob } } }
  | { command: Commands.INIT; payload: { program: number[]; initialState: InitialState } }
  | { command: Commands.STEP; payload: { program: number[] } }
  | { command: Commands.RUN }
  | { command: Commands.STOP }
  | { command: Commands.MEMORY_PAGE; payload: { pageNumber: number } }
  | { command: Commands.MEMORY_RANGE; payload: { start: number; end: number } }
  | { command: Commands.MEMORY_SIZE };

function postTypedMessage(msg: TargetOnMessageParams) {
  postMessage(msg);
}

onmessage = async (e: MessageEvent<WorkerOnMessageParams>) => {
  if (!e.data?.command) {
    return;
  }

  console.log(e.data?.command);

  let result;
  let state;
  // let program;
  let isFinished;
  if (e.data.command === Commands.LOAD) {
    if (e.data.payload.type === PvmTypes.BUILT_IN) {
      // TODO: currently there's only one built-in PVM so there's no need to load it
      pvm = null;
      postMessage({ command: Commands.LOAD, result: CommandResult.SUCCESS });
    }
    if (e.data.payload.type === PvmTypes.WASM_FILE) {
      try {
        const file = e.data.payload.params.file;
        if (!file) {
          throw new Error("No PVM file");
        }

        console.log("Load WASM from file", file);
        const bytes = await file.arrayBuffer();
        pvm = await loadArrayBufferAsWasm(bytes);

        postTypedMessage({ command: Commands.LOAD, result: CommandResult.SUCCESS });
      } catch (error) {
        console.error(error);
        postTypedMessage({ command: Commands.LOAD, result: CommandResult.ERROR });
      }
    }
    if (e.data.payload.type === PvmTypes.WASM_URL) {
      try {
        const url = e.data.payload.params.url ?? "";
        const isValidUrl = Boolean(new URL(url));

        if (!isValidUrl) {
          throw new Error("Invalid PVM URL");
        }

        console.log("Load WASM from URL", url);
        const response = await fetch(url);
        const bytes = await response.arrayBuffer();
        pvm = await loadArrayBufferAsWasm(bytes);

        postTypedMessage({ command: Commands.LOAD, result: CommandResult.SUCCESS });
      } catch (error) {
        console.error(error);
        postTypedMessage({ command: Commands.LOAD, result: CommandResult.ERROR });
      }
    }
  } else if (e.data.command === Commands.INIT) {
    if (e.data.payload.program.length === 0) {
      console.warn("Skipping init, no program yet.");
      postTypedMessage({
        command: Commands.INIT,
        payload: {
          initialState: {},
        },
      });
    } else {
      if (!pvm || isInternalPvm(pvm)) {
        console.log("PVM init", pvm);
        pvm = initPvm(e.data.payload.program, e.data.payload.initialState);
      } else {
        console.log("PVM reset", pvm);
        const gas = e.data.payload.initialState.gas || 10000;
        pvm.reset(
          // TODO: check root cause of this type error
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-expect-error
          e.data.payload.program,
          regsAsUint8(e.data.payload.initialState.regs),
          BigInt(gas),
        );
        // TODO: will be replaced with setGas, setPC in future
        pvm.resume(e.data.payload.initialState.pc ?? 0, BigInt(gas));
      }

      postTypedMessage({
        command: Commands.INIT,
        payload: {
          initialState: pvm ? getState(pvm) : {},
        },
      });
    }
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

    console.log("memoryPage", memoryPage);
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
