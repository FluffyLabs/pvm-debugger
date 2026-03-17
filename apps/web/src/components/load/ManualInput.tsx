import { useState, useCallback } from "react";
import { Alert } from "@fluffylabs/shared-ui";
import { Check } from "lucide-react";
import { loadManualInput, detectFormat, type RawPayload, type DetectedFormat } from "@pvmdbg/content";

export interface ManualInputResult {
  rawPayload: RawPayload;
  detectedFormat: DetectedFormat;
  byteCount: number;
}

interface ManualInputProps {
  onParsed: (result: ManualInputResult) => void;
  onClear: () => void;
  result: ManualInputResult | null;
}

export function ManualInput({ onParsed, onClear, result }: ManualInputProps) {
  const [hex, setHex] = useState("");
  const [error, setError] = useState<string | null>(null);

  const validate = useCallback(
    (value: string) => {
      const trimmed = value.trim();
      if (!trimmed) {
        if (result) onClear();
        setError(null);
        return;
      }
      try {
        const rawPayload = loadManualInput(trimmed);
        const detectedFormat = detectFormat(rawPayload.bytes);
        setError(null);
        onParsed({
          rawPayload,
          detectedFormat,
          byteCount: rawPayload.bytes.length,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
        if (result) onClear();
      }
    },
    [onParsed, onClear, result],
  );

  function handleChange(value: string) {
    setHex(value);
    // Clear previous result when text changes
    if (result) {
      onClear();
      setError(null);
    }
  }

  function handleBlur() {
    validate(hex);
  }

  return (
    <div data-testid="manual-input" className="flex flex-col gap-2">
      <textarea
        data-testid="manual-input-field"
        value={hex}
        onChange={(e) => handleChange(e.target.value)}
        onBlur={handleBlur}
        placeholder="0x00030001000d0008000200070001..."
        rows={3}
        className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm font-mono text-foreground placeholder:text-muted-foreground resize-y focus:outline-none focus:ring-1 focus:ring-ring"
      />

      {result && (
        <div
          data-testid="manual-input-success"
          className="flex items-center gap-2 text-xs text-emerald-400"
        >
          <Check className="w-3.5 h-3.5" />
          <span data-testid="manual-input-bytecount">
            Parsed {formatByteCount(result.byteCount)}
          </span>
        </div>
      )}

      {error && (
        <Alert intent="destructive" data-testid="manual-input-error">
          <Alert.Text>{error}</Alert.Text>
        </Alert>
      )}
    </div>
  );
}

function formatByteCount(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
