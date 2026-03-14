import type { SyncPvmInterpreter } from "./adapters/types.js";
import type { WorkerRequest, WorkerResponse, WorkerResponsePayload } from "./commands.js";
import { deserializeInitialState } from "./utils.js";
import { mapStatus } from "./status-map.js";
import { bigintToDecStr, decStrToBigint, uint8ToRegs } from "@pvmdbg/types";

/**
 * Create a handler function that processes WorkerRequest messages
 * and returns WorkerResponse messages.
 */
export function createWorkerCommandHandler(interpreter: SyncPvmInterpreter): (msg: WorkerRequest) => WorkerResponse {
  return (msg: WorkerRequest): WorkerResponse => {
    try {
      const payload = handleCommand(interpreter, msg);
      return { type: "ok", messageId: msg.messageId, payload };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { type: "error", messageId: msg.messageId, message };
    }
  };
}

function handleCommand(interpreter: SyncPvmInterpreter, msg: WorkerRequest): WorkerResponsePayload {
  switch (msg.type) {
    case "load": {
      const initialState = deserializeInitialState(msg.initialState);
      const loadContext = msg.spiProgram
        ? { spiProgram: msg.spiProgram, spiArgs: msg.spiArgs }
        : undefined;
      interpreter.load(msg.program, initialState, loadContext);
      return { command: "load" };
    }
    case "reset": {
      interpreter.reset();
      return { command: "reset" };
    }
    case "step": {
      const result = interpreter.step(msg.n);
      const statusCode = interpreter.getStatus();
      const status = mapStatus(statusCode);
      return {
        command: "step",
        status,
        pc: interpreter.getPc(),
        gas: bigintToDecStr(interpreter.getGas()),
        exitArg: status === "host" ? interpreter.getExitArg() : undefined,
        finished: result.finished,
      };
    }
    case "getState": {
      const statusCode = interpreter.getStatus();
      const regs = uint8ToRegs(interpreter.getRegisters());
      return {
        command: "getState",
        status: mapStatus(statusCode),
        pc: interpreter.getPc(),
        gas: bigintToDecStr(interpreter.getGas()),
        registers: regs.map(bigintToDecStr),
      };
    }
    case "getMemory": {
      return {
        command: "getMemory",
        data: interpreter.getMemory(msg.address, msg.length),
      };
    }
    case "setRegisters": {
      interpreter.setRegisters(msg.data);
      return { command: "setRegisters" };
    }
    case "setPc": {
      interpreter.setPc(msg.pc);
      return { command: "setPc" };
    }
    case "setGas": {
      interpreter.setGas(decStrToBigint(msg.gas));
      return { command: "setGas" };
    }
    case "setMemory": {
      interpreter.setMemory(msg.address, msg.data);
      return { command: "setMemory" };
    }
    case "shutdown": {
      interpreter.shutdown();
      return { command: "shutdown" };
    }
  }
}

/** Worker-like interface for postMessage communication. */
interface WorkerSelf {
  onmessage: ((event: { data: WorkerRequest }) => void) | null;
  postMessage(data: WorkerResponse): void;
}

/**
 * Install the worker entry point on a worker-like object (typically `self` in a web worker).
 * Listens for messages and dispatches them to the handler.
 */
export function installWorkerEntry(workerSelf: WorkerSelf, interpreter: SyncPvmInterpreter): void {
  const handler = createWorkerCommandHandler(interpreter);
  workerSelf.onmessage = (event: { data: WorkerRequest }) => {
    const response = handler(event.data);
    workerSelf.postMessage(response);
  };
}
