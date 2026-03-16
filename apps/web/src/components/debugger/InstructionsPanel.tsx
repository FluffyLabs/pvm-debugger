import { useEffect, useRef } from "react";
import type { DecodedInstruction } from "../../hooks/useDisassembly";

interface InstructionsPanelProps {
  instructions: DecodedInstruction[];
  currentPc: number;
}

function padHexPc(pc: number, maxPc: number): string {
  const minWidth = maxPc > 0xffff ? Math.max(4, maxPc.toString(16).length) : 4;
  return pc.toString(16).toUpperCase().padStart(minWidth, "0");
}

export function InstructionsPanel({ instructions, currentPc }: InstructionsPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeRowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    activeRowRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [currentPc]);

  if (instructions.length === 0) {
    return (
      <div
        data-testid="instructions-panel"
        className="flex items-center justify-center h-full text-sm text-muted-foreground"
      >
        No program loaded
      </div>
    );
  }

  const maxPc = instructions[instructions.length - 1].pc;

  return (
    <div
      data-testid="instructions-panel"
      className="flex flex-col h-full overflow-hidden"
    >
      <div className="px-2 py-1 text-sm font-semibold text-foreground border-b border-border shrink-0">
        Instructions
      </div>
      <div ref={scrollRef} className="flex-1 overflow-auto font-mono text-xs">
        {instructions.map((instr) => {
          const isCurrent = instr.pc === currentPc;
          return (
            <div
              key={instr.pc}
              ref={isCurrent ? activeRowRef : undefined}
              data-testid={`instruction-row-${instr.pc}`}
              className={`flex gap-2 px-2 py-0.5 whitespace-nowrap ${
                isCurrent
                  ? "bg-primary/20 text-foreground"
                  : "text-muted-foreground hover:bg-muted/50"
              }`}
            >
              <span className="text-muted-foreground/70 select-none" data-testid="instruction-pc">
                {padHexPc(instr.pc, maxPc)}
              </span>
              <span className="text-foreground font-medium" data-testid="instruction-mnemonic">
                {instr.mnemonic}
              </span>
              {instr.args && (
                <span className="text-muted-foreground" data-testid="instruction-args">
                  {instr.args}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
