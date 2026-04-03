import { useRef, useCallback, type UIEvent } from "react";
import type { EcalliTrace } from "@pvmdbg/types";
import { TraceEntryRow } from "./TraceEntryRow";
import { traceToRows } from "./trace-display";

interface TraceColumnProps {
  title: string;
  trace: EcalliTrace | undefined;
  mismatchedIndices: Set<number>;
  /** Index of the currently active entry to highlight. */
  activeEntryIndex?: number;
  emptyMessage?: string;
  scrollRef?: React.RefObject<HTMLDivElement | null>;
  onScroll?: (scrollTop: number) => void;
}

export function TraceColumn({
  title,
  trace,
  mismatchedIndices,
  activeEntryIndex,
  emptyMessage,
  scrollRef,
  onScroll,
}: TraceColumnProps) {
  const internalRef = useRef<HTMLDivElement>(null);
  const ref = scrollRef ?? internalRef;

  const handleScroll = useCallback(
    (e: UIEvent<HTMLDivElement>) => {
      if (onScroll) {
        onScroll((e.target as HTMLDivElement).scrollTop);
      }
    },
    [onScroll],
  );

  const rows = trace ? traceToRows(trace) : [];

  return (
    <div className="flex-1 min-w-0 flex flex-col" data-testid={`trace-column-${title.toLowerCase().replace(/\s+/g, "-")}`}>
      <div className="px-2 py-1 text-xs font-semibold text-foreground border-b border-border bg-muted/30">
        {title}
      </div>
      <div
        ref={ref}
        className="flex-1 overflow-y-auto font-mono text-xs"
        onScroll={handleScroll}
      >
        {rows.length === 0 ? (
          <div
            data-testid="trace-empty-message"
            className="px-2 py-4 text-xs text-muted-foreground italic"
          >
            {emptyMessage ?? "No trace entries."}
          </div>
        ) : (
          rows.map((row) => (
            <TraceEntryRow
              key={row.kind === "entry" ? `e-${row.index}` : "term"}
              row={row}
              isMismatched={
                row.kind === "entry" && mismatchedIndices.has(row.index)
              }
              isActive={
                row.kind === "entry" && activeEntryIndex !== undefined && row.index === activeEntryIndex
              }
            />
          ))
        )}
      </div>
    </div>
  );
}
