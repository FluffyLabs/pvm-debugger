import { useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router";
import { Button, Alert } from "@fluffylabs/shared-ui";
import { ArrowLeft, Loader2, Play } from "lucide-react";
import {
  createProgramEnvelope,
  decodeGeneric,
  type RawPayload,
  type DetectedFormat,
  type ExampleEntry,
  type SpiEntrypointParams,
} from "@pvmdbg/content";
import type { ProgramEnvelope } from "@pvmdbg/types";
import { useOrchestrator } from "../../hooks/useOrchestrator";
import { persistSession } from "../../hooks/usePersistence";
import { DetectionSummary } from "./DetectionSummary";
import { SpiEntrypointConfig } from "./SpiEntrypointConfig";

interface ConfigStepProps {
  rawPayload: RawPayload;
  detectedFormat: DetectedFormat;
  exampleEntry: ExampleEntry | null;
  onBack: () => void;
}

/** Formats that show the SPI entrypoint configuration. */
function isSpiFormat(kind: DetectedFormat["kind"]): boolean {
  return kind === "jam_spi" || kind === "jam_spi_with_metadata";
}

export function ConfigStep({ rawPayload, detectedFormat, exampleEntry, onBack }: ConfigStepProps) {
  const navigate = useNavigate();
  const { initialize, setEnvelope } = useOrchestrator();
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [forceGeneric, setForceGeneric] = useState(false);

  // SPI entrypoint params from the config component (null = invalid)
  const [spiParams, setSpiParams] = useState<SpiEntrypointParams | null>(null);
  // Track whether the SPI config has reported at least once (to avoid disabling Load before mount)
  const [spiConfigReady, setSpiConfigReady] = useState(false);

  const handleSpiChange = useCallback((params: SpiEntrypointParams | null) => {
    setSpiParams(params);
    setSpiConfigReady(true);
  }, []);

  const effectiveFormat: DetectedFormat = forceGeneric
    ? { kind: "generic_pvm", payload: rawPayload.bytes }
    : detectedFormat;

  const showSpiConfig = isSpiFormat(effectiveFormat.kind);

  // Create envelope eagerly for summary display.
  // For SPI formats, use the current entrypoint params.
  const { envelope, decodeError } = useMemo(() => {
    try {
      let env: ProgramEnvelope;
      if (forceGeneric) {
        env = decodeGeneric(rawPayload.bytes, rawPayload.sourceKind, rawPayload.sourceId);
      } else {
        const options = showSpiConfig && spiParams ? { entrypoint: spiParams } : undefined;
        env = createProgramEnvelope(rawPayload, options);
      }
      return { envelope: env, decodeError: null };
    } catch (err) {
      return {
        envelope: null,
        decodeError: err instanceof Error ? err.message : String(err),
      };
    }
  }, [rawPayload, forceGeneric, showSpiConfig, spiParams]);

  // Load button is disabled when:
  // - No envelope (decode error)
  // - Loading in progress
  // - SPI config is shown but has validation error (spiParams === null after config reported)
  const loadDisabled = !envelope || loading || (showSpiConfig && spiConfigReady && spiParams === null);

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
      // Persist session for reload recovery
      persistSession(
        rawPayload.bytes,
        { sourceKind: rawPayload.sourceKind, sourceId: rawPayload.sourceId },
        effectiveFormat.kind,
        forceGeneric,
        showSpiConfig ? spiParams : null,
        envelope.initialState.gas,
      );
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
    <div data-testid="config-step" className="flex flex-col items-start p-8 h-full overflow-auto max-w-2xl mx-auto w-full">
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
            variant="secondary"
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

        {/* SPI entrypoint configuration — only for SPI formats */}
        {showSpiConfig && (
          <SpiEntrypointConfig
            exampleEntry={exampleEntry}
            onChange={handleSpiChange}
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
            variant="secondary"
            data-testid="config-step-back"
            onClick={onBack}
            className="cursor-pointer gap-1.5"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>

          <Button
            data-testid="config-step-load"
            disabled={loadDisabled}
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
