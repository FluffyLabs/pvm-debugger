import { useState } from "react";
import { Button, Alert } from "@fluffylabs/shared-ui";
import { ArrowRight } from "lucide-react";
import type { RawPayload, DetectedFormat } from "@pvmdbg/content";
import { FileUpload, type FileUploadResult } from "./FileUpload";
import { UrlInput, type UrlInputResult } from "./UrlInput";
import { ManualInput, type ManualInputResult } from "./ManualInput";

/** Which source type currently holds the pending selection. */
type ActiveSource = "file" | "url" | "hex" | null;

interface SourceStepProps {
  onAdvance: (rawPayload: RawPayload, detectedFormat: DetectedFormat) => void;
}

export function SourceStep({ onAdvance }: SourceStepProps) {
  const [activeSource, setActiveSource] = useState<ActiveSource>(null);
  const [fileResult, setFileResult] = useState<FileUploadResult | null>(null);
  const [urlResult, setUrlResult] = useState<UrlInputResult | null>(null);
  const [hexResult, setHexResult] = useState<ManualInputResult | null>(null);

  const [error, setError] = useState<string | null>(null);

  // Determine what payload is pending based on active source
  function getPendingPayload(): RawPayload | null {
    switch (activeSource) {
      case "file":
        return fileResult?.rawPayload ?? null;
      case "url":
        return urlResult?.rawPayload ?? null;
      case "hex":
        return hexResult?.rawPayload ?? null;
      default:
        return null;
    }
  }

  function getPendingFormat(): DetectedFormat | null {
    switch (activeSource) {
      case "file":
        return fileResult?.detectedFormat ?? null;
      case "url":
        return urlResult?.detectedFormat ?? null;
      case "hex":
        return hexResult?.detectedFormat ?? null;
      default:
        return null;
    }
  }

  const hasPending = getPendingPayload() !== null;

  // --- File handlers ---
  function handleFileSelected(result: FileUploadResult) {
    setFileResult(result);
    setUrlResult(null);
    setHexResult(null);
    setActiveSource("file");
    setError(null);
  }

  function handleFileClear() {
    setFileResult(null);
    if (activeSource === "file") setActiveSource(null);
    setError(null);
  }

  // --- URL handlers ---
  function handleUrlLoaded(result: UrlInputResult) {
    setUrlResult(result);
    setFileResult(null);
    setHexResult(null);
    setActiveSource("url");
    setError(null);
    // Auto-advance after successful URL fetch (item 10)
    onAdvance(result.rawPayload, result.detectedFormat);
  }

  function handleUrlClear() {
    setUrlResult(null);
    if (activeSource === "url") setActiveSource(null);
  }

  // --- Manual hex handlers ---
  function handleHexParsed(result: ManualInputResult) {
    setHexResult(result);
    setFileResult(null);
    setUrlResult(null);
    setActiveSource("hex");
    setError(null);
  }

  function handleHexClear() {
    setHexResult(null);
    if (activeSource === "hex") setActiveSource(null);
  }

  // --- Continue ---
  function handleContinue() {
    const payload = getPendingPayload();
    const format = getPendingFormat();
    if (!payload || !format) return;
    setError(null);
    onAdvance(payload, format);
  }

  return (
    <div data-testid="source-step" className="flex flex-col gap-6">
      {/* File upload */}
      <div>
        <h2 className="text-sm font-medium text-foreground mb-1">Upload File</h2>
        <p className="text-xs text-muted-foreground mb-3">
          Load a local program file to begin debugging.
        </p>
        <FileUpload
          onFileSelected={handleFileSelected}
          onClear={handleFileClear}
          selectedFile={fileResult}
        />
      </div>

      {/* URL input */}
      <div>
        <h2 className="text-sm font-medium text-foreground mb-1">Fetch from URL</h2>
        <p className="text-xs text-muted-foreground mb-3">
          Enter a URL to fetch a program. GitHub blob URLs are rewritten automatically.
        </p>
        <UrlInput
          onLoaded={handleUrlLoaded}
          onClear={handleUrlClear}
          result={urlResult}
        />
      </div>

      {/* Manual hex input */}
      <div>
        <h2 className="text-sm font-medium text-foreground mb-1">Manual Hex Input</h2>
        <p className="text-xs text-muted-foreground mb-3">
          Paste raw program bytes as a hex string.
        </p>
        <ManualInput
          onParsed={handleHexParsed}
          onClear={handleHexClear}
          result={hexResult}
        />
      </div>

      {/* Shared error */}
      {error && (
        <Alert intent="destructive" data-testid="source-step-error">
          <Alert.Title>Failed to load program</Alert.Title>
          <Alert.Text>{error}</Alert.Text>
        </Alert>
      )}

      {/* Shared Continue button */}
      <Button
        data-testid="source-step-continue"
        disabled={!hasPending}
        onClick={handleContinue}
        className="cursor-pointer self-start gap-1.5"
      >
        <ArrowRight className="w-4 h-4" />
        Continue
      </Button>
    </div>
  );
}
