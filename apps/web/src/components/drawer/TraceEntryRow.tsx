import { getHostCallName } from "@pvmdbg/trace";
import type { TraceDisplayRow } from "./trace-display";
import { formatEntryLines, formatTerminationLines } from "./trace-display";

interface TraceEntryRowProps {
  row: TraceDisplayRow;
  isMismatched: boolean;
  isActive?: boolean;
}

export function TraceEntryRow({ row, isMismatched, isActive }: TraceEntryRowProps) {
  const lines =
    row.kind === "entry"
      ? formatEntryLines(row.entry)
      : formatTerminationLines(row.termination);

  const name =
    row.kind === "entry"
      ? getHostCallName(row.entry.index)
      : row.termination.kind;

  return (
    <div
      data-testid={
        row.kind === "entry"
          ? `trace-entry-${row.index}`
          : "trace-termination"
      }
      className={`px-2 py-1 border-b border-border/50 ${
        isActive ? "bg-blue-500/20 ring-1 ring-inset ring-blue-500/40" : ""
      } ${isMismatched ? "bg-red-900/30" : ""}`}
    >
      <div className="flex items-center gap-2">
        <span
          data-testid="trace-entry-badge"
          className="inline-block rounded bg-accent px-1.5 py-0.5 text-[10px] font-semibold text-accent-foreground"
        >
          {name}
        </span>
        {isMismatched && (
          <span
            data-testid="trace-mismatch-indicator"
            className="text-red-400 font-bold text-xs"
          >
            ≠
          </span>
        )}
      </div>
      <pre className="text-[11px] leading-tight whitespace-pre-wrap font-mono text-foreground mt-0.5">
        {lines.join("\n")}
      </pre>
    </div>
  );
}
