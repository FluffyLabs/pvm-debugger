import { useState } from "react";
import { useNavigate } from "react-router";
import { Button, Alert } from "@fluffylabs/shared-ui";
import { ArrowRight, Loader2 } from "lucide-react";
import { createProgramEnvelope } from "@pvmdbg/content";
import { useOrchestrator } from "../../hooks/useOrchestrator";
import { FileUpload, type FileUploadResult } from "./FileUpload";

export function SourceStep() {
  const navigate = useNavigate();
  const { initialize, setEnvelope } = useOrchestrator();
  const [selectedFile, setSelectedFile] = useState<FileUploadResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleFileSelected(result: FileUploadResult) {
    setSelectedFile(result);
    setError(null);
  }

  function handleClear() {
    setSelectedFile(null);
    setError(null);
  }

  async function handleContinue() {
    if (!selectedFile) return;
    setLoading(true);
    setError(null);
    try {
      const envelope = createProgramEnvelope(selectedFile.rawPayload);
      const orch = initialize(["typeberry"]);
      await orch.loadProgram(envelope);
      setEnvelope(envelope);
      navigate("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setLoading(false);
    }
  }

  return (
    <div data-testid="source-step" className="flex flex-col gap-4">
      <div>
        <h2 className="text-sm font-medium text-foreground mb-1">Upload File</h2>
        <p className="text-xs text-muted-foreground mb-3">
          Load a local program file to begin debugging.
        </p>
        <FileUpload
          onFileSelected={handleFileSelected}
          onClear={handleClear}
          selectedFile={selectedFile}
        />
      </div>

      {error && (
        <Alert intent="destructive" data-testid="source-step-error">
          <Alert.Title>Failed to load program</Alert.Title>
          <Alert.Text>{error}</Alert.Text>
        </Alert>
      )}

      <Button
        data-testid="source-step-continue"
        disabled={!selectedFile || loading}
        onClick={handleContinue}
        className="cursor-pointer self-start gap-1.5"
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <ArrowRight className="w-4 h-4" />
        )}
        Continue
      </Button>
    </div>
  );
}
