import { Badge, Button } from "@fluffylabs/shared-ui";
import type { DetectedFormat, ExampleEntry, RawPayload } from "@pvmdbg/content";
import { createProgramEnvelope } from "@pvmdbg/content";
import { ArrowRight } from "lucide-react";
import { useCallback, useState } from "react";
import { useNavigate } from "react-router";
import { ConfigStep } from "../components/load/ConfigStep";
import { ExampleList } from "../components/load/ExampleList";
import {
  formatBadgeIntent,
  formatByteCount,
  formatLabel,
} from "../components/load/format";
import { SourceStep } from "../components/load/SourceStep";
import { useDebuggerSettings } from "../hooks/useDebuggerSettings";
import { useOrchestrator } from "../hooks/useOrchestrator";
import { persistSession } from "../hooks/usePersistence";

/** Formats that require the SPI entrypoint config step. */
function isSpiFormat(kind: DetectedFormat["kind"]): boolean {
  return kind === "jam_spi" || kind === "jam_spi_with_metadata";
}

export function LoadPage() {
  const navigate = useNavigate();
  const { initialize, setEnvelope } = useOrchestrator();
  const { settings } = useDebuggerSettings();
  const [step, setStep] = useState<1 | 2>(1);
  const [rawPayload, setRawPayload] = useState<RawPayload | null>(null);
  const [detectedFormat, setDetectedFormat] = useState<DetectedFormat | null>(
    null,
  );
  const [exampleEntry, setExampleEntry] = useState<ExampleEntry | null>(null);

  /** Try to load a non-SPI program directly into the debugger, bypassing step 2. */
  const loadDirectly = useCallback(
    async (payload: RawPayload, format: DetectedFormat) => {
      try {
        const envelope = createProgramEnvelope(payload);
        const orch = initialize(settings.selectedPvmIds);
        await orch.loadProgram(envelope);
        if (envelope.trace) {
          for (const pvmId of settings.selectedPvmIds) {
            orch.setTrace(pvmId, envelope.trace);
          }
        }
        setEnvelope(envelope);
        persistSession(
          payload.bytes,
          { sourceKind: payload.sourceKind, sourceId: payload.sourceId },
          format.kind,
          false,
          null,
          envelope.initialState.gas,
        );
        navigate("/");
      } catch {
        // On failure, fall back to step 2 so the user sees the error
        setStep(2);
      }
    },
    [initialize, setEnvelope, navigate, settings.selectedPvmIds],
  );

  const handleAdvance = useCallback(
    (payload: RawPayload, format: DetectedFormat, example?: ExampleEntry) => {
      setRawPayload(payload);
      setDetectedFormat(format);
      setExampleEntry(example ?? null);

      // Non-SPI programs skip step 2 and go directly to debugger
      if (!isSpiFormat(format.kind)) {
        loadDirectly(payload, format);
      } else {
        setStep(2);
      }
    },
    [loadDirectly],
  );

  const handleBack = useCallback(() => {
    setStep(1);
    // rawPayload and detectedFormat are preserved for rehydration
  }, []);

  // Step 2: config/summary screen
  if (step === 2 && rawPayload && detectedFormat) {
    return (
      <ConfigStep
        rawPayload={rawPayload}
        detectedFormat={detectedFormat}
        exampleEntry={exampleEntry}
        onBack={handleBack}
      />
    );
  }

  // Step 1: source selection
  return (
    <div
      data-testid="load-page"
      className="flex flex-col items-start p-8 h-full overflow-auto max-w-5xl mx-auto w-full"
    >
      <h1 className="text-lg font-semibold text-foreground mb-1">
        Load Program
      </h1>
      <p className="text-sm text-muted-foreground mb-6">
        Upload a file, fetch from URL, paste hex, or select an example to begin
        debugging.
      </p>

      {/* Candidate preview bar — shown when returning from step 2 */}
      {rawPayload && detectedFormat && (
        <div
          data-testid="load-page-candidate"
          className="w-full max-w-5xl mb-4 flex items-center gap-3 rounded-lg border border-border p-3"
        >
          <span className="text-xs text-muted-foreground">
            Previously selected:
          </span>
          <Badge
            intent={formatBadgeIntent(detectedFormat.kind)}
            variant="outline"
            size="small"
          >
            {formatLabel(detectedFormat.kind)}
          </Badge>
          <span className="text-xs font-mono text-foreground">
            {formatByteCount(rawPayload.bytes.length)}
          </span>
          <Button
            variant="secondary"
            size="sm"
            data-testid="load-page-candidate-continue"
            onClick={() => setStep(2)}
            className="cursor-pointer gap-1 ml-auto"
          >
            <ArrowRight className="w-3 h-3" />
            Continue
          </Button>
        </div>
      )}

      <div
        data-testid="load-page-columns"
        className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-[1fr_1fr] gap-8"
      >
        <div data-testid="load-page-left">
          <SourceStep onAdvance={handleAdvance} />
        </div>
        <div data-testid="load-page-right">
          <ExampleList onAdvance={handleAdvance} />
        </div>
      </div>
    </div>
  );
}
