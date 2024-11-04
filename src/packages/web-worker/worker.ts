import { getMemoryPage } from "@/packages/web-worker/utils.ts";
import commandHandlers from "./command-handlers";
import { logger } from "@/utils/loggerService";
import { WorkerRequestParams, WorkerResponseParams, PvmApiInterface, Commands, CommandStatus } from "./types";

let pvm: PvmApiInterface | null = null;
let isRunMode = false;

export function postTypedMessage(msg: WorkerResponseParams) {
  postMessage(msg);
}

onmessage = async (e: MessageEvent<WorkerRequestParams>) => {
  if (!e.data?.command) {
    return;
  }
  logger.info("Worker received message", e.data);

  let state;
  let isFinished;
  if (e.data.command === Commands.LOAD) {
    const data = await commandHandlers.runLoad(e.data.payload);
    pvm = data.pvm;
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
  } else if (e.data.command === Commands.MEMORY_PAGE) {
    try {
      const memoryPage = getMemoryPage(e.data.payload.pageNumber, pvm);

      postTypedMessage({
        command: Commands.MEMORY_PAGE,
        status: CommandStatus.SUCCESS,
        messageId: e.data.messageId,
        payload: {
          pageNumber: e.data.payload.pageNumber,
          memoryPage,
        },
      });
    } catch (error) {
      postTypedMessage({
        command: Commands.MEMORY_PAGE,
        status: CommandStatus.ERROR,
        messageId: e.data.messageId,
        error,
        payload: {
          pageNumber: e.data.payload.pageNumber,
          memoryPage: new Uint8Array(),
        },
      });
    }
  } else if (e.data.command === Commands.MEMORY_SIZE) {
    // Get first page to check the memory size
    const memoryPage = getMemoryPage(0, pvm);

    postTypedMessage({
      command: Commands.MEMORY_SIZE,
      status: CommandStatus.SUCCESS,
      messageId: e.data.messageId,
      // TODO fix types
      payload: { pageNumber: 0, memorySize: (memoryPage as unknown as Array<number>)?.length },
    });
  }
  // TODO uncomment and finish implementation
  // else if (e.data.command === Commands.MEMORY_RANGE) {
  //   const memoryRange = Object.values(memory).flat().slice(e.data.payload.start, e.data.payload.end);
  //   postMessage({
  //     command: Commands.MEMORY_RANGE,
  //     payload: {
  //       start: e.data.payload.start,
  //       end: e.data.payload.end,
  //       memoryRange: memoryRange,
  //     },
  //   });
  // }
};
