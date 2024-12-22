import {
  WorkerResponseParams,
  CommandWorkerRequestParams,
  WorkerRequestParams,
  Commands,
  CommandStatus,
  Storage,
} from "@/packages/web-worker/types";
import { DebuggerEcalliStorage } from "@/types/pvm";
import { logger } from "@/utils/loggerService";
import { SerializedError } from "@reduxjs/toolkit";
import { bytes } from "@typeberry/jam-host-calls";

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
      logger.info("📥 Debugger received message", event.data);
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

export const isSerializedError = (error: unknown): error is SerializedError => {
  return (
    Object.prototype.hasOwnProperty.call(error, "name") ||
    Object.prototype.hasOwnProperty.call(error, "message") ||
    Object.prototype.hasOwnProperty.call(error, "stack") ||
    Object.prototype.hasOwnProperty.call(error, "code")
  );
};

export const MEMORY_SPLIT_STEP = 8;
// Keep multiplication of step to make chunking easier
export const LOAD_MEMORY_CHUNK_SIZE = MEMORY_SPLIT_STEP * 200;

export const toPvmStorage = (storage: DebuggerEcalliStorage): Storage => {
  const pvmStorage = new Map<string, bytes.BytesBlob>();
  storage.forEach((item) => {
    pvmStorage.set(item.keyHash, item.valueBlob);
  });

  return pvmStorage;
};

const valueBlobToString = (valueBlob: bytes.BytesBlob) =>
  Array.from(valueBlob.raw)
    .map((byte) => byte.toString(16).padStart(3, "0")) // Convert to hex and pad with leading zero if necessary
    .join(" ");

export const mergePVMAndDebuggerEcalliStorage = (
  pvmStorage: Storage,
  prevStorage: DebuggerEcalliStorage,
): DebuggerEcalliStorage => {
  const result = [...prevStorage];
  Array.from(pvmStorage.entries()).forEach(([keyHash, rawValue]) => {
    const valueBlob = bytes.BytesBlob.blobFrom(rawValue.raw);
    const prevValue = result.find((item) => item.keyHash === keyHash);
    if (prevValue && prevValue.keyHash === keyHash) {
      if (prevValue.valueBlob.asText() !== valueBlob.asText()) {
        prevValue.valueBlob = valueBlob;
      }
    } else {
      result.push({
        id: (result.length + 1).toString(),
        action: "insert",
        key: "",
        keyHash,
        value: valueBlobToString(valueBlob),
        valueBlob,
        isSubmitted: true,
        isHidden: false,
        isEditing: false,
      });
    }
  });

  return result;
};

// id: string;
// action: "insert" | "remove" | "";
// key: string;
// keyHash: string;
// value: string;
// valueBlob: bytes.BytesBlob;
// isSubmitted: boolean;
// isHidden: boolean; // Property to track temporary removal
// isEditing: boolean;
