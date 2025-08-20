import React, { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Button } from "../ui/button";
import { UploadCloud, X, FileText } from "lucide-react";
import { validateTracesFile } from "@/types/type-guards";
import { useAppSelector } from "@/store/hooks";
import { selectHostCallsTrace } from "@/store/debugger/debuggerSlice";
import { useDebuggerActions } from "@/hooks/useDebuggerActions";
import { cn } from "@/lib/utils";

interface TracesFileManagerProps {
  className?: string;
  /** Whether to use compact layout for smaller spaces */
  compact?: boolean;
  /** Whether to show the clear button inline or as a separate action */
  inlineClear?: boolean;
}

export const TracesFileManager: React.FC<TracesFileManagerProps> = ({
  className,
  compact = false,
  inlineClear = false,
}) => {
  const [error, setError] = useState<string>();
  const [isLoading, setIsLoading] = useState(false);
  const currentTraces = useAppSelector(selectHostCallsTrace);
  const { handleTracesLoad, resetHostCallIndex } = useDebuggerActions();

  const handleFileRead = useCallback(
    (e: ProgressEvent<FileReader>) => {
      setIsLoading(true);
      setError(undefined);

      try {
        const content = e.target?.result;
        if (typeof content !== "string") {
          throw new Error("Failed to read file content");
        }

        const jsonData = JSON.parse(content);
        const validation = validateTracesFile(jsonData);

        if (!validation.success) {
          const formattedErrors = validation.error.issues
            .map((issue) => {
              const path = issue.path.join(" > ") || "root";
              return `${path}: ${issue.message}`;
            })
            .join("\n");

          throw new Error(`Invalid traces file:\n${formattedErrors}`);
        }

        handleTracesLoad(validation.data);
        resetHostCallIndex();
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error occurred";
        setError(message);
      } finally {
        setIsLoading(false);
      }
    },
    [handleTracesLoad, resetHostCallIndex],
  );

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) return;

      const file = acceptedFiles[0];
      const fileReader = new FileReader();
      fileReader.onloadend = (e) => handleFileRead(e);
      fileReader.readAsText(file);
    },
    [handleFileRead],
  );

  const handleClearTraces = useCallback(() => {
    handleTracesLoad(null);
    setError(undefined);
  }, [handleTracesLoad]);

  const { getRootProps, getInputProps, open, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/json": [".json"],
      "text/json": [".json"],
    },
    multiple: false,
    noClick: true,
  });

  const hasTraces = currentTraces !== null;

  if (hasTraces) {
    if (compact) {
      // Compact layout for loader
      return (
        <div className={cn("flex items-center gap-2", className)}>
          <div className="flex items-center gap-1">
            <FileText className="w-4 h-4 text-green-600" />
            <span className="text-xs">{currentTraces["host-calls-trace"].length} host call(s)</span>
          </div>
          {inlineClear && (
            <Button variant="ghost" size="sm" onClick={handleClearTraces} className="h-5 px-2 text-xs">
              <X className="w-3 h-3" />
            </Button>
          )}
        </div>
      );
    }

    // Full layout for settings
    return (
      <div className={cn("w-[260px]", className)}>
        <div className="flex justify-between items-center border rounded-lg p-2">
          <div className="flex items-center gap-2 text-xs">
            <FileText className="w-4 h-4 text-green-600" />
            Loaded {currentTraces["host-calls-trace"].length} host call(s)
          </div>
          <Button variant="outline" size="sm" onClick={handleClearTraces} className="ml-2 h-7 text-xs">
            <X className="w-3 h-3 mr-1" />
            Clear
          </Button>
        </div>
      </div>
    );
  }

  if (compact) {
    // Compact upload layout for loader
    return (
      <div className={className}>
        <div
          {...getRootProps()}
          className={cn(
            "border border-dashed rounded p-2 transition-colors cursor-pointer",
            isDragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25",
            error && "border-destructive",
          )}
        >
          <input {...getInputProps()} />
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <UploadCloud className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">{isDragActive ? "Drop here" : "Drop traces JSON"}</span>
            </div>
            <Button variant="ghost" size="sm" onClick={open} disabled={isLoading} className="h-6 px-2 text-xs">
              {isLoading ? "Loading..." : "Browse"}
            </Button>
          </div>
        </div>
        {error && (
          <div className="mt-2 text-xs text-destructive bg-destructive/10 p-2 rounded border">
            <pre className="whitespace-pre-wrap font-mono text-[10px]">{error}</pre>
          </div>
        )}
      </div>
    );
  }

  // Full upload layout for settings
  return (
    <div className={cn("w-[260px]", className)}>
      <div
        {...getRootProps()}
        className={cn(
          "border-2 border-dashed rounded-lg p-3 transition-colors cursor-pointer",
          isDragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25",
          error && "border-destructive",
        )}
      >
        <input {...getInputProps()} />
        <div className="flex justify-between items-center gap-2">
          <div className="flex items-center">
            <UploadCloud className="w-4 h-4 text-muted-foreground" />
            <p className="ml-2 text-xs text-muted-foreground">{isDragActive ? "Drop here" : "Drop traces JSON"}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={open} disabled={isLoading} className="h-6 px-2 text-xs">
            {isLoading ? "Loading..." : "Browse"}
          </Button>
        </div>
      </div>
      {error && (
        <div className="mt-2 text-xs text-destructive bg-destructive/10 p-2 rounded border">
          <pre className="whitespace-pre-wrap font-mono">{error}</pre>
        </div>
      )}
    </div>
  );
};
