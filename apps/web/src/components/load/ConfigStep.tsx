import { useState, useMemo } from "react";
import { useNavigate } from "react-router";
import { Button, Alert } from "@fluffylabs/shared-ui";
import { ArrowLeft, Loader2, Play } from "lucide-react";
import {
  createProgramEnvelope,
  decodeGeneric,
  type RawPayload,
  type DetectedFormat,
  type ExampleEntry,
} from "@pvmdbg/content";
import type { ProgramEnvelope } from "@pvmdbg/types";
import { useOrchestrator } from "../../hooks/useOrchestrator";
import { DetectionSummary } from "./DetectionSummary";

interface ConfigStepProps {
  rawPayload: RawPayload;
  detectedFormat: DetectedFormat;
  exampleEntry: ExampleEntry | null;
  onBack: () => void;
}

export function ConfigStep({ rawPayload, detectedFormat, exampleEntry, onBack }: ConfigStepProps) {
  const navigate = useNavigate();
  const { initialize, setEnvelope } = useOrchestrator();
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [forceGeneric, setForceGeneric] = useState(false);

  // Try creating the envelope eagerly for the summary display
  const { envelope, decodeError } = useMemo(() => {
    try {
      let env: ProgramEnvelope;
      if (forceGeneric) {
        env = decodeGeneric(rawPayload.bytes, rawPayload.sourceKind, rawPayload.sourceId);
      } else {
        env = createProgramEnvelope(rawPayload);
      }
      return { envelope: env, decodeError: null };
    } catch (err) {
      return {
        envelope: null,
        decodeError: err instanceof Error ? err.message : String(err),
      };
    }
  }, [rawPayload, forceGeneric]);

  const effectiveFormat: DetectedFormat = forceGeneric
    ? { kind: "generic_pvm", payload: rawPayload.bytes }
    : detectedFormat;

  async function handleLoad() {
    if (!envelope) return;
    setLoading(true);
    setLoadError(null);
    try {
      const orch = initialize(["typeberry"]);
      await orch.loadProgram(envelope);
      if (envelope.trace) {
        orch.setTrace("typeberry", envelope.trace);
      }
      setEnvelope(envelope);
      navigate("/");
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : String(err));
      setLoading(false);
    }
  }

  function handleForceGeneric() {
    setForceGeneric(true);
  }

  return (
    <div data-testid="config-step" className="flex flex-col items-center p-8 h-full overflow-auto">
      <h1 className="text-lg font-semibold text-foreground mb-1">Program Summary</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Review the detected program before loading it into the debugger.
      </p>

      <div className="w-full max-w-2xl flex flex-col gap-4">
        {/* Decode error with generic fallback */}
        {decodeError && (
          <Alert intent="destructive" data-testid="config-step-decode-error">
            <Alert.Title>Failed to decode program</Alert.Title>
            <Alert.Text>{decodeError}</Alert.Text>
          </Alert>
        )}

        {decodeError && !forceGeneric && (
          <Button
            variant="outline"
            size="sm"
            data-testid="config-step-force-generic"
            onClick={handleForceGeneric}
            className="cursor-pointer self-start"
          >
            Try as Generic PVM
          </Button>
        )}

        {/* Detection summary card */}
        {envelope && (
          <DetectionSummary
            envelope={envelope}
            detectedFormat={effectiveFormat}
            rawByteCount={rawPayload.bytes.length}
          />
        )}

        {/* Load error */}
        {loadError && (
          <Alert intent="destructive" data-testid="config-step-load-error">
            <Alert.Title>Failed to load program</Alert.Title>
            <Alert.Text>{loadError}</Alert.Text>
          </Alert>
        )}

        {/* Action buttons */}
        <div className="flex items-center gap-3 mt-2">
          <Button
            variant="outline"
            data-testid="config-step-back"
            onClick={onBack}
            className="cursor-pointer gap-1.5"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>

          <Button
            data-testid="config-step-load"
            disabled={!envelope || loading}
            onClick={handleLoad}
            className="cursor-pointer gap-1.5"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Play className="w-4 h-4" />
            )}
            Load Program
          </Button>
        </div>
      </div>
    </div>
  );
}
