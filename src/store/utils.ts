import { WorkerRequestParams, WorkerResponseParams } from "@/packages/web-worker/types";

const RESPONSE_WAIT_TIMEOUT = 5000;
const getMessageId = () => Math.random().toString(36).substring(7);

export const asyncWorkerPostMessage = (id: string, worker: Worker, message: unknown) => {
  return new Promise((resolve, reject) => {
    const messageId = getMessageId();
    const timeoutId = setTimeout(() => {
      reject(`PVM ${id} reached max timeout ${RESPONSE_WAIT_TIMEOUT}ms.`);
    }, 1000);

    const messageHandler = (event: MessageEvent<WorkerRequestParams>) => {
      if (event.data.messageId === messageId) {
        clearTimeout(timeoutId);
        worker.removeEventListener("message", messageHandler);
        resolve(event.data);
      }
    };
    worker.addEventListener("message", messageHandler);
    worker.postMessage({ ...(message as WorkerResponseParams), messageId });
  });
};
