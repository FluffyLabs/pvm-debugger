import {
  WorkerResponseParams,
  CommandWorkerRequestParams,
  WorkerRequestParams,
  Commands,
  CommandStatus,
} from "@/packages/web-worker/types";

const RESPONSE_WAIT_TIMEOUT = 60000;
const getMessageId = () => Math.random().toString(36).substring(7);

export const asyncWorkerPostMessage = <C extends Commands>(
  id: string,
  worker: Worker,
  data: Extract<CommandWorkerRequestParams, { command: C }>,
) => {
  return new Promise<Extract<WorkerResponseParams, { command: C }>>((resolve, reject) => {
    const messageId = getMessageId();
    const timeoutId = setTimeout(() => {
      reject(`PVM ${id} reached max timeout ${RESPONSE_WAIT_TIMEOUT}ms.`);
    }, RESPONSE_WAIT_TIMEOUT);

    const messageHandler = (event: MessageEvent<WorkerResponseParams>) => {
      if (event.data.messageId === messageId) {
        clearTimeout(timeoutId);
        worker.removeEventListener("message", messageHandler);
        resolve(event.data as Extract<WorkerResponseParams, { command: C }>);
      }
    };
    worker.addEventListener("message", messageHandler);

    const request: WorkerRequestParams = { ...data, messageId };
    worker.postMessage(request);
  });
};

export const hasCommandStatusError = (resp: WorkerResponseParams): resp is WorkerResponseParams & { error: Error } => {
  return "status" in resp && resp.status === CommandStatus.ERROR && resp.error instanceof Error;
};
