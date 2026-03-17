import { encodeVarU32, decodeVarU32 } from "@pvmdbg/types";

export interface RefineParams {
  core: number;
  index: number;
  id: number;
  payload: Uint8Array;
  package: Uint8Array;
}

export interface AccumulateParams {
  slot: number;
  id: number;
  results: number;
}

export interface IsAuthorizedParams {
  core: number;
}

export type SpiEntrypointParams =
  | { entrypoint: "refine"; pc: 0; params: RefineParams }
  | { entrypoint: "accumulate"; pc: 5; params: AccumulateParams }
  | { entrypoint: "is_authorized"; pc: 0; params: IsAuthorizedParams };

/** Encode a blob as varU32(length) + raw bytes. */
function encodeBlob(data: Uint8Array): Uint8Array {
  const lenBytes = encodeVarU32(data.length);
  const result = new Uint8Array(lenBytes.length + data.length);
  result.set(lenBytes, 0);
  result.set(data, lenBytes.length);
  return result;
}

/** Concatenate multiple Uint8Arrays. */
function concat(...arrays: Uint8Array[]): Uint8Array {
  const totalLen = arrays.reduce((sum, a) => sum + a.length, 0);
  const result = new Uint8Array(totalLen);
  let offset = 0;
  for (const arr of arrays) {
    result.set(arr, offset);
    offset += arr.length;
  }
  return result;
}

/**
 * Encode SPI entrypoint parameters into bytes.
 *
 * - refine: core, index, id, payload blob, package blob
 * - accumulate: slot, id, results
 * - is_authorized: core
 */
export function encodeSpiEntrypoint(params: SpiEntrypointParams): Uint8Array {
  switch (params.entrypoint) {
    case "refine":
      return concat(
        encodeVarU32(params.params.core),
        encodeVarU32(params.params.index),
        encodeVarU32(params.params.id),
        encodeBlob(params.params.payload),
        encodeBlob(params.params.package),
      );
    case "accumulate":
      return concat(
        encodeVarU32(params.params.slot),
        encodeVarU32(params.params.id),
        encodeVarU32(params.params.results),
      );
    case "is_authorized":
      return concat(encodeVarU32(params.params.core));
  }
}

/** Decode a varU32-length-prefixed blob from bytes at offset. Returns the data and total bytes consumed. */
function decodeBlob(bytes: Uint8Array, offset: number): { data: Uint8Array; bytesRead: number } {
  const { value: length, bytesRead: lenBytes } = decodeVarU32(bytes, offset);
  const data = bytes.slice(offset + lenBytes, offset + lenBytes + length);
  return { data, bytesRead: lenBytes + length };
}

/**
 * Decode SPI entrypoint bytes back into typed parameters.
 * Requires knowing which entrypoint type to decode as.
 * Throws if the bytes are too short or malformed.
 */
export function decodeSpiEntrypoint(
  entrypoint: SpiEntrypointParams["entrypoint"],
  bytes: Uint8Array,
): SpiEntrypointParams {
  let offset = 0;

  function readVarU32(): number {
    const { value, bytesRead } = decodeVarU32(bytes, offset);
    offset += bytesRead;
    return value;
  }

  function readBlob(): Uint8Array {
    const { data, bytesRead } = decodeBlob(bytes, offset);
    offset += bytesRead;
    return data;
  }

  switch (entrypoint) {
    case "refine": {
      const core = readVarU32();
      const index = readVarU32();
      const id = readVarU32();
      const payload = readBlob();
      const pkg = readBlob();
      return { entrypoint: "refine", pc: 0, params: { core, index, id, payload, package: pkg } };
    }
    case "accumulate": {
      const slot = readVarU32();
      const id = readVarU32();
      const results = readVarU32();
      return { entrypoint: "accumulate", pc: 5, params: { slot, id, results } };
    }
    case "is_authorized": {
      const core = readVarU32();
      return { entrypoint: "is_authorized", pc: 0, params: { core } };
    }
  }
}
