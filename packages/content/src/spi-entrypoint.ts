import { encodeVarU32 } from "@pvmdbg/types";

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
