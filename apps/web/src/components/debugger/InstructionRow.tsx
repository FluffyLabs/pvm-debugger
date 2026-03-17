import { memo } from "react";
import type { DecodedInstruction } from "../../hooks/useDisassembly";

interface InstructionRowProps {
  instruction: DecodedInstruction;
  isCurrent: boolean;
  isBreakpoint: boolean;
  padWidth: number;
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
  onToggleBreakpoint,
}: InstructionRowProps) {
  return (
    <div
      data-testid={`instruction-row-${instruction.pc}`}
      className={`flex items-center gap-2 px-2 py-0.5 whitespace-nowrap ${
        isCurrent
          ? "bg-primary/20 text-foreground"
          : "text-muted-foreground hover:bg-muted/50"
      }`}
    >
      <span
        data-testid={`breakpoint-gutter-${instruction.pc}`}
        className="group/bp w-3 h-3 flex items-center justify-center cursor-pointer shrink-0 select-none"
        role="button"
        aria-label={isBreakpoint ? `Remove breakpoint at ${instruction.pc}` : `Set breakpoint at ${instruction.pc}`}
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
      </span>
      <span className="text-muted-foreground/70 select-none" data-testid="instruction-pc">
        {padHexPc(instruction.pc, padWidth)}
      </span>
      <span className="text-foreground font-medium" data-testid="instruction-mnemonic">
        {instruction.mnemonic}
      </span>
      {instruction.args && (
        <span className="text-muted-foreground" data-testid="instruction-args">
          {instruction.args}
        </span>
      )}
    </div>
  );
});
