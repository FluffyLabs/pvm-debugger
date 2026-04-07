/**
 * Program session persistence — persist/restore/clear the loaded program session
 * so a browser refresh restores the debugger at initial state.
 *
 * Program persistence is separate from settings persistence (sprint-15).
 */

import {
  createProgramEnvelope,
  decodeGeneric,
  type RawPayload,
  type SpiEntrypointParams,
} from "@pvmdbg/content";
import type { LoadSourceKind, ProgramEnvelope } from "@pvmdbg/types";
import { fromHex, toHex } from "@pvmdbg/types";

/** localStorage keys for program session persistence. */
export const PROGRAM_SESSION_KEYS = {
  payload: "pvmdbg:payload",
  sourceMeta: "pvmdbg:source_meta",
  detectedFormat: "pvmdbg:detected_format",
  spiConfig: "pvmdbg:spi_config",
  gas: "pvmdbg:gas",
} as const;

const ALL_KEYS = Object.values(PROGRAM_SESSION_KEYS);

// ── Serialization helpers ─────────────────────────────────────────────

interface PersistedSourceMeta {
  sourceKind: string;
  sourceId: string;
}

interface PersistedFormatMeta {
  kind: string;
  forceGeneric: boolean;
}

/** JSON-safe SPI params shape (Uint8Arrays stored as hex strings). */
interface SerializedSpiParams {
  entrypoint: string;
  pc: number;
  params: Record<string, string | number>;
}

/** Serialize SPI params to a JSON-safe shape (Uint8Arrays → hex strings). */
function serializeSpiParams(params: SpiEntrypointParams): SerializedSpiParams {
  if (params.entrypoint === "refine") {
    return {
      entrypoint: params.entrypoint,
      pc: params.pc,
      params: {
        core: params.params.core,
        index: params.params.index,
        id: params.params.id,
        payload: toHex(params.params.payload),
        workPackageHash: toHex(params.params.workPackageHash),
      },
    };
  }
  if (params.entrypoint === "accumulate") {
    return {
      entrypoint: params.entrypoint,
      pc: params.pc,
      params: {
        slot: params.params.slot,
        id: params.params.id,
        results: params.params.results,
      },
    };
  }
  return {
    entrypoint: params.entrypoint,
    pc: params.pc,
    params: { core: params.params.core },
  };
}

function requireNumber(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(
      `Invalid SPI field "${field}": expected number, got ${typeof value}`,
    );
  }
  return value;
}

/** Deserialize SPI params from JSON (hex strings → Uint8Arrays). */
function deserializeSpiParams(data: unknown): SpiEntrypointParams {
  if (typeof data !== "object" || data === null) {
    throw new Error("Invalid SPI config: expected object");
  }
  const d = data as Record<string, unknown>;
  if (typeof d.entrypoint !== "string") {
    throw new Error("Invalid SPI config: missing entrypoint");
  }
  if (typeof d.params !== "object" || d.params === null) {
    throw new Error("Invalid SPI config: missing params");
  }
  const params = d.params as Record<string, unknown>;

  if (d.entrypoint === "refine") {
    // Defensive 32-byte hash handling
    const hashBuf = new Uint8Array(32);
    const hashField = params.workPackageHash ?? params.package; // backwards compat
    if (typeof hashField === "string" && hashField.length > 0) {
      try {
        const decoded = fromHex(hashField);
        hashBuf.set(decoded.subarray(0, 32));
      } catch {
        // leave as zeros
      }
    }
    return {
      entrypoint: "refine",
      pc: 0,
      params: {
        core: requireNumber(params.core, "core"),
        index: requireNumber(params.index, "index"),
        id: requireNumber(params.id, "id"),
        payload:
          typeof params.payload === "string" && params.payload.length > 0
            ? fromHex(params.payload)
            : new Uint8Array(),
        workPackageHash: hashBuf,
      },
    };
  }
  if (d.entrypoint === "accumulate") {
    return {
      entrypoint: "accumulate",
      pc: 5,
      params: {
        slot: requireNumber(params.slot, "slot"),
        id: requireNumber(params.id, "id"),
        results: requireNumber(params.results, "results"),
      },
    };
  }
  if (d.entrypoint === "is_authorized") {
    return {
      entrypoint: "is_authorized",
      pc: 0,
      params: { core: requireNumber(params.core, "core") },
    };
  }
  throw new Error(`Unknown SPI entrypoint: ${String(d.entrypoint)}`);
}

// ── Public API ────────────────────────────────────────────────────────

/** Synchronously check whether a persisted program session exists. */
export function hasPersistedSession(): boolean {
  try {
    return localStorage.getItem(PROGRAM_SESSION_KEYS.payload) !== null;
  } catch {
    return false;
  }
}

/** Persist program session data after a successful load. */
export function persistSession(
  rawBytes: Uint8Array,
  sourceMeta: PersistedSourceMeta,
  detectedFormatKind: string,
  forceGeneric: boolean,
  spiParams: SpiEntrypointParams | null,
  gas: bigint,
): void {
  try {
    localStorage.setItem(PROGRAM_SESSION_KEYS.payload, toHex(rawBytes));
    localStorage.setItem(
      PROGRAM_SESSION_KEYS.sourceMeta,
      JSON.stringify(sourceMeta),
    );
    localStorage.setItem(
      PROGRAM_SESSION_KEYS.detectedFormat,
      JSON.stringify({
        kind: detectedFormatKind,
        forceGeneric,
      } satisfies PersistedFormatMeta),
    );
    if (spiParams) {
      localStorage.setItem(
        PROGRAM_SESSION_KEYS.spiConfig,
        JSON.stringify(serializeSpiParams(spiParams)),
      );
    } else {
      localStorage.removeItem(PROGRAM_SESSION_KEYS.spiConfig);
    }
    localStorage.setItem(PROGRAM_SESSION_KEYS.gas, gas.toString());
  } catch {
    // localStorage may be full or unavailable
  }
}

/** Restore a ProgramEnvelope from persisted session data. Throws on failure. */
export function restoreSession(): ProgramEnvelope {
  const payloadHex = localStorage.getItem(PROGRAM_SESSION_KEYS.payload);
  if (!payloadHex) throw new Error("No persisted payload");

  const sourceMetaRaw = localStorage.getItem(PROGRAM_SESSION_KEYS.sourceMeta);
  if (!sourceMetaRaw) throw new Error("No persisted source metadata");

  const formatMetaRaw = localStorage.getItem(
    PROGRAM_SESSION_KEYS.detectedFormat,
  );
  if (!formatMetaRaw) throw new Error("No persisted detected format");

  const rawBytes = fromHex(payloadHex);
  const sourceMeta: PersistedSourceMeta = JSON.parse(sourceMetaRaw);
  const formatMeta: PersistedFormatMeta = JSON.parse(formatMetaRaw);

  // Rebuild SPI params if stored
  let spiParams: SpiEntrypointParams | null = null;
  const spiRaw = localStorage.getItem(PROGRAM_SESSION_KEYS.spiConfig);
  if (spiRaw) {
    spiParams = deserializeSpiParams(JSON.parse(spiRaw));
  }

  // Rebuild gas
  const gasRaw = localStorage.getItem(PROGRAM_SESSION_KEYS.gas);
  const gas = gasRaw ? BigInt(gasRaw) : undefined;

  // Reconstruct RawPayload
  const rawPayload: RawPayload = {
    sourceKind: sourceMeta.sourceKind as LoadSourceKind,
    sourceId: sourceMeta.sourceId,
    bytes: rawBytes,
  };

  // Rebuild envelope
  let envelope: ProgramEnvelope;
  if (formatMeta.forceGeneric) {
    envelope = decodeGeneric(
      rawBytes,
      rawPayload.sourceKind,
      rawPayload.sourceId,
    );
  } else {
    const options = spiParams ? { entrypoint: spiParams } : undefined;
    envelope = createProgramEnvelope(rawPayload, options);
  }

  // Override gas if persisted
  if (gas !== undefined) {
    envelope = { ...envelope, initialState: { ...envelope.initialState, gas } };
  }

  return envelope;
}

/** Clear program session keys from localStorage (keeps settings intact). */
export function clearProgramSession(): void {
  for (const key of ALL_KEYS) {
    try {
      localStorage.removeItem(key);
    } catch {
      // ignore
    }
  }
}
