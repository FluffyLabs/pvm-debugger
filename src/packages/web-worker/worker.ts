import commandHandlers from "./command-handlers";
import { logger } from "@/utils/loggerService";
import { Commands, CommandStatus, PvmApiInterface, Storage, WorkerRequestParams, WorkerResponseParams } from "./types";

let pvm: PvmApiInterface | null = null;
let memorySize: number | null = null;
let isRunMode = false;
let storage: Storage | null = null;
// Set default serviceId to 0x30303030. This is the ASCII code for '0000'.
let serviceId: number | null = parseInt("0x30303030", 16);
let socket: WebSocket | undefined | null = null;

export function postTypedMessage(msg: WorkerResponseParams) {
  postMessage(msg);
}

onmessage = async (e: MessageEvent<WorkerRequestParams>) => {
  if (!e.data?.command) {
    return;
  }
  logger.info("⚙️ PVM worker received message", e.data);

  let state;
  let isFinished;
  if (e.data.command === Commands.LOAD) {
    const data = await commandHandlers.runLoad(e.data.payload);
    pvm = data.pvm;
    socket = data.socket;
    memorySize = data.memorySize;

    postTypedMessage({ command: Commands.LOAD, status: data.status, error: data.error, messageId: e.data.messageId });
  } else if (e.data.command === Commands.INIT) {
    const data = await commandHandlers.runInit({
      pvm,
      program: e.data.payload.program,
      initialState: e.data.payload.initialState,
    });

    postTypedMessage({
      command: Commands.INIT,
      status: data.status,
      error: data.error,
      payload: {
        initialState: data.initialState,
      },
      messageId: e.data.messageId,
    });
  } else if (e.data.command === Commands.STEP) {
    const { result, state, isFinished, status, exitArg, error } = await commandHandlers.runStep({
      pvm,
      program: e.data.payload.program,
      stepsToPerform: e.data.payload.stepsToPerform,
      storage,
      serviceId,
    });
    isRunMode = !isFinished;

    postTypedMessage({
      command: Commands.STEP,
      status,
      error,
      payload: { result, state, isFinished, isRunMode, exitArg },
      messageId: e.data.messageId,
    });
  } else if (e.data.command === Commands.RUN) {
    isRunMode = true;
    postTypedMessage({
      command: Commands.RUN,
      status: CommandStatus.SUCCESS,
      payload: { isRunMode, isFinished: true, state: state ?? {} },
      messageId: e.data.messageId,
    });
  } else if (e.data.command === Commands.STOP) {
    isRunMode = false;
    postTypedMessage({
      command: Commands.RUN,
      status: CommandStatus.SUCCESS,
      payload: {
        isRunMode,
        isFinished: isFinished ?? true,
        state: state ?? {},
      },
      messageId: e.data.messageId,
    });
  } else if (e.data.command === Commands.MEMORY) {
    const data = await commandHandlers.runMemory({
      pvm,
      memorySize,
      startAddress: e.data.payload.startAddress,
      stopAddress: e.data.payload.stopAddress,
    });

    postTypedMessage({
      command: Commands.MEMORY,
      status: data.status,
      error: data.error,
      messageId: e.data.messageId,
      payload: {
        memoryChunk: data.memoryChunk,
      },
    });
  } else if (e.data.command === Commands.SET_STORAGE) {
    storage = e.data.payload.storage;

    postTypedMessage({
      command: Commands.SET_STORAGE,
      status: CommandStatus.SUCCESS,
      error: null,
      messageId: e.data.messageId,
    });
  } else if (e.data.command === Commands.HOST_CALL) {
    const data = await commandHandlers.runHostCall({
      pvm,
      hostCallIdentifier: e.data.payload.hostCallIdentifier,
      storage,
      serviceId,
    });

    postTypedMessage({
      status: data.status,
      error: data.error,
      command: Commands.HOST_CALL,
      messageId: e.data.messageId,
      payload: data,
    });
  } else if (e.data.command === Commands.SET_SERVICE_ID) {
    serviceId = e.data.payload.serviceId;

    postTypedMessage({
      command: Commands.SET_SERVICE_ID,
      status: CommandStatus.SUCCESS,
      error: null,
      messageId: e.data.messageId,
    });
  } else if (e.data.command === Commands.UNLOAD) {
    socket?.close();

    postTypedMessage({
      command: Commands.UNLOAD,
      status: CommandStatus.SUCCESS,
      error: null,
      messageId: e.data.messageId,
    });
  }
};
