import { WorkerResponseParams, CommandWorkerRequestParams, WorkerRequestParams } from "@/packages/web-worker/types";

const RESPONSE_WAIT_TIMEOUT = 5000;
const getMessageId = () => Math.random().toString(36).substring(7);

export const asyncWorkerPostMessage = (id: string, worker: Worker, message: CommandWorkerRequestParams) => {
  return new Promise<WorkerResponseParams>((resolve, reject) => {
    const messageId = getMessageId();
    const timeoutId = setTimeout(() => {
      reject(`PVM ${id} reached max timeout ${RESPONSE_WAIT_TIMEOUT}ms.`);
    }, RESPONSE_WAIT_TIMEOUT);

    const messageHandler = (event: MessageEvent<WorkerResponseParams>) => {
      if (event.data.messageId === messageId) {
        clearTimeout(timeoutId);
        worker.removeEventListener("message", messageHandler);
        resolve(event.data);
      }
    };
    worker.addEventListener("message", messageHandler);

    const request: WorkerRequestParams = { ...message, messageId };
    worker.postMessage(request);
  });
};
