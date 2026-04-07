import { Badge } from "@fluffylabs/shared-ui";
import type { DetectedFormat } from "@pvmdbg/content";
import type { ProgramEnvelope } from "@pvmdbg/types";
import { formatBadgeIntent, formatByteCount, formatLabel } from "./format";

interface DetectionSummaryProps {
  envelope: ProgramEnvelope;
  detectedFormat: DetectedFormat;
  rawByteCount: number;
}

export function DetectionSummary({
  envelope,
  detectedFormat,
  rawByteCount,
}: DetectionSummaryProps) {
  const kind = detectedFormat.kind;

  return (
    <div
      data-testid="detection-summary"
      className="rounded-lg border border-border p-4 bg-card"
    >
      <div className="flex items-center gap-2 mb-3">
        <h3 className="text-sm font-semibold text-foreground">
          Detection Summary
        </h3>
        <Badge
          intent={formatBadgeIntent(kind)}
          variant="outline"
          size="small"
          data-testid="detection-summary-format"
        >
          {formatLabel(kind)}
        </Badge>
      </div>

      {kind === "jam_spi" || kind === "jam_spi_with_metadata" ? (
        <SpiSummary
          envelope={envelope}
          detectedFormat={detectedFormat}
          rawByteCount={rawByteCount}
        />
      ) : kind === "trace_file" ? (
        <TraceSummary envelope={envelope} rawByteCount={rawByteCount} />
      ) : kind === "json_test_vector" ? (
        <JsonVectorSummary
          envelope={envelope}
          detectedFormat={detectedFormat}
          rawByteCount={rawByteCount}
        />
      ) : (
        <GenericSummary envelope={envelope} rawByteCount={rawByteCount} />
      )}
    </div>
  );
}

function SpiSummary({
  envelope,
  detectedFormat,
  rawByteCount,
}: {
  envelope: ProgramEnvelope;
  detectedFormat: DetectedFormat;
  rawByteCount: number;
}) {
  const hasMetadata = detectedFormat.kind === "jam_spi_with_metadata";
  const metadataText = envelope.metadata
    ? tryDecodeUtf8(envelope.metadata)
    : null;

  const readablePages = envelope.initialState.pageMap.filter(
    (p) => !p.isWritable,
  ).length;
  const writablePages = envelope.initialState.pageMap.filter(
    (p) => p.isWritable,
  ).length;

  return (
    <div
      data-testid="detection-summary-spi"
      className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs"
    >
      {hasMetadata && metadataText && (
        <SummaryRow
          label="Metadata"
          value={metadataText}
          span
          data-testid="summary-metadata"
        />
      )}
      <SummaryRow
        label="Binary size"
        value={formatByteCount(rawByteCount)}
        data-testid="summary-binary-size"
      />
      <SummaryRow
        label="Code size"
        value={formatByteCount(envelope.programBytes.length)}
        data-testid="summary-code-size"
      />
      {envelope.jumpTableEntryCount != null && (
        <SummaryRow
          label="Jump table"
          value={`${envelope.jumpTableEntryCount} entries`}
          data-testid="summary-jump-table"
        />
      )}
      <SummaryRow
        label="Memory"
        value={`${readablePages} readable / ${writablePages} writable pages`}
        data-testid="summary-memory"
      />
      <SummaryRow
        label="Initial PC"
        value={`0x${envelope.initialState.pc.toString(16)}`}
        data-testid="summary-pc"
      />
      <SummaryRow
        label="Initial gas"
        value={envelope.initialState.gas.toLocaleString()}
        data-testid="summary-gas"
      />
      <RegisterPreview registers={envelope.initialState.registers} />
    </div>
  );
}

function TraceSummary({
  envelope,
  rawByteCount,
}: {
  envelope: ProgramEnvelope;
  rawByteCount: number;
}) {
  const entryCount = envelope.trace?.entries.length ?? 0;

  return (
    <div
      data-testid="detection-summary-trace"
      className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs"
    >
      <SummaryRow
        label="Host-call entries"
        value={String(entryCount)}
        data-testid="summary-trace-entries"
      />
      <SummaryRow
        label="Program kind"
        value={envelope.programKind}
        data-testid="summary-program-kind"
      />
      <SummaryRow
        label="Code size"
        value={formatByteCount(envelope.programBytes.length)}
        data-testid="summary-code-size"
      />
      <SummaryRow
        label="Initial PC"
        value={`0x${envelope.initialState.pc.toString(16)}`}
        data-testid="summary-pc"
      />
      <SummaryRow
        label="Initial gas"
        value={envelope.initialState.gas.toLocaleString()}
        data-testid="summary-gas"
      />
      <RegisterPreview registers={envelope.initialState.registers} />
    </div>
  );
}

function JsonVectorSummary({
  envelope,
  detectedFormat,
  rawByteCount,
}: {
  envelope: ProgramEnvelope;
  detectedFormat: DetectedFormat;
  rawByteCount: number;
}) {
  const testName =
    detectedFormat.kind === "json_test_vector"
      ? detectedFormat.data.name
      : undefined;
  const nonZeroRegs = envelope.initialState.registers.filter(
    (r) => r !== 0n,
  ).length;
  const expectedStatus = envelope.expectedState?.status;

  return (
    <div
      data-testid="detection-summary-json"
      className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs"
    >
      {testName && (
        <SummaryRow
          label="Test name"
          value={testName}
          span
          data-testid="summary-test-name"
        />
      )}
      <SummaryRow
        label="Program size"
        value={formatByteCount(rawByteCount)}
        data-testid="summary-program-size"
      />
      <SummaryRow
        label="Initial PC"
        value={`0x${envelope.initialState.pc.toString(16)}`}
        data-testid="summary-pc"
      />
      <SummaryRow
        label="Initial gas"
        value={envelope.initialState.gas.toLocaleString()}
        data-testid="summary-gas"
      />
      <SummaryRow
        label="Registers"
        value={`${envelope.initialState.registers.length} total, ${nonZeroRegs} non-zero`}
        data-testid="summary-registers"
      />
      {expectedStatus && (
        <SummaryRow
          label="Expected status"
          value={expectedStatus}
          data-testid="summary-expected-status"
        />
      )}
    </div>
  );
}

function GenericSummary({
  envelope,
  rawByteCount,
}: {
  envelope: ProgramEnvelope;
  rawByteCount: number;
}) {
  return (
    <div
      data-testid="detection-summary-generic"
      className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs"
    >
      <SummaryRow
        label="Program size"
        value={formatByteCount(rawByteCount)}
        data-testid="summary-program-size"
      />
      <SummaryRow
        label="Initial PC"
        value={`0x${envelope.initialState.pc.toString(16)}`}
        data-testid="summary-pc"
      />
      <SummaryRow
        label="Initial gas"
        value={envelope.initialState.gas.toLocaleString()}
        data-testid="summary-gas"
      />
      <RegisterPreview registers={envelope.initialState.registers} />
    </div>
  );
}

function RegisterPreview({ registers }: { registers: bigint[] }) {
  const nonZero = registers
    .map((v, i) => ({ i, v }))
    .filter(({ v }) => v !== 0n);

  if (nonZero.length === 0) {
    return (
      <SummaryRow
        label="Registers"
        value={`${registers.length} (all zero)`}
        data-testid="summary-registers"
      />
    );
  }

  const preview = nonZero
    .slice(0, 4)
    .map(({ i, v }) => `\u03C9${i}=0x${v.toString(16)}`)
    .join(", ");
  const suffix = nonZero.length > 4 ? `, +${nonZero.length - 4} more` : "";

  return (
    <SummaryRow
      label="Registers"
      value={`${preview}${suffix}`}
      span
      data-testid="summary-registers"
    />
  );
}

function SummaryRow({
  label,
  value,
  span,
  "data-testid": testId,
}: {
  label: string;
  value: string;
  span?: boolean;
  "data-testid"?: string;
}) {
  return (
    <div className={span ? "col-span-2" : ""} data-testid={testId}>
      <span className="text-muted-foreground">{label}: </span>
      <span className="font-mono text-foreground">{value}</span>
    </div>
  );
}

function tryDecodeUtf8(bytes: Uint8Array): string | null {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return null;
  }
}
