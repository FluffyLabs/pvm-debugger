import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Play, StepForward, SkipForward } from "lucide-react";
import { HostCallHandler, HostCallHandlerProps } from "./types";

enum LogLevel {
  ERROR = 0,
  WARNING = 1,
  INFO = 2,
  DEBUG = 3,
  NIT = 4,
  UNKNOWN = 5,
}

const LOG_LEVEL_STYLES: Record<LogLevel, string> = {
  [LogLevel.ERROR]: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  [LogLevel.WARNING]: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  [LogLevel.INFO]: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  [LogLevel.DEBUG]: "bg-gray-100 text-gray-800 dark:bg-gray-800/50 dark:text-gray-300",
  [LogLevel.NIT]: "bg-gray-100 text-gray-600 dark:bg-gray-800/30 dark:text-gray-400",
  [LogLevel.UNKNOWN]: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
};

function getLogLevelName(level: number): string {
  if (level >= 0 && level <= 4) {
    return LogLevel[level];
  }
  return `UNKNOWN(${level})`;
}

function getLogLevelStyle(level: number): string {
  if (level >= 0 && level <= 4) {
    return LOG_LEVEL_STYLES[level as LogLevel];
  }
  return LOG_LEVEL_STYLES[LogLevel.UNKNOWN];
}

const decoder = new TextDecoder("utf8");

// eslint-disable-next-line react-refresh/only-export-components
const LogHostCallComponent: React.FC<HostCallHandlerProps> = ({ currentState, isLoading, readMemory, onResume }) => {
  const [target, setTarget] = useState<string>("");
  const [message, setMessage] = useState<string>("");
  const [isLoadingMemory, setIsLoadingMemory] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const regs = currentState.regs;
  const logLevel = regs ? Number(regs[7] ?? 0n) : 0;
  const targetStart = regs ? Number(regs[8] ?? 0n) : 0;
  const targetLength = regs ? Number(regs[9] ?? 0n) : 0;
  const msgStart = regs ? Number(regs[10] ?? 0n) : 0;
  const msgLength = regs ? Number(regs[11] ?? 0n) : 0;

  useEffect(() => {
    const loadMemory = async () => {
      setIsLoadingMemory(true);
      setError(null);
      try {
        // Read target string from memory
        if (targetStart !== 0 && targetLength > 0) {
          const targetBytes = await readMemory(targetStart, targetLength);
          setTarget(decoder.decode(targetBytes));
        } else {
          setTarget("");
        }

        // Read message string from memory
        if (msgLength > 0) {
          const msgBytes = await readMemory(msgStart, msgLength);
          setMessage(decoder.decode(msgBytes));
        } else {
          setMessage("");
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to read memory");
      } finally {
        setIsLoadingMemory(false);
      }
    };

    loadMemory();
  }, [targetStart, targetLength, msgStart, msgLength, readMemory]);

  const handleResume = (mode: "step" | "block" | "run") => {
    // For log host call, we just continue without modifying registers
    // The PVM will handle setting the result register
    onResume(mode);
  };

  return (
    <div className="space-y-4">
      {/* Log Level */}
      <div className="flex items-center gap-2">
        <span className="font-medium text-sm">Level:</span>
        <span className={`px-2 py-1 rounded text-xs font-mono ${getLogLevelStyle(logLevel)}`}>
          {getLogLevelName(logLevel)}
        </span>
      </div>

      {/* Target */}
      {target && (
        <div className="space-y-1">
          <span className="font-medium text-sm">Target:</span>
          <div className="p-2 bg-muted rounded-md font-mono text-sm">{target}</div>
        </div>
      )}

      {/* Message */}
      <div className="space-y-1">
        <span className="font-medium text-sm">Message:</span>
        {isLoadingMemory ? (
          <div className="p-3 bg-muted rounded-md text-sm text-muted-foreground">Loading message...</div>
        ) : error ? (
          <div className="p-3 bg-destructive/10 text-destructive rounded-md text-sm">{error}</div>
        ) : (
          <div className="p-3 bg-muted rounded-md font-mono text-sm whitespace-pre-wrap break-all">
            {message || <span className="text-muted-foreground">(empty)</span>}
          </div>
        )}
      </div>

      {/* Memory addresses info */}
      <div className="text-xs text-muted-foreground space-y-1">
        <div>
          Target: 0x{targetStart.toString(16)} ({targetLength} bytes)
        </div>
        <div>
          Message: 0x{msgStart.toString(16)} ({msgLength} bytes)
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2 pt-2">
        <Button variant="secondary" onClick={() => handleResume("run")} disabled={isLoading || isLoadingMemory}>
          <Play className="w-3.5 mr-1.5" />
          Run
        </Button>
        <Button variant="secondary" onClick={() => handleResume("step")} disabled={isLoading || isLoadingMemory}>
          <StepForward className="w-3.5 mr-1.5" />
          Step
        </Button>
        <Button variant="secondary" onClick={() => handleResume("block")} disabled={isLoading || isLoadingMemory}>
          <SkipForward className="w-3.5 mr-1.5" />
          Block
        </Button>
      </div>
    </div>
  );
};

export const LogHostCall: HostCallHandler = {
  index: 100,
  name: "log",
  hasCustomUI: true,
  Component: LogHostCallComponent,
};
