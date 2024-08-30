import {
  CurrentInstruction,
  ExpectedState,
  InitialState,
  Pvm as InternalPvm,
  RegistersArray,
  Status,
} from "@/types/pvm";
import { initPvm, nextInstruction } from "./pvm";
import { Pvm as InternalPvmInstance } from "@typeberry/pvm";
import * as wasmPvmShell from "@/packages/web-worker/wasmPvmShell.ts";

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

export type TargerOnMessageParams =
  | { command: Commands.LOAD; result: CommandResult }
  | { command: Commands.INIT; payload: { initialState: InitialState } }
  | {
      command: Commands.STEP;
      payload: { state: ExpectedState; result: CurrentInstruction; isFinished: boolean; isRunMode: boolean };
    }
  | { command: Commands.RUN; payload: { state: ExpectedState; isFinished: boolean; isRunMode: boolean } }
  | { command: Commands.STOP; payload: { isRunMode: boolean } };

export type WorkerOnMessageParams =
  | { command: Commands.LOAD; payload: { type: PvmTypes; params: { url?: string; file?: Blob } } }
  | { command: Commands.INIT; payload: { program: number[]; initialState: InitialState } }
  | { command: Commands.STEP; payload: { program: number[] } }
  | { command: Commands.RUN }
  | { command: Commands.STOP };

function postTypedMessage(msg: TargerOnMessageParams) {
  postMessage(msg);
}

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
      if (e.data.payload.type === PvmTypes.WASM_FILE) {
        try {
          const file = e.data.payload.params.file;
          if (!file) {
            throw new Error("No PVM file");
          }
          const bytes = await file.arrayBuffer();
          const wasmModule = await WebAssembly.instantiate(bytes, {});
          console.log("WASM module loaded", wasmModule.instance.exports);
          wasmPvmShell.__wbg_set_wasm(wasmModule.instance.exports);
          pvm = wasmPvmShell;
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

          const response = await fetch(url);
          const bytes = await response.arrayBuffer();
          const wasmModule = await WebAssembly.instantiate(bytes, {});
          console.log("WASM module loaded", wasmModule.instance.exports);
          wasmPvmShell.__wbg_set_wasm(wasmModule.instance.exports);
          pvm = wasmPvmShell;
          postTypedMessage({ command: Commands.LOAD, result: CommandResult.SUCCESS });
        } catch (error) {
          console.error(error);
          postTypedMessage({ command: Commands.LOAD, result: CommandResult.ERROR });
        }
      }
      break;
    case Commands.INIT:
      if (e.data.payload.program.length === 0) {
        console.warn("Skiping init, no program yet.");
        postTypedMessage({
          command: Commands.INIT,
          payload: {
            initialState: {},
          },
        });
        break;
      }
      console.log(" was there init");
      // TODO: unify the api
      if (pvm && "reset" in pvm) {
        pvm.reset(
          e.data.payload.program,
          regsAsUint8(e.data.payload.initialState.regs),
          BigInt(e.data.payload.initialState.gas || 10000),
        );
      } else {
        console.log("pvm init", pvm);
        pvm = initPvm(e.data.payload.program, e.data.payload.initialState);
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
        throw new Error("PVM is unitialized.");
      }
      if (isInternalPvm(pvm)) {
        isFinished = pvm.nextStep() !== Status.OK;
      } else {
        isFinished = !pvm.nextStep();
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
    default:
      break;
  }

  postMessage(["received", e.data]);
};

function getState(pvm: PvmApiInterface): ExpectedState {
  let newState: ExpectedState;
  if (isInternalPvm(pvm)) {
    newState = {
      pc: pvm.getPC(),
      regs: pvm.getRegisters(),
      gas: pvm.getGas(),
      status: pvm.getStatus(),
    };
  } else {
    newState = {
      pc: pvm.getProgramCounter(),
      regs: uint8asRegs(pvm.getRegisters()),
      gas: pvm.getGasLeft(),
      status: pvm.getStatus() as Status,
    };
  }
  return newState;
}

function regsAsUint8(regs?: RegistersArray): Uint8Array {
  const arr = new Uint8Array(13 * 4);
  if (!regs) {
    return arr;
  }

  let i = 0;
  for (const reg of regs) {
    arr[i] = reg & 0xff;
    arr[i + 1] = (reg >> 8) & 0xff;
    arr[i + 2] = (reg >> 16) & 0xff;
    arr[i + 3] = (reg >> 24) & 0xff;
    i += 4;
  }
  return arr;
}

function uint8asRegs(arr: Uint8Array): RegistersArray {
  const regs: RegistersArray = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  let idx = 0;
  for (const regIdx of regs) {
    let num = arr[idx + 3];
    num = (num << 8) + arr[idx + 2];
    num = (num << 8) + arr[idx + 1];
    num = (num << 8) + arr[idx];
    regs[regIdx] = num;
    idx += 4;
  }
  return regs;
}

function isInternalPvm(pvm: PvmApiInterface): pvm is InternalPvm {
  return pvm instanceof InternalPvmInstance;
}
