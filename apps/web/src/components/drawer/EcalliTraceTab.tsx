import { useState, useCallback, useRef, useMemo } from "react";
import type { EcalliTrace } from "@pvmdbg/types";
import type { Orchestrator } from "@pvmdbg/orchestrator";
import { TraceColumn } from "./TraceColumn";
import { mismatchedEntryIndices } from "./trace-display";

interface EcalliTraceTabProps {
  orchestrator: Orchestrator | null;
  selectedPvmId: string | null;
  /** Monotonic version counter — triggers re-read of traces from orchestrator. */
  snapshotVersion: number;
}

export function EcalliTraceTab({ orchestrator, selectedPvmId, snapshotVersion }: EcalliTraceTabProps) {
  const [linkScroll, setLinkScroll] = useState(false);

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

  return (
    <div data-testid="ecalli-trace-tab" className="flex flex-col h-full min-h-0">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-2 py-1 border-b border-border">
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
      </div>

      {/* Two-column layout */}
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
          emptyMessage="No reference trace loaded."
          scrollRef={rightRef}
          onScroll={onRightScroll}
        />
      </div>
    </div>
  );
}
