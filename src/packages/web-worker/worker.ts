import { CurrentInstruction, ExpectedState, InitialState, RegistersArray, Status } from "@/types/pvm";
import { initPvm, nextInstruction } from "./pvm";
import { Pvm as PvmInstance } from "@typeberry/pvm";

export enum Commands {
  LOAD = "load",
  INIT = "init",
  STEP = "step",
  RUN = "run",
  STOP = "stop",
}

export enum PvmTypes {
  BUILT_IN = "built-in",
  WASM_URL = "wasm-url",
}

export enum CommandResult {
  SUCCESS = "success",
  ERROR = "error",
}

// TODO: unify the api
export type PvmApiInterface = typeof PvmInstance & { getProgramCounter?: () => void };
let pvm: PvmApiInterface | null = null;
let isRunMode = false;

export type TargerOnMessageParams =
  | { command: Commands.LOAD }
  | { command: Commands.INIT; payload: { program: number[]; initialState: InitialState } }
  | {
      command: Commands.STEP;
      payload: { state: ExpectedState; result: CurrentInstruction; isFinished: boolean; isRunMode: boolean };
    }
  | { command: Commands.RUN; payload: { state: ExpectedState; isFinished: boolean; isRunMode: boolean } }
  | { command: Commands.STOP; payload: { isRunMode: boolean } };

export type WorkerOnMessageParams =
  | { command: Commands.LOAD; payload: { type: PvmTypes; params: { url?: string } } }
  | { command: Commands.INIT; payload: { program: number[]; initialState: InitialState } }
  | { command: Commands.STEP; payload: { program: number[] } }
  | { command: Commands.RUN }
  | { command: Commands.STOP };

onmessage = async (e: MessageEvent<WorkerOnMessageParams>) => {
  if (!e.data?.command) {
    return;
  }

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
      if (e.data.payload.type === PvmTypes.WASM_URL) {
        try {
          const url = e.data.payload.params.url ?? "";
          const isValidUrl = Boolean(new URL(url));

          if (!isValidUrl) {
            throw new Error("Invalid PVM URL");
          }

          const response = await fetch(url);
          const bytes = await response.arrayBuffer();
          const wasmModule = await WebAssembly.instantiate(bytes, {});
          console.log("WASM module loaded", wasmModule.instance.exports);
          pvm = wasmModule.instance.exports;
          postMessage({ command: Commands.LOAD, result: CommandResult.SUCCESS });
        } catch (error) {
          console.error(error);
          postMessage({ command: Commands.LOAD, result: CommandResult.ERROR });
        }
      }
      break;
    case Commands.INIT:
      console.log(" was there init");
      // TODO: unify the api
      if (pvm?.reset) {
        console.log("pvm reset", pvm);
        pvm.reset(e.data.payload.program, e.data.payload.initialState);
      } else {
        console.log("pvm onit", pvm);
        pvm = initPvm(e.data.payload.program, e.data.payload.initialState);
      }
      postMessage({ command: Commands.INIT, result: CommandResult.SUCCESS });
      break;
    case Commands.STEP:
      console.log({
        pvm,
      });
      isFinished = pvm.nextStep() !== Status.OK;
      result = nextInstruction(pvm, e.data.payload.program);
      state = {
        pc: pvm.getPC ? pvm.getPC() : pvm.getProgramCounter(),
        regs: pvm.getRegisters() ? Array.from(pvm.getRegisters()) : (new Array(13).fill(0) as RegistersArray),
        gas: pvm.getGas ? pvm.getGas() : pvm.getGasLeft(),
        // pageMap: pvm.getMemory() as unknown as PageMapItem[],
        // memory: pvm.getMemory(),
        status: pvm.getStatus() as unknown as Status,
      };

      postMessage({ command: Commands.STEP, payload: { result, state, isFinished, isRunMode } });
      break;
    case Commands.RUN:
      isRunMode = true;
      postMessage({ command: Commands.RUN, payload: { isRunMode, isFinished: true } });
      break;
    case Commands.STOP:
      isRunMode = false;
      postMessage({ command: Commands.RUN, payload: { isRunMode } });
      break;
    default:
      break;
  }

  postMessage(["received", e.data]);
};
