import { fromHex } from "@pvmdbg/types";
import type { RawPayload } from "../program-envelope.js";

/** Decode a hex string from user input into a RawPayload. Strips whitespace. */
export function loadManualInput(hexString: string): RawPayload {
  const cleaned = hexString.replace(/\s+/g, "");
  return {
    sourceKind: "manual_input",
    sourceId: "manual",
    bytes: fromHex(cleaned),
  };
}
