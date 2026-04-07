import { Alert, Input, Switch } from "@fluffylabs/shared-ui";
import {
  decodeSpiEntrypoint,
  type ExampleEntry,
  encodeSpiEntrypoint,
  type SpiEntrypointParams,
} from "@pvmdbg/content";
import { fromHex, toHex } from "@pvmdbg/types";
import { useCallback, useEffect, useState } from "react";

// ── localStorage persistence ──────────────────────────────────────────

const SPI_CONFIG_STORAGE_KEY = "pvmdbg:spi-config";

/** Serialisable shape stored in localStorage. Stores fields for ALL entrypoint types. */
interface PersistedSpiConfig {
  entrypoint: SpiEntrypointParams["entrypoint"];
  /** Per-entrypoint field values (keyed by entrypoint type). */
  allFields: Record<string, Record<string, string>>;
  isRawMode: boolean;
  rawHex: string;
}

function loadPersistedConfig(): PersistedSpiConfig | null {
  try {
    const raw = localStorage.getItem(SPI_CONFIG_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    // Migrate from old flat `fields` shape to per-entrypoint `allFields`
    if (parsed.fields && !parsed.allFields) {
      return {
        entrypoint: parsed.entrypoint,
        allFields: { [parsed.entrypoint]: parsed.fields },
        isRawMode: parsed.isRawMode ?? false,
        rawHex: parsed.rawHex ?? "",
      };
    }
    return parsed as PersistedSpiConfig;
  } catch {
    return null;
  }
}

function persistConfig(config: PersistedSpiConfig): void {
  try {
    localStorage.setItem(SPI_CONFIG_STORAGE_KEY, JSON.stringify(config));
  } catch {
    // silently ignore
  }
}

// ── Default field values ──────────────────────────────────────────────

const DEFAULT_FIELDS: Record<
  SpiEntrypointParams["entrypoint"],
  Record<string, string>
> = {
  accumulate: { slot: "42", id: "0", results: "0" },
  refine: {
    core: "0",
    index: "0",
    id: "0",
    payload: "",
    workPackageHash: "0x" + "00".repeat(32),
  },
  is_authorized: { core: "0" },
};

// ── Helpers ───────────────────────────────────────────────────────────

function fieldsToParams(
  entrypoint: SpiEntrypointParams["entrypoint"],
  fields: Record<string, string>,
): SpiEntrypointParams {
  switch (entrypoint) {
    case "accumulate":
      return {
        entrypoint: "accumulate",
        pc: 5,
        params: {
          slot: parseInt(fields.slot ?? "0", 10),
          id: parseInt(fields.id ?? "0", 10),
          results: parseInt(fields.results ?? "0", 10),
        },
      };
    case "refine": {
      const payloadHex = fields.payload ?? "";
      const hashHex = fields.workPackageHash ?? "";
      // Always produce a 32-byte buffer for workPackageHash
      const hashBuf = new Uint8Array(32);
      if (hashHex.length > 0) {
        try {
          const decoded = fromHex(hashHex);
          hashBuf.set(decoded.subarray(0, 32));
        } catch {
          // leave as zeros on invalid input
        }
      }
      return {
        entrypoint: "refine",
        pc: 0,
        params: {
          core: parseInt(fields.core ?? "0", 10),
          index: parseInt(fields.index ?? "0", 10),
          id: parseInt(fields.id ?? "0", 10),
          payload:
            payloadHex.length > 0 ? fromHex(payloadHex) : new Uint8Array(),
          workPackageHash: hashBuf,
        },
      };
    }
    case "is_authorized":
      return {
        entrypoint: "is_authorized",
        pc: 0,
        params: { core: parseInt(fields.core ?? "0", 10) },
      };
  }
}

function paramsToFields(params: SpiEntrypointParams): Record<string, string> {
  switch (params.entrypoint) {
    case "accumulate":
      return {
        slot: String(params.params.slot),
        id: String(params.params.id),
        results: String(params.params.results),
      };
    case "refine": {
      // Suppress all-zero hash display (show empty string)
      const hashBytes = params.params.workPackageHash;
      const isAllZero =
        hashBytes.length === 0 || hashBytes.every((b) => b === 0);
      return {
        core: String(params.params.core),
        index: String(params.params.index),
        id: String(params.params.id),
        payload:
          params.params.payload.length > 0 ? toHex(params.params.payload) : "",
        workPackageHash: isAllZero ? "" : toHex(hashBytes),
      };
    }
    case "is_authorized":
      return { core: String(params.params.core) };
  }
}

/** Validate numeric string fields. Returns error message or null. */
function validateFields(
  entrypoint: SpiEntrypointParams["entrypoint"],
  fields: Record<string, string>,
): string | null {
  const numericFields: string[] =
    entrypoint === "accumulate"
      ? ["slot", "id", "results"]
      : entrypoint === "refine"
        ? ["core", "index", "id"]
        : ["core"];

  for (const field of numericFields) {
    const val = fields[field] ?? "";
    if (val === "") return `${field} is required`;
    const n = Number(val);
    if (!Number.isFinite(n) || !Number.isInteger(n) || n < 0) {
      return `${field} must be a non-negative integer`;
    }
  }

  if (entrypoint === "refine") {
    for (const hexField of ["payload", "workPackageHash"] as const) {
      const val = fields[hexField] ?? "";
      if (val.length > 0) {
        try {
          fromHex(val);
        } catch {
          return `${hexField} must be valid hex`;
        }
      }
    }
  }

  return null;
}

function validateRawHex(hex: string): string | null {
  if (hex === "" || hex === "0x") return null;
  try {
    fromHex(hex);
    return null;
  } catch {
    return "Invalid hex string";
  }
}

// ── Field definitions ─────────────────────────────────────────────────

interface FieldDef {
  key: string;
  label: string;
  type: "number" | "hex";
  placeholder: string;
}

const FIELD_DEFS: Record<SpiEntrypointParams["entrypoint"], FieldDef[]> = {
  accumulate: [
    { key: "slot", label: "Timeslot", type: "number", placeholder: "0" },
    { key: "id", label: "Service ID", type: "number", placeholder: "0" },
    { key: "results", label: "Results", type: "number", placeholder: "0" },
  ],
  refine: [
    { key: "core", label: "Core", type: "number", placeholder: "0" },
    { key: "index", label: "Index", type: "number", placeholder: "0" },
    { key: "id", label: "Service ID", type: "number", placeholder: "0" },
    { key: "payload", label: "Payload", type: "hex", placeholder: "0x..." },
    {
      key: "workPackageHash",
      label: "Work Package Hash",
      type: "hex",
      placeholder: "0x...",
    },
  ],
  is_authorized: [
    { key: "core", label: "Core", type: "number", placeholder: "0" },
  ],
};

const ENTRYPOINT_OPTIONS: Array<{
  value: SpiEntrypointParams["entrypoint"];
  label: string;
}> = [
  { value: "refine", label: "Refine" },
  { value: "accumulate", label: "Accumulate" },
  { value: "is_authorized", label: "Is Authorized" },
];

// ── Component ─────────────────────────────────────────────────────────

interface SpiEntrypointConfigProps {
  exampleEntry: ExampleEntry | null;
  /** Called with valid params, or null when invalid. */
  onChange: (params: SpiEntrypointParams | null) => void;
}

export function SpiEntrypointConfig({
  exampleEntry,
  onChange,
}: SpiEntrypointConfigProps) {
  // Load persisted config once for all initializers
  const [persistedSnapshot] = useState(() => loadPersistedConfig());

  // Determine initial state: example overrides > persisted > defaults
  const [entrypoint, setEntrypoint] = useState<
    SpiEntrypointParams["entrypoint"]
  >(() => {
    if (exampleEntry?.entrypoint) return exampleEntry.entrypoint.type;
    if (persistedSnapshot) return persistedSnapshot.entrypoint;
    return "accumulate";
  });

  // Store fields for ALL entrypoint types so switching doesn't lose data
  const [allFields, setAllFields] = useState<
    Record<string, Record<string, string>>
  >(() => {
    const base = { ...DEFAULT_FIELDS };
    // Merge persisted fields for each entrypoint type
    if (persistedSnapshot?.allFields) {
      for (const ep of ["accumulate", "refine", "is_authorized"] as const) {
        if (persistedSnapshot.allFields[ep]) {
          base[ep] = { ...base[ep], ...persistedSnapshot.allFields[ep] };
        }
      }
    }
    // Example entrypoint overrides for its specific type
    if (exampleEntry?.entrypoint) {
      const ep = exampleEntry.entrypoint;
      base[ep.type] = { ...base[ep.type], ...ep.params };
    }
    return base;
  });

  // Current entrypoint's fields (derived view)
  const fields = allFields[entrypoint] ?? DEFAULT_FIELDS[entrypoint];

  const [isRawMode, setIsRawMode] = useState(() => {
    if (exampleEntry?.entrypoint) return false;
    return persistedSnapshot?.isRawMode ?? false;
  });

  const [rawHex, setRawHex] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);

  // Encode builder fields → rawHex whenever fields change in builder mode
  const encodeFromFields = useCallback(() => {
    const err = validateFields(entrypoint, fields);
    if (err) {
      setValidationError(err);
      return null;
    }
    try {
      const params = fieldsToParams(entrypoint, fields);
      const encoded = encodeSpiEntrypoint(params);
      setRawHex(toHex(encoded));
      setValidationError(null);
      return params;
    } catch (e) {
      setValidationError(e instanceof Error ? e.message : String(e));
      return null;
    }
  }, [entrypoint, fields]);

  // Sync encoded hex from builder fields
  useEffect(() => {
    if (!isRawMode) {
      const params = encodeFromFields();
      onChange(params);
    }
  }, [encodeFromFields, isRawMode, onChange]);

  // When in RAW mode, decode rawHex → fields and notify parent
  useEffect(() => {
    if (isRawMode) {
      const hexErr = validateRawHex(rawHex);
      if (hexErr) {
        setValidationError(hexErr);
        onChange(null);
        return;
      }
      if (rawHex === "" || rawHex === "0x") {
        setValidationError(null);
        // Emit params with empty encoded args — still valid
        const params = fieldsToParams(entrypoint, fields);
        onChange(params);
        return;
      }
      try {
        const bytes = fromHex(rawHex);
        const decoded = decodeSpiEntrypoint(entrypoint, bytes);
        setAllFields((prev) => ({
          ...prev,
          [entrypoint]: paramsToFields(decoded),
        }));
        setValidationError(null);
        onChange(decoded);
      } catch (e) {
        setValidationError(e instanceof Error ? e.message : String(e));
        onChange(null);
      }
    }
  }, [rawHex, isRawMode, entrypoint]); // eslint-disable-line react-hooks/exhaustive-deps

  // Persist to localStorage on every state change
  useEffect(() => {
    persistConfig({ entrypoint, allFields, isRawMode, rawHex });
  }, [entrypoint, allFields, isRawMode, rawHex]);

  function handleEntrypointChange(ep: SpiEntrypointParams["entrypoint"]) {
    setEntrypoint(ep);
    // Fields for the new entrypoint are already stored in allFields — no data loss
  }

  function handleFieldChange(key: string, value: string) {
    setAllFields((prev) => ({
      ...prev,
      [entrypoint]: { ...prev[entrypoint], [key]: value },
    }));
  }

  function handleRawModeToggle(checked: boolean) {
    setIsRawMode(checked);
    if (!checked) {
      // Switching back to builder: re-encode from current fields
      setValidationError(null);
    }
  }

  const fieldDefs = FIELD_DEFS[entrypoint];

  return (
    <div
      data-testid="spi-entrypoint-config"
      className="flex flex-col gap-3 border rounded-lg p-4 bg-card"
    >
      {/* Header with RAW toggle */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">
          {isRawMode ? "Manual Configuration" : "SPI Entrypoint"}
        </h3>
        <div className="flex items-center gap-2">
          <Switch
            data-testid="spi-raw-mode-switch"
            checked={isRawMode}
            onCheckedChange={handleRawModeToggle}
          />
          <label
            className="text-xs text-muted-foreground cursor-pointer"
            onClick={() => handleRawModeToggle(!isRawMode)}
          >
            RAW
          </label>
        </div>
      </div>

      {/* Entrypoint selection (builder mode only) */}
      {!isRawMode && (
        <div className="flex gap-2" data-testid="spi-entrypoint-options">
          {ENTRYPOINT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              data-testid={`spi-entrypoint-${opt.value}`}
              onClick={() => handleEntrypointChange(opt.value)}
              className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-md border cursor-pointer transition-colors ${
                entrypoint === opt.value
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background text-foreground border-border hover:bg-accent"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}

      {/* Builder fields (builder mode only) */}
      {!isRawMode && (
        <div className="flex flex-col gap-2 pt-2 border-t border-border">
          {fieldDefs.map((def) => (
            <div key={def.key} className="flex items-center gap-2">
              <label className="text-xs text-muted-foreground min-w-[90px]">
                {def.label}
              </label>
              <Input
                data-testid={`spi-field-${def.key}`}
                type={def.type === "number" ? "number" : "text"}
                className="text-xs flex-1 font-mono"
                placeholder={def.placeholder}
                value={fields[def.key] ?? ""}
                onChange={(e) => handleFieldChange(def.key, e.target.value)}
              />
            </div>
          ))}
        </div>
      )}

      {/* RAW hex input (RAW mode) or auto-generated display (builder mode) */}
      <div className="flex flex-col gap-1 pt-2 border-t border-border">
        <label className="text-xs text-muted-foreground">
          SPI Arguments {isRawMode ? "" : "(Auto-generated)"}
        </label>
        <Input
          data-testid="spi-raw-hex"
          className={`text-xs font-mono ${!isRawMode ? "bg-muted" : ""} ${validationError ? "border-red-500" : ""}`}
          placeholder="0x-prefixed encoded entrypoint bytes"
          value={rawHex}
          onChange={(e) => setRawHex(e.target.value)}
          readOnly={!isRawMode}
        />
      </div>

      {/* Validation error */}
      {validationError && (
        <Alert intent="destructive" data-testid="spi-validation-error">
          <Alert.Title>Invalid configuration</Alert.Title>
          <Alert.Text>{validationError}</Alert.Text>
        </Alert>
      )}
    </div>
  );
}
