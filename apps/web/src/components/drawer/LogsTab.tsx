import { useRef, useEffect, useCallback } from "react";
import type { Orchestrator } from "@pvmdbg/orchestrator";
import { useLogMessages } from "../../hooks/useLogMessages";
import { LogEntry } from "./LogEntry";

interface LogsTabProps {
  orchestrator: Orchestrator | null;
  selectedPvmId: string | null;
  snapshotVersion: number;
}

/** Threshold (in px) from the bottom to consider the user "near the bottom". */
const AUTO_SCROLL_THRESHOLD = 40;

export function LogsTab({ orchestrator, selectedPvmId, snapshotVersion }: LogsTabProps) {
  const { messages, clear, copy } = useLogMessages(orchestrator, selectedPvmId, snapshotVersion);
  const scrollRef = useRef<HTMLDivElement>(null);
  const isNearBottomRef = useRef(true);

  // Track whether user is near bottom
  const onScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    isNearBottomRef.current = distanceFromBottom <= AUTO_SCROLL_THRESHOLD;
  }, []);

  const handleDownload = useCallback(() => {
    if (messages.length === 0) return;
    const lines = messages.map((msg) => `[Step ${msg.traceIndex}] ${msg.text}\n`);
    const text = lines.join("");
    const timestamp = Date.now();
    const filename = `log-messages-${timestamp}.log`;
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }, [messages]);

  // Auto-scroll when new messages arrive and user is near bottom
  useEffect(() => {
    if (isNearBottomRef.current && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div data-testid="logs-tab" className="flex flex-col h-full min-h-0">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-2 py-1 border-b border-border">
        <div className="flex-1" />
        <button
          data-testid="logs-copy-button"
          onClick={copy}
          disabled={messages.length === 0}
          className="px-2 py-0.5 text-xs rounded cursor-pointer bg-muted hover:bg-muted/80 text-foreground disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Copy
        </button>
        <button
          data-testid="logs-clear-button"
          onClick={clear}
          disabled={messages.length === 0}
          className="px-2 py-0.5 text-xs rounded cursor-pointer bg-muted hover:bg-muted/80 text-foreground disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Clear
        </button>
        <button
          data-testid="logs-download-button"
          onClick={handleDownload}
          disabled={messages.length === 0}
          className="px-2 py-0.5 text-xs rounded cursor-pointer bg-muted hover:bg-muted/80 text-foreground disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Download
        </button>
      </div>

      {/* Log output body */}
      <div
        ref={scrollRef}
        onScroll={onScroll}
        className="flex-1 overflow-y-auto px-3 py-2 min-h-0"
        data-testid="logs-body"
      >
        {messages.length === 0 ? (
          <p data-testid="logs-empty" className="text-xs text-muted-foreground">
            No log messages yet.
          </p>
        ) : (
          messages.map((msg, i) => <LogEntry key={`${msg.traceIndex}-${i}`} message={msg} />)
        )}
      </div>
    </div>
  );
}
