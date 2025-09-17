import commandHandlers from "./command-handlers";
import { logger } from "@/utils/loggerService";
import { Commands, CommandStatus, PvmApiInterface, WorkerRequestParams, WorkerResponseParams } from "./types";

let pvm: PvmApiInterface | null = null;
let memorySize: number | null = null;
let isRunMode = false;
// Set default serviceId to 0x30303030. This is the ASCII code for '0000'.
let serviceId: number | null = parseInt("0x30303030", 16);
let socket: WebSocket | undefined | null = null;

export function postTypedMessage(msg: WorkerResponseParams) {
  postMessage(msg);
}

onmessage = (ev: MessageEvent<WorkerRequestParams>) => {
  rawOnMessage(ev).catch((e) => {
    console.error(e);
  });
};

async function rawOnMessage(e: MessageEvent<WorkerRequestParams>) {
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
    const { currentPc, state, isFinished, status, exitArg, error } = await commandHandlers.runStep({
      pvm,
      stepsToPerform: e.data.payload.stepsToPerform,
      serviceId,
    });
    isRunMode = !isFinished;

    postTypedMessage({
      command: Commands.STEP,
      status,
      error,
      payload: { currentPc, state, isFinished, isRunMode, exitArg },
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
    let isFinished = false;
    while (!isFinished && isRunMode) {
      const res = await commandHandlers.runStep({
        pvm,
        stepsToPerform: e.data.payload.batchedSteps,
        serviceId,
      });
      isFinished = res.isFinished;
      postTypedMessage({
        command: Commands.STEP,
        status: res.status,
        error: res.error,
        payload: { currentPc: res.currentPc, state: res.state, isFinished, isRunMode, exitArg: res.exitArg },
        messageId: e.data.messageId,
      });
    }
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
  } else if (e.data.command === Commands.HOST_CALL) {
    const data = await commandHandlers.runHostCall({
      pvm,
      hostCallIdentifier: e.data.payload.hostCallIdentifier,
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
}
