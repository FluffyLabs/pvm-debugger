import { InitialState, PageMapItem, RegistersArray, Status } from "@/types/pvm";
import { Pvm as PvmInstance } from "@typeberry/pvm";
import { nextInstruction } from "@/packages/web-worker/pvm.ts";

export enum Commands {
  LOAD = "load",
  INIT = "init",
  STEP = "step",
  RUN = "run",
  STOP = "stop",
}

export type WasmPvmInstance = typeof PvmInstance & { getProgramCounter?: () => void };
let pvm: WasmPvmInstance | null = null;
let isRunMode = false;

export type WorkerOnMessageParams =
  | { command: Commands.LOAD }
  | { command: Commands.INIT; payload: { program: number[]; initialState: InitialState } }
  | { command: Commands.STEP; payload: { program: number[] } }
  | { command: Commands.RUN }
  | { command: Commands.STOP };

onmessage = async (e: MessageEvent<WorkerOnMessageParams>) => {
  if (!e.data?.command) {
    return;
  }

  const wasmUrl = "https://fluffylabs.dev/pvm-shell/pkg/pvm_shell_bg.wasm";

  let result;
  let state;
  // let program;
  let isFinished;
  let wasmInstance;
  let programCounter;

  switch (e.data.command) {
    case Commands.LOAD:
      try {
        const response = await fetch(wasmUrl);
        const bytes = await response.arrayBuffer();
        const wasmModule = await WebAssembly.instantiate(bytes, {});
        console.log({
          wasmModule,
        });
        console.log("WASM module loaded", wasmModule.instance.exports);
        wasmInstance = wasmModule.instance.exports;
        pvm = wasmInstance;
      } catch (error) {
        console.error(error);
      }
      break;
    case Commands.INIT:
      console.log("wasmInstance", pvm);
      pvm.reset(e.data.payload.program, e.data.payload.initialState);
      postMessage({ command: Commands.INIT, result: "success" });
      break;
    case Commands.STEP:
      isFinished = pvm.nextStep() !== Status.OK;
      result = nextInstruction(pvm, e.data.payload.program);
      programCounter = pvm.getPC ? pvm.getPC() : pvm.getProgramCounter();
      state = {
        pc: programCounter,
        // regs: Array.from(pvm.getRegisters()) as RegistersArray,
        // gas: pvm.getGas(),
        // pageMap: pvm.getMemory() as unknown as PageMapItem[],
        // memory: pvm.getMemory(),
        status: pvm.getStatus() as unknown as Status,
      };

      postMessage({ command: Commands.STEP, payload: { result, state, isFinished, isRunMode } });
      break;
    case Commands.RUN:
      isRunMode = true;
      programCounter = pvm.getPC ? pvm.getPC() : pvm.getProgramCounter();
      state = {
        pc: programCounter,
        regs: Array.from(pvm.getRegisters()) as RegistersArray,
        gas: pvm.getGas(),
        pageMap: pvm.getMemory() as unknown as PageMapItem[],
        memory: pvm.getMemory(),
        status: pvm.getStatus() as unknown as Status,
      };
      postMessage({ command: Commands.RUN, payload: { isRunMode, state, isFinished: true } });
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
