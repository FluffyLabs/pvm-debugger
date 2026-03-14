import type { RawPayload } from "../program-envelope.js";

/** Load bytes from a File object. */
export async function loadUpload(file: File): Promise<RawPayload> {
  const buffer = await file.arrayBuffer();
  return {
    sourceKind: "upload",
    sourceId: file.name,
    bytes: new Uint8Array(buffer),
  };
}
