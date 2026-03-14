/** Detected container formats for loaded program data. */
export type ContainerFormat =
  | "trace_file"
  | "json_test_vector"
  | "jam_spi_with_metadata"
  | "jam_spi"
  | "generic_pvm";

/**
 * Detect the container format of raw bytes.
 * Returns the most specific format that matches.
 */
export function detectFormat(data: Uint8Array): ContainerFormat {
  // Try to decode as text for text-based formats
  let text: string | null = null;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(data.slice(0, 1024));
  } catch {
    // Not valid UTF-8, skip text-based detection
  }

  if (text !== null) {
    // Trace files contain "program 0x"
    if (text.includes("program 0x")) {
      return "trace_file";
    }

    // JSON test vectors parse as JSON with "program" and "initial-regs" fields
    try {
      const json: unknown = JSON.parse(new TextDecoder().decode(data));
      if (
        typeof json === "object" &&
        json !== null &&
        "program" in json &&
        "initial-regs" in json
      ) {
        return "json_test_vector";
      }
    } catch {
      // Not JSON
    }
  }

  // Binary fallback
  return "generic_pvm";
}
