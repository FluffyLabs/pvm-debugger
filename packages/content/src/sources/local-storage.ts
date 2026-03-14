import { fromHex, toHex } from "@pvmdbg/types";
import type { RawPayload } from "../program-envelope.js";

const STORAGE_PREFIX = "pvmdbg:payload:";

/** Restore a persisted payload from storage. Returns null if not found. */
export function loadLocalStorage(storage: Storage, key: string): RawPayload | null {
  const raw = storage.getItem(STORAGE_PREFIX + key);
  if (raw === null) return null;

  try {
    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      "hex" in parsed &&
      "sourceId" in parsed
    ) {
      const obj = parsed as { hex: string; sourceId: string };
      return {
        sourceKind: "local_storage",
        sourceId: obj.sourceId,
        bytes: fromHex(obj.hex),
      };
    }
  } catch {
    // Malformed storage entry
  }

  return null;
}

/** Persist a payload to storage using hex encoding for lossless storage. */
export function persistPayload(storage: Storage, key: string, payload: RawPayload): void {
  const data = {
    hex: toHex(payload.bytes),
    sourceId: payload.sourceId,
  };
  storage.setItem(STORAGE_PREFIX + key, JSON.stringify(data));
}

/** Clear a persisted payload from storage. */
export function clearPersistedPayload(storage: Storage, key: string): void {
  storage.removeItem(STORAGE_PREFIX + key);
}
