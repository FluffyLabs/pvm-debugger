import { CurrentInstruction, ExpectedState, InitialState } from "@/types/pvm";
import { SupportedLangs } from "./utils";
import { WasmPvmShellInterface } from "./wasmPvmShell";
import { Pvm as InternalPvm } from "@/types/pvm";

type CommonWorkerResponseParams = { status: CommandStatus; error?: unknown; messageId: string };

export type WorkerResponseParams = CommonWorkerResponseParams &
  (
    | { command: Commands.LOAD }
    | {
        command: Commands.INIT;
        payload: { initialState: InitialState };
      }
    | {
        command: Commands.STEP;
        payload: { state: ExpectedState; result: CurrentInstruction | object; isFinished: boolean; isRunMode: boolean };
      }
    | {
        command: Commands.RUN;
        payload: { state: ExpectedState; isFinished: boolean; isRunMode: boolean };
      }
    | { command: Commands.STOP; payload: { isRunMode: boolean } }
    | { command: Commands.MEMORY; payload: { memoryChunk: Uint8Array } }
  );

type CommonWorkerRequestParams = { messageId: string };
export type CommandWorkerRequestParams =
  | {
      command: Commands.LOAD;
      payload: { type: PvmTypes; params: { url?: string; file?: Blob; lang?: SupportedLangs } };
    }
  | { command: Commands.INIT; payload: { program: Uint8Array; initialState: InitialState } }
  | { command: Commands.STEP; payload: { program: Uint8Array } }
  | { command: Commands.RUN }
  | { command: Commands.STOP }
  | { command: Commands.MEMORY; payload: { startAddress: number; stopAddress: number } };

export type WorkerRequestParams = CommonWorkerRequestParams & CommandWorkerRequestParams;

export enum Commands {
  LOAD = "load",
  INIT = "init",
  STEP = "step",
  RUN = "run",
  STOP = "stop",
  MEMORY = "memory",
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
