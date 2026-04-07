import type { Orchestrator } from "@pvmdbg/orchestrator";
import type { EcalliTrace } from "@pvmdbg/types";
import { useCallback, useEffect, useMemo, useState } from "react";
import { decodeLogMessage } from "../components/drawer/trace-display";

export interface LogMessage {
  /** Sequential position in the trace (0-based). */
  traceIndex: number;
  /** The decoded message text (UTF-8 or hex fallback). */
  text: string;
}

/** Extract log messages (ecalli index 100) from a recorded trace. */
function extractLogMessages(trace: EcalliTrace): LogMessage[] {
  const messages: LogMessage[] = [];
  for (let i = 0; i < trace.entries.length; i++) {
    const entry = trace.entries[i];
    if (entry.index === 100) {
      const text = decodeLogMessage(entry);
      messages.push({
        traceIndex: i,
        text: text ?? "(empty)",
      });
    }
  }
  return messages;
}

export interface UseLogMessagesResult {
  /** Visible log messages (after clear offset). */
  messages: LogMessage[];
  /** Clear visible messages (sets offset, does not mutate trace). */
  clear: () => void;
  /** Copy visible messages to clipboard as plain text. */
  copy: () => Promise<void>;
}

export function useLogMessages(
  orchestrator: Orchestrator | null,
  selectedPvmId: string | null,
  snapshotVersion: number,
): UseLogMessagesResult {
  const [clearOffset, setClearOffset] = useState(0);

  // Reset clear offset when PVM or orchestrator changes
  useEffect(() => {
    setClearOffset(0);
  }, [orchestrator, selectedPvmId]);

  // Extract all log messages from recorded trace
  const allMessages = useMemo(() => {
    if (!orchestrator || !selectedPvmId) return [];
    try {
      const trace = orchestrator.getRecordedTrace(selectedPvmId);
      return extractLogMessages(trace);
    } catch {
      return [];
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orchestrator, selectedPvmId, snapshotVersion]);

  // Visible messages = all messages after the clear offset
  const messages = useMemo(() => {
    return allMessages.slice(clearOffset);
  }, [allMessages, clearOffset]);

  const clear = useCallback(() => {
    setClearOffset(allMessages.length);
  }, [allMessages]);

  const copy = useCallback(async () => {
    const lines = messages.map((m) => `[Step ${m.traceIndex}] ${m.text}`);
    const text = lines.join("\n");
    await navigator.clipboard.writeText(text);
  }, [messages]);

  return { messages, clear, copy };
}
