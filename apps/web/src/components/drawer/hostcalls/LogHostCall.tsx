import { useEffect, useState } from "react";
import type { HostCallInfo } from "@pvmdbg/types";
import type { Orchestrator } from "@pvmdbg/orchestrator";

interface LogHostCallProps {
  info: HostCallInfo;
  orchestrator: Orchestrator | null;
}

/** Try to decode bytes as UTF-8 text. */
function tryDecodeText(data: Uint8Array): string {
  try {
    return new TextDecoder("utf-8", { fatal: false }).decode(data);
  } catch {
    return "";
  }
}

/** Format bytes as hex string. */
function toHexString(data: Uint8Array): string {
  return (
    "0x" +
    Array.from(data)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
  );
}

/**
 * Log host call view (index 100).
 *
 * Log registers: ω7=level, ω8=target_ptr, ω9=target_len, ω10=msg_ptr, ω11=msg_len
 *
 * Decodes message text from trace memory reads (resumeProposal.memoryWrites)
 * when available, otherwise reads memory from the orchestrator using the
 * current register pointers.
 */
export function LogHostCall({ info, orchestrator }: LogHostCallProps) {
  const { currentState, resumeProposal } = info;
  const regs = currentState.registers;

  const level = Number(regs[7] ?? 0n);
  const targetPtr = Number(regs[8] ?? 0n);
  const targetLen = Number(regs[9] ?? 0n);
  const msgPtr = Number(regs[10] ?? 0n);
  const msgLen = Number(regs[11] ?? 0n);

  const [messageText, setMessageText] = useState<string | null>(null);
  const [messageHex, setMessageHex] = useState<string | null>(null);
  const [targetText, setTargetText] = useState<string | null>(null);

  useEffect(() => {
    // Try to decode from trace memory writes first (trace replay data)
    if (resumeProposal?.memoryWrites && resumeProposal.memoryWrites.length > 0) {
      // The trace may contain the memory segments we need
      for (const mw of resumeProposal.memoryWrites) {
        if (mw.address === msgPtr && mw.data.length >= msgLen) {
          const msgData = mw.data.slice(0, msgLen);
          setMessageText(tryDecodeText(msgData));
          setMessageHex(toHexString(msgData));
        }
        if (mw.address === targetPtr && mw.data.length >= targetLen) {
          setTargetText(tryDecodeText(mw.data.slice(0, targetLen)));
        }
      }
      return;
    }

    // Fall back to reading memory from orchestrator
    if (!orchestrator || !info.pvmId) return;
    let cancelled = false;

    const readMemory = async () => {
      try {
        if (msgLen > 0) {
          const msgData = await orchestrator.getMemory(info.pvmId, msgPtr, msgLen);
          if (cancelled) return;
          setMessageText(tryDecodeText(msgData));
          setMessageHex(toHexString(msgData));
        }
        if (targetLen > 0) {
          const tgtData = await orchestrator.getMemory(info.pvmId, targetPtr, targetLen);
          if (cancelled) return;
          setTargetText(tryDecodeText(tgtData));
        }
      } catch {
        // Memory read failed — leave null
      }
    };

    readMemory();
    return () => {
      cancelled = true;
    };
  }, [orchestrator, info.pvmId, resumeProposal, msgPtr, msgLen, targetPtr, targetLen]);

  const levelLabels: Record<number, string> = {
    0: "Error",
    1: "Warn",
    2: "Info",
    3: "Debug",
    4: "Trace",
  };
  const levelLabel = levelLabels[level] ?? `Level ${level}`;

  return (
    <div data-testid="log-host-call" className="flex flex-col gap-2 text-xs">
      <h4 className="text-sm font-semibold text-foreground">Log Message</h4>

      <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 font-mono">
        <span className="text-muted-foreground">Level:</span>
        <span className="text-foreground">{levelLabel}</span>

        {targetText !== null && (
          <>
            <span className="text-muted-foreground">Target:</span>
            <span className="text-foreground">{targetText}</span>
          </>
        )}
        {targetText === null && targetLen > 0 && (
          <>
            <span className="text-muted-foreground">Target:</span>
            <span className="text-muted-foreground italic">
              ptr=0x{targetPtr.toString(16)} len={targetLen}
            </span>
          </>
        )}
      </div>

      {messageText !== null && (
        <div className="mt-1 flex flex-col gap-1">
          <span className="text-muted-foreground">Message:</span>
          <pre
            data-testid="log-message-text"
            className="whitespace-pre-wrap break-all rounded bg-muted/40 px-2 py-1 text-foreground"
          >
            {messageText}
          </pre>
        </div>
      )}

      {messageHex !== null && (
        <div className="flex flex-col gap-1">
          <span className="text-muted-foreground">Raw hex:</span>
          <code className="break-all text-muted-foreground">{messageHex}</code>
        </div>
      )}

      {messageText === null && msgLen > 0 && (
        <div className="mt-1">
          <span className="text-muted-foreground italic">
            Message at ptr=0x{msgPtr.toString(16)} len={msgLen} (reading…)
          </span>
        </div>
      )}

      {msgLen === 0 && (
        <div className="mt-1">
          <span className="text-muted-foreground italic">No message content (length 0).</span>
        </div>
      )}
    </div>
  );
}
