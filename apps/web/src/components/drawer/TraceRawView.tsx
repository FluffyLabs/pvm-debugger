import { serializeTrace } from "@pvmdbg/trace";
import type { EcalliTrace } from "@pvmdbg/types";
import { useCallback, useMemo, useRef } from "react";

interface TraceRawViewProps {
  recorded: EcalliTrace | undefined;
  reference: EcalliTrace | undefined;
  linkScroll?: boolean;
}

export function TraceRawView({
  recorded,
  reference,
  linkScroll,
}: TraceRawViewProps) {
  const recordedText = useMemo(
    () => (recorded ? serializeTrace(recorded) : ""),
    [recorded],
  );
  const referenceText = useMemo(
    () => (reference ? serializeTrace(reference) : ""),
    [reference],
  );

  const leftRef = useRef<HTMLTextAreaElement>(null);
  const rightRef = useRef<HTMLTextAreaElement>(null);
  const scrollingRef = useRef(false);

  const onLeftScroll = useCallback(() => {
    if (!linkScroll || scrollingRef.current) return;
    scrollingRef.current = true;
    if (leftRef.current && rightRef.current) {
      rightRef.current.scrollTop = leftRef.current.scrollTop;
    }
    requestAnimationFrame(() => {
      scrollingRef.current = false;
    });
  }, [linkScroll]);

  const onRightScroll = useCallback(() => {
    if (!linkScroll || scrollingRef.current) return;
    scrollingRef.current = true;
    if (rightRef.current && leftRef.current) {
      leftRef.current.scrollTop = rightRef.current.scrollTop;
    }
    requestAnimationFrame(() => {
      scrollingRef.current = false;
    });
  }, [linkScroll]);

  return (
    <div
      className="flex flex-1 min-h-0 divide-x divide-border"
      data-testid="trace-raw-view"
    >
      <div className="flex-1 min-w-0 flex flex-col">
        <div className="px-2 py-1 text-xs font-normal text-foreground border-b border-border bg-muted/30">
          Execution Trace
        </div>
        <textarea
          ref={leftRef}
          data-testid="trace-raw-execution"
          readOnly
          value={recordedText}
          placeholder="No entries recorded yet."
          onScroll={onLeftScroll}
          className="flex-1 w-full resize-none bg-transparent font-mono text-xs p-2 text-foreground focus:outline-none"
        />
      </div>
      <div className="flex-1 min-w-0 flex flex-col">
        <div className="px-2 py-1 text-xs font-normal text-foreground border-b border-border bg-muted/30">
          Reference Trace
        </div>
        <textarea
          ref={rightRef}
          data-testid="trace-raw-reference"
          readOnly
          value={referenceText}
          placeholder="No reference trace loaded."
          onScroll={onRightScroll}
          className="flex-1 w-full resize-none bg-transparent font-mono text-xs p-2 text-foreground focus:outline-none"
        />
      </div>
    </div>
  );
}
