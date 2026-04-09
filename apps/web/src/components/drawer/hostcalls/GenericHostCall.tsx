import type { HostCallInfo } from "@pvmdbg/types";
import { useEffect, useMemo, useState } from "react";
import { useStableCallback } from "../../../hooks/useStableCallback";
import type { HostCallEffects } from "../../../lib/fetch-utils";

interface GenericHostCallProps {
  info: HostCallInfo;
  onEffectsReady: (effects: HostCallEffects) => void;
  /** Incrementing counter to reset to trace state. */
  traceVersion: number;
}

type ParsedCommand =
  | { kind: "setreg"; regIndex: number; value: bigint }
  | { kind: "memwrite"; address: number; data: Uint8Array }
  | { kind: "setgas"; gas: bigint };

interface ParseError {
  line: number;
  message: string;
}

function parseCommand(
  text: string,
  lineNum: number,
): ParsedCommand | ParseError {
  const trimmed = text.trim();

  // setreg r07 <- 0x2a
  const setregMatch = trimmed.match(/^setreg\s+r(\d+)\s*<-\s*(.+)$/i);
  if (setregMatch) {
    const regIndex = parseInt(setregMatch[1], 10);
    if (regIndex < 0 || regIndex > 12) {
      return {
        line: lineNum,
        message: `Line ${lineNum}: Register index ${regIndex} out of range (0-12)`,
      };
    }
    try {
      const value = BigInt(setregMatch[2].trim());
      return { kind: "setreg", regIndex, value };
    } catch {
      return {
        line: lineNum,
        message: `Line ${lineNum}: Invalid value "${setregMatch[2].trim()}"`,
      };
    }
  }

  // memwrite 0x00001000 len=4 <- 0xaabbccdd
  const memMatch = trimmed.match(
    /^memwrite\s+(0x[\da-fA-F]+)\s+len=(\d+)\s*<-\s*(0x[\da-fA-F]*)$/i,
  );
  if (memMatch) {
    const address = parseInt(memMatch[1], 16);
    const len = parseInt(memMatch[2], 10);
    const hexStr = memMatch[3].slice(2); // remove 0x
    if (hexStr.length !== len * 2) {
      return {
        line: lineNum,
        message: `Line ${lineNum}: len=${len} does not match hex data length ${hexStr.length / 2}`,
      };
    }
    const data = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      data[i] = parseInt(hexStr.slice(i * 2, i * 2 + 2), 16);
    }
    return { kind: "memwrite", address, data };
  }

  // setgas <- 500000
  const gasMatch = trimmed.match(/^setgas\s*<-\s*(.+)$/i);
  if (gasMatch) {
    try {
      const gas = BigInt(gasMatch[1].trim());
      return { kind: "setgas", gas };
    } catch {
      return {
        line: lineNum,
        message: `Line ${lineNum}: Invalid gas value "${gasMatch[1].trim()}"`,
      };
    }
  }

  return {
    line: lineNum,
    message: `Line ${lineNum}: Malformed command: "${trimmed}"`,
  };
}

/** Parse all command lines, returning effects and any errors. */
export function parseAllCommands(text: string): {
  effects: HostCallEffects;
  errors: string[];
} {
  const lines = text.split("\n");
  const regWrites = new Map<number, bigint>();
  const memWrites: Array<{ address: number; data: Uint8Array }> = [];
  let gasAfter: bigint | undefined;
  const errors: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line === "" || line.startsWith("#")) continue; // skip blanks and comments

    const result = parseCommand(line, i + 1);
    if ("line" in result) {
      errors.push(result.message);
    } else if (result.kind === "setreg") {
      regWrites.set(result.regIndex, result.value);
    } else if (result.kind === "memwrite") {
      memWrites.push({ address: result.address, data: result.data });
    } else if (result.kind === "setgas") {
      gasAfter = result.gas;
    }
  }

  // Sort register writes by index for consistent output
  const sortedRegs = new Map(
    [...regWrites.entries()].sort(([a], [b]) => a - b),
  );

  return {
    effects: { registerWrites: sortedRegs, memoryWrites: memWrites, gasAfter },
    errors,
  };
}

/** Build initial text from trace proposal. */
function proposalToText(info: HostCallInfo): string {
  const proposal = info.resumeProposal;
  if (!proposal) return "";

  const lines: string[] = [];

  // Sort register writes by index
  const sortedRegs = [...proposal.registerWrites.entries()].sort(
    ([a], [b]) => a - b,
  );
  for (const [idx, val] of sortedRegs) {
    lines.push(
      `setreg r${String(idx).padStart(2, "0")} <- 0x${val.toString(16)}`,
    );
  }

  for (const mw of proposal.memoryWrites) {
    const hexData = Array.from(mw.data)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    lines.push(
      `memwrite 0x${mw.address.toString(16).padStart(8, "0")} len=${mw.data.length} <- 0x${hexData}`,
    );
  }

  if (proposal.gasAfter !== undefined) {
    lines.push(`setgas <- ${proposal.gasAfter.toString()}`);
  }

  return lines.join("\n");
}

export function GenericHostCall({
  info,
  onEffectsReady,
  traceVersion: _traceVersion,
}: GenericHostCallProps) {
  const initialText = useMemo(() => proposalToText(info), [info]);
  const [text, setText] = useState(initialText);

  // Reset to trace state when traceVersion changes
  useEffect(() => {
    setText(proposalToText(info));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [info]);

  const stableOnEffects = useStableCallback(onEffectsReady);

  // Parse and report effects on every text change
  const { errors } = useMemo(() => parseAllCommands(text), [text]);

  useEffect(() => {
    const { effects } = parseAllCommands(text);
    stableOnEffects(effects);
  }, [text, stableOnEffects]);

  return (
    <div
      data-testid="generic-host-call"
      className="flex flex-col gap-2 text-xs"
    >
      <p className="text-muted-foreground italic">
        Edit commands below. Lines starting with # are comments.
      </p>
      <textarea
        data-testid="generic-commands-textarea"
        className="w-full min-h-[120px] rounded border border-border bg-background px-2 py-1.5 font-mono text-xs text-foreground resize-y"
        value={text}
        onChange={(e) => setText(e.target.value)}
        spellCheck={false}
      />
      {errors.length > 0 && (
        <div
          data-testid="generic-errors"
          className="text-red-400 text-xs space-y-0.5"
        >
          {errors.map((err, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: index is the only stable key
            <div key={i}>{err}</div>
          ))}
        </div>
      )}
    </div>
  );
}
