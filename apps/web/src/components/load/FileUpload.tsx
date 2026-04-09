import { Badge } from "@fluffylabs/shared-ui";
import {
  type DetectedFormat,
  detectFormat,
  loadUpload,
  type RawPayload,
} from "@pvmdbg/content";
import { FileUp, Upload, X } from "lucide-react";
import {
  type ChangeEvent,
  type DragEvent,
  useCallback,
  useRef,
  useState,
} from "react";
import { formatBadgeIntent, formatByteCount, formatLabel } from "./format";

const ACCEPTED_EXTENSIONS = [".jam", ".pvm", ".bin", ".log", ".json"];
const ACCEPT_STRING = ACCEPTED_EXTENSIONS.join(",");

export interface FileUploadResult {
  rawPayload: RawPayload;
  detectedFormat: DetectedFormat;
  fileName: string;
  byteCount: number;
}

interface FileUploadProps {
  onFileSelected: (result: FileUploadResult) => void;
  onClear: () => void;
  selectedFile: FileUploadResult | null;
}

export function FileUpload({
  onFileSelected,
  onClear,
  selectedFile,
}: FileUploadProps) {
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);
      const ext = file.name.substring(file.name.lastIndexOf(".")).toLowerCase();
      if (!ACCEPTED_EXTENSIONS.includes(ext)) {
        setError(
          `Unsupported file type: ${ext}. Accepted: ${ACCEPTED_EXTENSIONS.join(", ")}`,
        );
        return;
      }
      try {
        const rawPayload = await loadUpload(file);
        const detectedFormat = detectFormat(rawPayload.bytes);
        onFileSelected({
          rawPayload,
          detectedFormat,
          fileName: file.name,
          byteCount: rawPayload.bytes.length,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      }
    },
    [onFileSelected],
  );

  function handleDragOver(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDragging(true);
  }

  function handleDragLeave(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFile(file);
    }
  }

  function handleInputChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
    // Reset so re-selecting same file triggers change
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }

  function handleClear() {
    setError(null);
    onClear();
  }

  if (selectedFile) {
    const fmtKind = selectedFile.detectedFormat.kind;
    return (
      <div data-testid="file-upload" className="flex flex-col gap-2">
        <div
          data-testid="file-upload-selected"
          className="flex items-center gap-2 rounded-md border border-border bg-muted/30 px-3 py-2 text-sm"
        >
          <FileUp className="w-4 h-4 text-muted-foreground shrink-0" />
          <span data-testid="file-upload-name" className="font-mono truncate">
            {selectedFile.fileName}
          </span>
          <span
            data-testid="file-upload-size"
            className="text-xs text-muted-foreground whitespace-nowrap"
          >
            {formatByteCount(selectedFile.byteCount)}
          </span>
          <Badge
            intent={formatBadgeIntent(fmtKind)}
            variant="outline"
            size="small"
            data-testid="file-upload-format"
          >
            {formatLabel(fmtKind)}
          </Badge>
          <button
            type="button"
            onClick={handleClear}
            data-testid="file-upload-clear"
            className="ml-auto text-muted-foreground hover:text-foreground cursor-pointer"
            aria-label="Clear selected file"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div data-testid="file-upload" className="flex flex-col gap-2">
      {/* biome-ignore lint/a11y/useSemanticElements: dropzone requires div for drag-and-drop support */}
      <div
        data-testid="file-upload-dropzone"
        role="button"
        tabIndex={0}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        className={`flex flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed px-4 py-6 cursor-pointer transition-colors ${
          dragging
            ? "border-primary bg-primary/10"
            : "border-border hover:border-muted-foreground"
        }`}
      >
        <Upload className="w-6 h-6 text-muted-foreground" />
        <p className="text-sm text-muted-foreground text-center">
          Drag & drop a program file here, or click to browse
        </p>
        <p className="text-xs text-muted-foreground/60">
          {ACCEPTED_EXTENSIONS.join(", ")}
        </p>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT_STRING}
        onChange={handleInputChange}
        data-testid="file-upload-input"
        className="hidden"
      />

      {error && (
        <p data-testid="file-upload-error" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
