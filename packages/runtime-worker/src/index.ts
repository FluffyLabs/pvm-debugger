/** Worker message types for PVM adapter communication. */
export type WorkerMessageType = "load" | "step" | "reset" | "getState" | "shutdown";

/** All supported worker message types. */
export const WORKER_MESSAGE_TYPES: readonly WorkerMessageType[] = [
  "load",
  "step",
  "reset",
  "getState",
  "shutdown",
] as const;

/** Validate that a string is a valid worker message type. */
export function isWorkerMessageType(value: string): value is WorkerMessageType {
  return (WORKER_MESSAGE_TYPES as readonly string[]).includes(value);
}
