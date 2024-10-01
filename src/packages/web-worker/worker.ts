import { CurrentInstruction, ExpectedState, InitialState, Pvm as InternalPvm, Status } from "@/types/pvm";
import { initPvm, nextInstruction } from "./pvm";
import * as wasmPvmShell from "@/packages/web-worker/wasmPvmShell.ts";
import { getState, isInternalPvm, loadArrayBufferAsWasm, regsAsUint8 } from "@/packages/web-worker/utils.ts";
import { memory } from "./memoryMock";

export enum Commands {
  LOAD = "load",
  INIT = "init",
  STEP = "step",
  RUN = "run",
  STOP = "stop",
  MEMORY_PAGE = "memory_page",
  MEMORY_RANGE = "memory_range",
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
export type PvmApiInterface = typeof wasmPvmShell | InternalPvm;
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
  | { command: Commands.MEMORY_RANGE; payload: { start: number; end: number; memoryRange: Uint8Array } };

export type WorkerOnMessageParams =
  | { command: Commands.LOAD; payload: { type: PvmTypes; params: { url?: string; file?: Blob } } }
  | { command: Commands.INIT; payload: { program: number[]; initialState: InitialState } }
  | { command: Commands.STEP; payload: { program: number[] } }
  | { command: Commands.RUN }
  | { command: Commands.STOP }
  | { command: Commands.MEMORY_PAGE; payload: { pageNumber: number } }
  | { command: Commands.MEMORY_RANGE; payload: { start: number; end: number } };

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
  switch (e.data.command) {
    case Commands.LOAD:
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
      break;
    case Commands.INIT:
      if (e.data.payload.program.length === 0) {
        console.warn("Skipping init, no program yet.");
        postTypedMessage({
          command: Commands.INIT,
          payload: {
            initialState: {},
          },
        });
        break;
      }

      if (!pvm || isInternalPvm(pvm)) {
        console.log("PVM init", pvm);
        pvm = initPvm(e.data.payload.program, e.data.payload.initialState);
      } else {
        console.log("PVM reset", pvm);
        pvm.reset(
          e.data.payload.program,
          regsAsUint8(e.data.payload.initialState.regs),
          BigInt(e.data.payload.initialState.gas || 10000),
        );
      }

      postTypedMessage({
        command: Commands.INIT,
        payload: {
          initialState: pvm ? getState(pvm) : {},
        },
      });
      break;
    case Commands.STEP:
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
      break;
    case Commands.RUN:
      isRunMode = true;
      postTypedMessage({ command: Commands.RUN, payload: { isRunMode, isFinished: true, state: state ?? {} } });
      break;
    case Commands.STOP:
      isRunMode = false;
      postTypedMessage({
        command: Commands.RUN,
        payload: {
          isRunMode,
          isFinished: isFinished ?? true,
          state: state ?? {},
        },
      });
      break;
    case Commands.MEMORY_PAGE:
      // debugger;
      // eslint-disable-next-line no-case-declarations
      const memoryPage = pvm && "getMemoryPage" in pvm ? pvm.getMemoryPage(e.data.payload.pageNumber) : [];
      if (pvm && "getMemoryPage" in pvm) {
        console.log(memoryPage, e.data.payload.pageNumber, pvm.getMemoryPage);
      }
      postMessage({
        command: Commands.MEMORY_PAGE,
        payload: { pageNumber: e.data.payload.pageNumber, memoryPage },
      });
      break;
    case Commands.MEMORY_RANGE:
      // debugger;
      // const memoryPage = pvm && "getPageDump" in pvm ? pvm.memory.getPageDump(e.data.payload.pageNumber) : [];
      // eslint-disable-next-line no-case-declarations
      const memoryRange = Object.values(memory).flat().slice(e.data.payload.start, e.data.payload.end);
      postMessage({
        command: Commands.MEMORY_RANGE,
        payload: {
          start: e.data.payload.start,
          end: e.data.payload.end,
          memoryRange: memoryRange,
        },
      });
      break;
    default:
      break;
  }
};
