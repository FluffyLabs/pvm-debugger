import type { LoadSourceKind, ProgramEnvelope } from "@pvmdbg/types";
import { decodeGeneric } from "./decode-generic.js";
import { decodeJsonTestVector } from "./decode-json-test-vector.js";
import { decodeSpi } from "./decode-spi.js";
import { decodeTrace } from "./decode-trace.js";
import { detectFormat } from "./detect.js";
import {
  findExampleEntry,
  manifestEntrypointToParams,
  manifestInitialStateOverrides,
} from "./examples-manifest.js";
import {
  encodeSpiEntrypoint,
  type SpiEntrypointParams,
} from "./spi-entrypoint.js";

/** Raw bytes loaded from any source + provenance metadata. */
export interface RawPayload {
  sourceKind: LoadSourceKind;
  sourceId: string;
  bytes: Uint8Array;
}

/**
 * Create a ProgramEnvelope from a RawPayload.
 *
 * This is the main pipeline entry point. It detects the format,
 * decodes accordingly, and returns a fully populated ProgramEnvelope.
 *
 * This function is **synchronous**.
 */
export function createProgramEnvelope(
  payload: RawPayload,
  options?: { entrypoint?: SpiEntrypointParams },
): ProgramEnvelope {
  const { sourceKind, sourceId, bytes } = payload;

  // Look up example manifest for default entrypoint and initial state overrides
  let manifestEntrypoint: SpiEntrypointParams | undefined;
  let manifestOverrides:
    | ReturnType<typeof manifestInitialStateOverrides>
    | undefined;

  if (sourceKind === "example") {
    const entry = findExampleEntry(sourceId);
    if (entry?.entrypoint) {
      manifestEntrypoint = manifestEntrypointToParams(entry.entrypoint);
    }
    if (entry?.initialState) {
      manifestOverrides = manifestInitialStateOverrides(entry.initialState);
    }
  }

  const entrypoint = options?.entrypoint ?? manifestEntrypoint;
  const detected = detectFormat(bytes);

  switch (detected.kind) {
    case "trace_file": {
      const envelope = decodeTrace(detected.text, sourceKind, sourceId);
      if (entrypoint) {
        envelope.spiEntrypoint = entrypoint.entrypoint;
      }
      return envelope;
    }

    case "json_test_vector": {
      return decodeJsonTestVector(detected.data, sourceKind, sourceId);
    }

    case "jam_spi_with_metadata":
    case "jam_spi": {
      const hasMetadata = detected.kind === "jam_spi_with_metadata";
      const spiArgs = entrypoint
        ? encodeSpiEntrypoint(entrypoint)
        : new Uint8Array();
      const envelope = decodeSpi(
        bytes,
        spiArgs,
        hasMetadata,
        sourceKind,
        sourceId,
        {
          pc: entrypoint?.pc,
        },
      );
      if (entrypoint) {
        envelope.spiEntrypoint = entrypoint.entrypoint;
      }
      return envelope;
    }

    case "generic_pvm": {
      return decodeGeneric(bytes, sourceKind, sourceId, manifestOverrides);
    }
  }
}
