import { CurrentInstruction, ExpectedState, HostCallIdentifiers, InitialState } from "@/types/pvm";
import { SupportedLangs } from "./utils";
import { WasmPvmShellInterface } from "./wasmBindgenShell";
import { Pvm as InternalPvm } from "@/types/pvm";
import { bytes } from "@typeberry/jam-host-calls";
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
    | { command: Commands.SET_STORAGE }
    | {
        command: Commands.HOST_CALL;
        payload:
          | {
              hostCallIdentifier: Exclude<HostCallIdentifiers, HostCallIdentifiers.WRITE>;
            }
          | {
              hostCallIdentifier: HostCallIdentifiers.WRITE;
              storage?: Storage;
            };
      }
    | { command: Commands.SET_SERVICE_ID }
  );

type CommonWorkerRequestParams = { messageId: string };
export type CommandWorkerRequestParams =
  | {
      command: Commands.LOAD;
      payload: { type: PvmTypes; params: { url?: string; file?: SerializedFile; lang?: SupportedLangs } };
    }
  | { command: Commands.INIT; payload: { program: Uint8Array; initialState: InitialState } }
  | { command: Commands.STEP; payload: { program: Uint8Array; stepsToPerform: number } }
  | { command: Commands.RUN }
  | { command: Commands.STOP }
  | { command: Commands.MEMORY; payload: { startAddress: number; stopAddress: number } }
  | { command: Commands.SET_STORAGE; payload: { storage: Storage } }
  | { command: Commands.HOST_CALL; payload: { hostCallIdentifier: HostCallIdentifiers } }
  | { command: Commands.SET_SERVICE_ID; payload: { serviceId: number } };

export type WorkerRequestParams = CommonWorkerRequestParams & CommandWorkerRequestParams;

export enum Commands {
  LOAD = "load",
  INIT = "init",
  STEP = "step",
  RUN = "run",
  STOP = "stop",
  MEMORY = "memory",
  SET_STORAGE = "set_storage",
  HOST_CALL = "host_call",
  SET_SERVICE_ID = "set_service_id",
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

export type Storage = Map<string, bytes.BytesBlob>;
