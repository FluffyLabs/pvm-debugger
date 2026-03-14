import { decodeVarU32 } from "@pvmdbg/types";
import * as pvm from "@typeberry/lib/pvm-interpreter";

/** JSON test vector shape — minimum fields required for detection. */
export interface JsonTestVector {
  name?: string;
  program: number[];
  "initial-regs": number[];
  "initial-pc": number;
  "initial-gas": number;
  "initial-page-map"?: Array<{ address: number; length: number; "is-writable": boolean }>;
  "initial-memory"?: Array<{ address: number; contents: number[] }>;
  "expected-status"?: string;
  "expected-regs"?: number[];
  "expected-pc"?: number;
  "expected-gas"?: number;
  "expected-memory"?: Array<{ address: number; contents: number[] }>;
}

/** Detected container format with associated data. */
export type DetectedFormat =
  | { kind: "trace_file"; text: string }
  | { kind: "json_test_vector"; data: JsonTestVector }
  | { kind: "jam_spi_with_metadata"; metadata: Uint8Array; spiPayload: Uint8Array }
  | { kind: "jam_spi"; payload: Uint8Array }
  | { kind: "generic_pvm"; payload: Uint8Array };

/**
 * Attempt SPI decode. Returns true if the bytes are a valid SPI program.
 * Actually invokes the decoder in a try/catch — no heuristics.
 */
export function canDecodeSpi(bytes: Uint8Array, withMetadata: boolean): boolean {
  try {
    let spiPayload = bytes;
    if (withMetadata) {
      const { value: metaLen, bytesRead } = decodeVarU32(bytes, 0);
      const totalHeaderLen = bytesRead + metaLen;
      if (totalHeaderLen > bytes.length) return false;
      spiPayload = bytes.subarray(totalHeaderLen);
    }
    pvm.spi.decodeStandardProgram(spiPayload, new Uint8Array());
    return true;
  } catch {
    return false;
  }
}

/**
 * Detect the container format of raw bytes.
 *
 * Detection order:
 * 1. Try UTF-8 decode
 * 2. If text contains "program 0x", classify as trace_file
 * 3. If JSON with required test-vector fields, classify as json_test_vector
 * 4. Try varU32 metadata + SPI decode → jam_spi_with_metadata
 * 5. Try direct SPI decode → jam_spi
 * 6. Fallback to generic_pvm
 */
export function detectFormat(bytes: Uint8Array): DetectedFormat {
  // Step 1: Try UTF-8 decode
  let text: string | null = null;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    // Not valid UTF-8 — skip text-based detection
  }

  if (text !== null) {
    // Step 2: Trace file detection
    if (text.includes("program 0x")) {
      return { kind: "trace_file", text };
    }

    // Step 3: JSON test vector detection
    try {
      const json: unknown = JSON.parse(text);
      if (isJsonTestVector(json)) {
        return { kind: "json_test_vector", data: json as JsonTestVector };
      }
    } catch {
      // Not JSON
    }
  }

  // Step 4: Try varU32 metadata + SPI
  try {
    const { value: metaLen, bytesRead } = decodeVarU32(bytes, 0);
    const totalHeaderLen = bytesRead + metaLen;
    if (totalHeaderLen > 0 && totalHeaderLen < bytes.length) {
      const metadata = bytes.subarray(bytesRead, totalHeaderLen);
      const spiPayload = bytes.subarray(totalHeaderLen);
      // Actually attempt SPI decode to validate
      try {
        pvm.spi.decodeStandardProgram(spiPayload, new Uint8Array());
        return { kind: "jam_spi_with_metadata", metadata, spiPayload };
      } catch {
        // Not SPI after metadata strip
      }
    }
  } catch {
    // varU32 decode failed
  }

  // Step 5: Try direct SPI
  try {
    pvm.spi.decodeStandardProgram(bytes, new Uint8Array());
    return { kind: "jam_spi", payload: bytes };
  } catch {
    // Not SPI
  }

  // Step 6: Fallback
  return { kind: "generic_pvm", payload: bytes };
}

function isJsonTestVector(json: unknown): boolean {
  return (
    typeof json === "object" &&
    json !== null &&
    "program" in json &&
    "initial-regs" in json &&
    Array.isArray((json as Record<string, unknown>)["program"]) &&
    Array.isArray((json as Record<string, unknown>)["initial-regs"])
  );
}
