import { Popover, PopoverContent, PopoverTrigger } from "@fluffylabs/shared-ui";
import { memo } from "react";
import type { DecodedInstruction } from "../../hooks/useDisassembly";
import { InstructionBinary } from "./InstructionBinary";
import { bytesToHex } from "./value-format";

export type DisplayMode = "asm" | "raw";

interface InstructionRowProps {
  instruction: DecodedInstruction;
  isCurrent: boolean;
  isBreakpoint: boolean;
  padWidth: number;
  displayMode: DisplayMode;
  onToggleBreakpoint: (pc: number) => void;
}

function padHexPc(pc: number, padWidth: number): string {
  return pc.toString(16).toUpperCase().padStart(padWidth, "0");
}

export const InstructionRow = memo(function InstructionRow({
  instruction,
  isCurrent,
  isBreakpoint,
  padWidth,
  displayMode,
  onToggleBreakpoint,
}: InstructionRowProps) {
  return (
    <Popover>
      <div
        data-testid={`instruction-row-${instruction.pc}`}
        className={`flex items-center gap-2 px-2 py-0.5 whitespace-nowrap ${
          isCurrent
            ? "instruction-row-current"
            : "text-muted-foreground hover:bg-muted/50"
        }`}
        style={
          isCurrent
            ? {
                backgroundColor: "var(--instruction-current-bg, #E4FFFD)",
                color: "var(--instruction-current-text, #17AFA3)",
              }
            : undefined
        }
      >
        <button
          type="button"
          data-testid={`breakpoint-gutter-${instruction.pc}`}
          className="group/bp w-3 h-3 flex items-center justify-center cursor-pointer shrink-0 select-none bg-transparent border-none p-0"
          aria-label={
            isBreakpoint
              ? `Remove breakpoint at ${instruction.pc}`
              : `Set breakpoint at ${instruction.pc}`
          }
          onClick={() => onToggleBreakpoint(instruction.pc)}
        >
          {isBreakpoint ? (
            <span
              data-testid={`breakpoint-dot-${instruction.pc}`}
              className="block w-2.5 h-2.5 rounded-full bg-red-500"
            />
          ) : (
            <span className="block w-2.5 h-2.5 rounded-full opacity-0 group-hover/bp:opacity-30 bg-red-500 transition-opacity" />
          )}
        </button>
        <PopoverTrigger asChild>
          <span
            className="flex items-center gap-2 cursor-pointer flex-1 min-w-0"
            data-testid={`instruction-trigger-${instruction.pc}`}
          >
            <span
              className="text-muted-foreground/70 select-none"
              data-testid="instruction-pc"
            >
              {padHexPc(instruction.pc, padWidth)}
            </span>
            {displayMode === "asm" ? (
              <>
                <span
                  className={isCurrent ? "font-bold" : "font-medium"}
                  style={
                    isCurrent
                      ? { color: "var(--instruction-current-text, #17AFA3)" }
                      : { color: "var(--color-foreground)" }
                  }
                  data-testid="instruction-mnemonic"
                >
                  {instruction.mnemonic.toUpperCase()}
                </span>
                {instruction.args && (
                  <span
                    className="text-muted-foreground"
                    data-testid="instruction-args"
                  >
                    {instruction.args}
                  </span>
                )}
              </>
            ) : (
              <>
                <span
                  className="text-foreground/70"
                  data-testid="instruction-raw-bytes"
                >
                  {bytesToHex(instruction.rawBytes)}
                </span>
                {instruction.rawArgs && (
                  <span
                    className="text-muted-foreground"
                    data-testid="instruction-raw-args"
                  >
                    {instruction.rawArgs}
                  </span>
                )}
              </>
            )}
          </span>
        </PopoverTrigger>
      </div>
      <PopoverContent side="right" align="start" size="small">
        <InstructionBinary instruction={instruction} />
      </PopoverContent>
    </Popover>
  );
});
