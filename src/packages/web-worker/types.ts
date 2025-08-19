import { CurrentInstruction, ExpectedState, InitialState } from "@/types/pvm";
import { WasmPvmShellInterface } from "./wasmBindgenShell";
import { Pvm as InternalPvm } from "@/types/pvm";
import { SerializedFile } from "@/lib/utils.ts";

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
        payload: {
          state: ExpectedState;
          result: CurrentInstruction | object;
          isFinished: boolean;
          isRunMode: boolean;
          exitArg: number;
        };
      }
    | {
        command: Commands.RUN;
        payload: { state: ExpectedState; isFinished: boolean; isRunMode: boolean };
      }
    | { command: Commands.STOP; payload: { isRunMode: boolean } }
    | { command: Commands.MEMORY; payload: { memoryChunk: Uint8Array } }
    | {
        command: Commands.HOST_CALL;
        payload:
          | {
              hostCallIdentifier: number;
            }
          | {
              hostCallIdentifier: number;
              storage?: Storage;
            };
      }
    | { command: Commands.SET_SERVICE_ID }
    | { command: Commands.UNLOAD }
  );

type CommonWorkerRequestParams = { messageId: string };
export type CommandWorkerRequestParams =
  | {
      command: Commands.LOAD;
      payload: { type: PvmTypes; params: { url?: string; file?: SerializedFile } };
    }
  | { command: Commands.INIT; payload: { program: Uint8Array; initialState: InitialState } }
  | { command: Commands.STEP; payload: { program: Uint8Array; stepsToPerform: number } }
  | { command: Commands.RUN }
  | { command: Commands.STOP }
  | { command: Commands.MEMORY; payload: { startAddress: number; stopAddress: number } }
  | { command: Commands.HOST_CALL; payload: { hostCallIdentifier: number } }
  | { command: Commands.SET_SERVICE_ID; payload: { serviceId: number } }
  | { command: Commands.UNLOAD };

export type WorkerRequestParams = CommonWorkerRequestParams & CommandWorkerRequestParams;

export enum Commands {
  LOAD = "load",
  INIT = "init",
  STEP = "step",
  RUN = "run",
  STOP = "stop",
  MEMORY = "memory",
  HOST_CALL = "host_call",
  SET_SERVICE_ID = "set_service_id",
  UNLOAD = "unload",
}

export enum PvmTypes {
  BUILT_IN = "built-in",
  WASM_URL = "wasm-url",
  WASM_FILE = "wasm-file",
  WASM_WS = "wasm-websocket",
}

export enum CommandStatus {
  SUCCESS = "success",
  ERROR = "error",
}

// TODO: unify the api
export type PvmApiInterface = WasmPvmShellInterface | InternalPvm;
