import type { SerializedInitialMachineState } from "./utils.js";

/** Worker request message. */
export type WorkerRequest =
  | { type: "load"; messageId: string; program: Uint8Array; initialState: SerializedInitialMachineState; spiProgram?: { program: Uint8Array; hasMetadata: boolean }; spiArgs?: Uint8Array }
  | { type: "reset"; messageId: string }
  | { type: "step"; messageId: string; n: number }
  | { type: "getState"; messageId: string }
  | { type: "getMemory"; messageId: string; address: number; length: number }
  | { type: "setRegisters"; messageId: string; data: Uint8Array }
  | { type: "setPc"; messageId: string; pc: number }
  | { type: "setGas"; messageId: string; gas: string }
  | { type: "setMemory"; messageId: string; address: number; data: Uint8Array }
  | { type: "shutdown"; messageId: string };

/** Worker response message. */
export type WorkerResponse =
  | WorkerOkResponse
  | WorkerErrorResponse;

export interface WorkerOkResponse {
  type: "ok";
  messageId: string;
  payload: WorkerResponsePayload;
}

export interface WorkerErrorResponse {
  type: "error";
  messageId: string;
  message: string;
}

/** Typed response payloads per command. */
export type WorkerResponsePayload =
  | { command: "load" }
  | { command: "reset" }
  | { command: "step"; status: string; pc: number; gas: string; exitArg?: number; finished: boolean }
  | { command: "getState"; status: string; pc: number; gas: string; registers: string[] }
  | { command: "getMemory"; data: Uint8Array }
  | { command: "setRegisters" }
  | { command: "setPc" }
  | { command: "setGas" }
  | { command: "setMemory" }
  | { command: "shutdown" };
