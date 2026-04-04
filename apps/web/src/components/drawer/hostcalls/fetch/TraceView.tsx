import { toHex } from "@pvmdbg/types";

interface TraceViewProps {
  traceData: Uint8Array;
  traceTotalLength: number;
}

/**
 * Read-only display of trace memory write data.
 * Shows partial response detection when traceData.length !== traceTotalLength.
 */
export function TraceView({ traceData, traceTotalLength }: TraceViewProps) {
  const isPartial = traceData.length !== traceTotalLength;

  return (
    <div data-testid="trace-view" className="flex flex-col gap-2 text-xs">
      <div className="font-mono text-muted-foreground">
        {traceData.length} byte{traceData.length !== 1 ? "s" : ""} written
        {isPartial && (
          <span data-testid="trace-partial" className="ml-1 text-amber-400">
            (partial — full response was {traceTotalLength}B)
          </span>
        )}
      </div>
      <div
        data-testid="trace-hex"
        className="max-h-[200px] overflow-auto rounded border border-border bg-muted/30 px-2 py-1 font-mono text-xs break-all"
      >
        {traceData.length > 0 ? toHex(traceData) : <span className="text-muted-foreground italic">empty</span>}
      </div>
    </div>
  );
}
