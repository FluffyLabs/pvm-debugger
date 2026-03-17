import { useState, useCallback } from "react";
import { Alert } from "@fluffylabs/shared-ui";
import { Loader2, Globe, Check } from "lucide-react";
import { loadUrl, detectFormat, type RawPayload, type DetectedFormat } from "@pvmdbg/content";
import { formatByteCount } from "./format";

export interface UrlInputResult {
  rawPayload: RawPayload;
  detectedFormat: DetectedFormat;
  byteCount: number;
  url: string;
}

interface UrlInputProps {
  onLoaded: (result: UrlInputResult) => void;
  onClear: () => void;
  result: UrlInputResult | null;
}

export function UrlInput({ onLoaded, onClear, result }: UrlInputProps) {
  const [url, setUrl] = useState(result?.url ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFetch = useCallback(async () => {
    const trimmed = url.trim();
    if (!trimmed) return;
    setLoading(true);
    setError(null);
    try {
      const rawPayload = await loadUrl(trimmed);
      const detectedFormat = detectFormat(rawPayload.bytes);
      onLoaded({
        rawPayload,
        detectedFormat,
        byteCount: rawPayload.bytes.length,
        url: trimmed,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [url, onLoaded]);

  function handleUrlChange(value: string) {
    setUrl(value);
    // Clear the pending selection when URL text changes
    if (result) {
      onClear();
    }
    setError(null);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !loading) {
      handleFetch();
    }
  }

  return (
    <div data-testid="url-input" className="flex flex-col gap-2">
      <div className="flex gap-2">
        <input
          data-testid="url-input-field"
          type="url"
          value={url}
          onChange={(e) => handleUrlChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="https://example.com/program.pvm"
          className="flex-1 rounded-md border border-border bg-background px-3 py-1.5 text-sm font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          disabled={loading}
        />
        <button
          data-testid="url-input-fetch"
          onClick={handleFetch}
          disabled={loading || !url.trim()}
          className="inline-flex items-center gap-1.5 rounded-md border border-border bg-muted/30 px-3 py-1.5 text-sm text-foreground hover:bg-muted/60 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors"
        >
          {loading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" data-testid="url-input-loading" />
          ) : (
            <Globe className="w-3.5 h-3.5" />
          )}
          Fetch
        </button>
      </div>

      {result && (
        <div
          data-testid="url-input-success"
          className="flex items-center gap-2 text-xs text-emerald-400"
        >
          <Check className="w-3.5 h-3.5" />
          <span data-testid="url-input-bytecount">
            Fetched {formatByteCount(result.byteCount)}
          </span>
        </div>
      )}

      {error && (
        <Alert intent="destructive" data-testid="url-input-error">
          <Alert.Text>{error}</Alert.Text>
        </Alert>
      )}
    </div>
  );
}
