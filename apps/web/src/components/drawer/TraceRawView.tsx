import type { EcalliTrace } from "@pvmdbg/types";
import { serializeTrace } from "@pvmdbg/trace";
import { useMemo } from "react";

interface TraceRawViewProps {
  recorded: EcalliTrace | undefined;
  reference: EcalliTrace | undefined;
}

export function TraceRawView({ recorded, reference }: TraceRawViewProps) {
  const recordedText = useMemo(
    () => (recorded ? serializeTrace(recorded) : ""),
    [recorded],
  );
  const referenceText = useMemo(
    () => (reference ? serializeTrace(reference) : ""),
    [reference],
  );

  return (
    <div className="flex flex-1 min-h-0 divide-x divide-border" data-testid="trace-raw-view">
      <div className="flex-1 min-w-0 flex flex-col">
        <div className="px-2 py-1 text-xs font-semibold text-foreground border-b border-border bg-muted/30">
          Execution Trace
        </div>
        <textarea
          data-testid="trace-raw-execution"
          readOnly
          value={recordedText}
          placeholder="No entries recorded yet."
          className="flex-1 w-full resize-none bg-transparent font-mono text-xs p-2 text-foreground focus:outline-none"
        />
      </div>
      <div className="flex-1 min-w-0 flex flex-col">
        <div className="px-2 py-1 text-xs font-semibold text-foreground border-b border-border bg-muted/30">
          Reference Trace
        </div>
        <textarea
          data-testid="trace-raw-reference"
          readOnly
          value={referenceText}
          placeholder="No reference trace loaded."
          className="flex-1 w-full resize-none bg-transparent font-mono text-xs p-2 text-foreground focus:outline-none"
        />
      </div>
    </div>
  );
}
