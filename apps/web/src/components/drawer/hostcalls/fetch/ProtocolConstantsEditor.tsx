import { useCallback } from "react";
import type { ProtocolConstants } from "../../../../lib/fetch-codec";

interface ProtocolConstantsEditorProps {
  value: ProtocolConstants;
  onChange: (value: ProtocolConstants) => void;
}

type FieldDef = {
  key: keyof ProtocolConstants;
  label: string;
  symbol: string;
  type: "u64" | "u32" | "u16";
};

const BALANCE_FIELDS: FieldDef[] = [
  {
    key: "electiveItemBalance",
    label: "Elective Item Balance",
    symbol: "B_I",
    type: "u64",
  },
  {
    key: "electiveByteBalance",
    label: "Elective Byte Balance",
    symbol: "B_L",
    type: "u64",
  },
  {
    key: "baseServiceBalance",
    label: "Base Service Balance",
    symbol: "B_S",
    type: "u64",
  },
];

const GAS_FIELDS: FieldDef[] = [
  {
    key: "gasAccumulateReport",
    label: "Gas Accumulate Report",
    symbol: "G_A",
    type: "u64",
  },
  {
    key: "gasIsAuthorized",
    label: "Gas Is Authorized",
    symbol: "G_I",
    type: "u64",
  },
  { key: "gasMaxRefine", label: "Gas Max Refine", symbol: "G_R", type: "u64" },
  { key: "gasMaxBlock", label: "Gas Max Block", symbol: "G_T", type: "u64" },
];

const CAPACITY_FIELDS: FieldDef[] = [
  { key: "coreCount", label: "Core Count", symbol: "C", type: "u16" },
  {
    key: "recentHistoryLength",
    label: "Recent History Length",
    symbol: "H",
    type: "u16",
  },
  { key: "maxWorkItems", label: "Max Work Items", symbol: "I", type: "u16" },
  { key: "maxReportDeps", label: "Max Report Deps", symbol: "J", type: "u16" },
  {
    key: "maxTicketsPerExtrinsic",
    label: "Max Tickets/Extrinsic",
    symbol: "K",
    type: "u16",
  },
  {
    key: "ticketsPerValidator",
    label: "Tickets/Validator",
    symbol: "N",
    type: "u16",
  },
  {
    key: "maxAuthorizersPerCore",
    label: "Max Authorizers/Core",
    symbol: "O",
    type: "u16",
  },
  {
    key: "authorizersQueueSize",
    label: "Authorizers Queue Size",
    symbol: "Q",
    type: "u16",
  },
  {
    key: "maxExtrinsicsPerWorkItem",
    label: "Max Extrinsics/WorkItem",
    symbol: "T",
    type: "u16",
  },
  {
    key: "reportTimeoutGracePeriod",
    label: "Report Timeout Grace",
    symbol: "U",
    type: "u16",
  },
  {
    key: "validatorsCount",
    label: "Validators Count",
    symbol: "V",
    type: "u16",
  },
];

const TIMING_FIELDS: FieldDef[] = [
  {
    key: "preimageExpungePeriod",
    label: "Preimage Expunge Period",
    symbol: "D",
    type: "u32",
  },
  { key: "epochLength", label: "Epoch Length", symbol: "E", type: "u32" },
  {
    key: "maxLookupAnchorAge",
    label: "Max Lookup Anchor Age",
    symbol: "L",
    type: "u32",
  },
  { key: "slotDuration", label: "Slot Duration", symbol: "P", type: "u16" },
  { key: "rotationPeriod", label: "Rotation Period", symbol: "R", type: "u16" },
  { key: "contestLength", label: "Contest Length", symbol: "Y", type: "u32" },
];

const SIZE_FIELDS: FieldDef[] = [
  {
    key: "maxAuthorizerCodeSize",
    label: "Max Auth Code Size",
    symbol: "W_A",
    type: "u32",
  },
  {
    key: "maxBundleSize",
    label: "Max Bundle Size",
    symbol: "W_B",
    type: "u32",
  },
  {
    key: "maxServiceCodeSize",
    label: "Max Service Code Size",
    symbol: "W_C",
    type: "u32",
  },
  {
    key: "erasureCodedPieceSize",
    label: "EC Piece Size",
    symbol: "W_E",
    type: "u32",
  },
  {
    key: "maxImportSegments",
    label: "Max Import Segments",
    symbol: "W_M",
    type: "u32",
  },
  {
    key: "ecPiecesPerSegment",
    label: "EC Pieces/Segment",
    symbol: "W_P",
    type: "u32",
  },
  {
    key: "maxWorkReportSize",
    label: "Max Work Report Size",
    symbol: "W_R",
    type: "u32",
  },
  {
    key: "transferMemoSize",
    label: "Transfer Memo Size",
    symbol: "W_T",
    type: "u32",
  },
  {
    key: "maxExportSegments",
    label: "Max Export Segments",
    symbol: "W_X",
    type: "u32",
  },
];

const SECTIONS = [
  { title: "Balances", fields: BALANCE_FIELDS },
  { title: "Gas", fields: GAS_FIELDS },
  { title: "Capacity", fields: CAPACITY_FIELDS },
  { title: "Timing", fields: TIMING_FIELDS },
  { title: "Sizes", fields: SIZE_FIELDS },
];

function FieldInput({
  field,
  value,
  onFieldChange,
}: {
  field: FieldDef;
  value: bigint | number;
  onFieldChange: (key: keyof ProtocolConstants, val: bigint | number) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <label
        className="text-[10px] text-muted-foreground w-24 shrink-0 truncate"
        title={`${field.symbol}: ${field.label}`}
      >
        <span className="font-semibold">{field.symbol}</span> {field.label}
      </label>
      <input
        data-testid={`const-field-${field.key}`}
        className="flex-1 min-w-0 rounded border border-border bg-background px-1.5 py-0.5 font-mono text-xs text-foreground"
        type="text"
        value={value.toString()}
        onChange={(e) => {
          const raw = e.target.value.trim();
          if (raw === "") return;
          try {
            if (field.type === "u64") {
              onFieldChange(field.key, BigInt(raw));
            } else {
              const n = parseInt(raw, 10);
              if (!isNaN(n)) onFieldChange(field.key, n);
            }
          } catch {
            // ignore bad input
          }
        }}
      />
    </div>
  );
}

export function ProtocolConstantsEditor({
  value,
  onChange,
}: ProtocolConstantsEditorProps) {
  const handleFieldChange = useCallback(
    (key: keyof ProtocolConstants, val: bigint | number) => {
      onChange({ ...value, [key]: val });
    },
    [value, onChange],
  );

  return (
    <div
      data-testid="protocol-constants-editor"
      className="flex flex-col gap-3"
    >
      {SECTIONS.map((section) => (
        <details key={section.title} open>
          <summary className="cursor-pointer text-xs font-semibold text-foreground mb-1">
            {section.title}
          </summary>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-1">
            {section.fields.map((field) => (
              <FieldInput
                key={field.key}
                field={field}
                value={value[field.key]}
                onFieldChange={handleFieldChange}
              />
            ))}
          </div>
        </details>
      ))}
    </div>
  );
}
