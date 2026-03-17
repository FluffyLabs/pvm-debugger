import { useState, useCallback } from "react";
import { Badge, Button } from "@fluffylabs/shared-ui";
import { ArrowRight } from "lucide-react";
import type { RawPayload, DetectedFormat, ExampleEntry } from "@pvmdbg/content";
import { ExampleList } from "../components/load/ExampleList";
import { SourceStep } from "../components/load/SourceStep";
import { ConfigStep } from "../components/load/ConfigStep";
import { formatLabel, formatBadgeIntent, formatByteCount } from "../components/load/format";

export function LoadPage() {
  const [step, setStep] = useState<1 | 2>(1);
  const [rawPayload, setRawPayload] = useState<RawPayload | null>(null);
  const [detectedFormat, setDetectedFormat] = useState<DetectedFormat | null>(null);
  const [exampleEntry, setExampleEntry] = useState<ExampleEntry | null>(null);

  const handleAdvance = useCallback(
    (payload: RawPayload, format: DetectedFormat, example?: ExampleEntry) => {
      setRawPayload(payload);
      setDetectedFormat(format);
      setExampleEntry(example ?? null);
      setStep(2);
    },
    [],
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
    <div data-testid="load-page" className="flex flex-col items-center p-8 h-full overflow-auto">
      <h1 className="text-lg font-semibold text-foreground mb-1">Load Program</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Upload a file, fetch from URL, paste hex, or select an example to begin debugging.
      </p>

      {/* Candidate preview bar — shown when returning from step 2 */}
      {rawPayload && detectedFormat && (
        <div
          data-testid="load-page-candidate"
          className="w-full max-w-5xl mb-4 flex items-center gap-3 rounded-lg border border-border p-3"
        >
          <span className="text-xs text-muted-foreground">Previously selected:</span>
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
            variant="outline"
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
        className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-[1fr_2fr] gap-8"
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
