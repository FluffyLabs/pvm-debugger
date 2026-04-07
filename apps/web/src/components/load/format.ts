import type { DetectedFormat } from "@pvmdbg/content";

export const FORMAT_LABELS: Record<string, string> = {
  generic_pvm: "Generic",
  jam_spi: "JAM SPI",
  jam_spi_with_metadata: "JAM SPI",
  json_test_vector: "JSON",
  trace_file: "Trace",
};

export const FORMAT_BADGE_INTENT: Record<
  string,
  "info" | "success" | "warning" | "primary"
> = {
  generic_pvm: "info",
  jam_spi: "success",
  jam_spi_with_metadata: "success",
  json_test_vector: "warning",
  trace_file: "primary",
};

export function formatLabel(kind: DetectedFormat["kind"]): string {
  return FORMAT_LABELS[kind] ?? kind;
}

export function formatBadgeIntent(
  kind: DetectedFormat["kind"],
): "info" | "success" | "warning" | "primary" {
  return FORMAT_BADGE_INTENT[kind] ?? "info";
}

export function formatByteCount(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
