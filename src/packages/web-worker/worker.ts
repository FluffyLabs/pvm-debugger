import commandHandlers from "./command-handlers";
import { logger } from "@/utils/loggerService";
import { WorkerRequestParams, WorkerResponseParams, PvmApiInterface, Commands, CommandStatus } from "./types";

let pvm: PvmApiInterface | null = null;
let memorySize: number | null = null;
let isRunMode = false;

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
    memorySize = data.memorySize;

    postTypedMessage({
      command: Commands.LOAD,
      status: data.status,
      error: data.error,
      messageId: e.data.messageId,
      payload: { memorySize: data.memorySize || 0 },
    });
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
    const { result, state, isFinished, status, error } = commandHandlers.runStep({
      pvm,
      program: e.data.payload.program,
    });
    isRunMode = !isFinished;

    postTypedMessage({
      command: Commands.STEP,
      status,
      error,
      payload: { result, state, isFinished, isRunMode },
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
  }
};
