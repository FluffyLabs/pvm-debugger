import type { LogMessage } from "../../hooks/useLogMessages";

interface LogEntryProps {
  message: LogMessage;
}

export function LogEntry({ message }: LogEntryProps) {
  return (
    <div
      data-testid="log-entry"
      className="flex gap-2 py-0.5 text-xs font-mono"
    >
      <span className="text-muted-foreground shrink-0">
        [Step {message.traceIndex}]
      </span>
      <span className="text-foreground break-all">{message.text}</span>
    </div>
  );
}
