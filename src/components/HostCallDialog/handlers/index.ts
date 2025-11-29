import { HostCallHandler } from "./types";
import { LogHostCall } from "./LogHostCall";
import { FetchHostCall } from "./FetchHostCall";
import { ReadHostCall } from "./ReadHostCall";
import { WriteHostCall } from "./WriteHostCall";

// Registry of all special host call handlers
const handlers: HostCallHandler[] = [LogHostCall, FetchHostCall, ReadHostCall, WriteHostCall];

// Map for quick lookup by index
const handlersByIndex = new Map<number, HostCallHandler>(handlers.map((h) => [h.index, h]));

/**
 * Get a special handler for a host call index, if one exists
 */
export function getHostCallHandler(index: number): HostCallHandler | undefined {
  return handlersByIndex.get(index);
}

/**
 * Check if a host call has a special handler with custom UI
 */
export function hasCustomHandler(index: number): boolean {
  const handler = handlersByIndex.get(index);
  return handler?.hasCustomUI ?? false;
}

export type { HostCallHandler, HostCallHandlerProps } from "./types";
