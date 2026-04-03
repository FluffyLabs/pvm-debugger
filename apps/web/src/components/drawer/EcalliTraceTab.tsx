import { useState, useCallback, useRef, useMemo } from "react";
import type { EcalliTrace, HostCallInfo } from "@pvmdbg/types";
import { serializeTrace } from "@pvmdbg/trace";
import type { Orchestrator } from "@pvmdbg/orchestrator";
import { TraceColumn } from "./TraceColumn";
import { TraceRawView } from "./TraceRawView";
import { mismatchedEntryIndices } from "./trace-display";

interface EcalliTraceTabProps {
  orchestrator: Orchestrator | null;
  selectedPvmId: string | null;
  /** Monotonic version counter — triggers re-read of traces from orchestrator. */
  snapshotVersion: number;
  /** Currently active host call, if any. Used to highlight the active reference trace entry. */
  activeHostCall: HostCallInfo | null;
}

type ViewMode = "formatted" | "raw";

export function EcalliTraceTab({ orchestrator, selectedPvmId, snapshotVersion, activeHostCall }: EcalliTraceTabProps) {
  const [linkScroll, setLinkScroll] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("formatted");

  const leftRef = useRef<HTMLDivElement>(null);
  const rightRef = useRef<HTMLDivElement>(null);
  const scrollingRef = useRef(false);

  // Read traces from orchestrator (re-evaluated when snapshotVersion changes)
  const { recorded, reference } = useMemo(() => {
    if (!orchestrator || !selectedPvmId) {
      return { recorded: undefined, reference: undefined };
    }
    try {
      const rec = orchestrator.getRecordedTrace(selectedPvmId);
      const ref = orchestrator.getReferenceTrace(selectedPvmId);
      return { recorded: rec, reference: ref };
    } catch {
      return { recorded: undefined, reference: undefined };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orchestrator, selectedPvmId, snapshotVersion]);

  // Compute mismatched entry indices
  const mismatchedIndices = useMemo(() => {
    if (!recorded || !reference) return new Set<number>();
    return mismatchedEntryIndices(recorded, reference);
  }, [recorded, reference]);

  // Compute active entry index for reference trace highlight.
  // The active host call's sequential index = recorded.entries.length
  // (the current host call hasn't been recorded yet).
  const activeEntryIndex = useMemo(() => {
    if (!activeHostCall || !recorded) return undefined;
    return recorded.entries.length;
  }, [activeHostCall, recorded]);

  // Linked scroll handlers
  const onLeftScroll = useCallback(
    (scrollTop: number) => {
      if (!linkScroll || scrollingRef.current) return;
      scrollingRef.current = true;
      rightRef.current?.scrollTo({ top: scrollTop });
      requestAnimationFrame(() => {
        scrollingRef.current = false;
      });
    },
    [linkScroll],
  );

  const onRightScroll = useCallback(
    (scrollTop: number) => {
      if (!linkScroll || scrollingRef.current) return;
      scrollingRef.current = true;
      leftRef.current?.scrollTo({ top: scrollTop });
      requestAnimationFrame(() => {
        scrollingRef.current = false;
      });
    },
    [linkScroll],
  );

  const handleDownload = useCallback(() => {
    if (!recorded) return;
    const text = serializeTrace(recorded);
    const timestamp = Date.now();
    const filename = `execution-trace-${timestamp}.log`;
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }, [recorded]);

  return (
    <div data-testid="ecalli-trace-tab" className="flex flex-col h-full min-h-0">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-2 py-1 border-b border-border">
        {/* Formatted / Raw toggle */}
        <div className="flex items-center gap-1 text-xs" data-testid="view-mode-toggle">
          <button
            data-testid="view-mode-formatted"
            onClick={() => setViewMode("formatted")}
            className={`px-2 py-0.5 rounded cursor-pointer ${
              viewMode === "formatted"
                ? "bg-primary text-primary-foreground font-semibold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Formatted
          </button>
          <button
            data-testid="view-mode-raw"
            onClick={() => setViewMode("raw")}
            className={`px-2 py-0.5 rounded cursor-pointer ${
              viewMode === "raw"
                ? "bg-primary text-primary-foreground font-semibold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Raw
          </button>
        </div>

        {/* Link scroll */}
        <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer select-none">
          <input
            data-testid="link-scroll-toggle"
            type="checkbox"
            checked={linkScroll}
            onChange={(e) => setLinkScroll(e.target.checked)}
            className="cursor-pointer"
          />
          Link scroll
        </label>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Download button */}
        <button
          data-testid="download-trace-button"
          onClick={handleDownload}
          disabled={!recorded}
          className="px-2 py-0.5 text-xs rounded cursor-pointer bg-muted hover:bg-muted/80 text-foreground disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Download
        </button>
      </div>

      {/* Content area */}
      {viewMode === "formatted" ? (
        <div className="flex flex-1 min-h-0 divide-x divide-border">
          <TraceColumn
            title="Execution Trace"
            trace={recorded}
            mismatchedIndices={mismatchedIndices}
            emptyMessage="No entries recorded yet."
            scrollRef={leftRef}
            onScroll={onLeftScroll}
          />
          <TraceColumn
            title="Reference Trace"
            trace={reference}
            mismatchedIndices={mismatchedIndices}
            activeEntryIndex={activeEntryIndex}
            emptyMessage="No reference trace loaded."
            scrollRef={rightRef}
            onScroll={onRightScroll}
          />
        </div>
      ) : (
        <TraceRawView recorded={recorded} reference={reference} linkScroll={linkScroll} />
      )}
    </div>
  );
}
