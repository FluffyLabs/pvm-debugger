import { useCallback, useEffect, useRef, useState } from "react";
import type { DecodedInstruction } from "../../hooks/useDisassembly";
import type { Orchestrator } from "@pvmdbg/orchestrator";
import { InstructionRow } from "./InstructionRow";

interface InstructionsPanelProps {
  instructions: DecodedInstruction[];
  currentPc: number;
  orchestrator: Orchestrator | null;
}

export function InstructionsPanel({ instructions, currentPc, orchestrator }: InstructionsPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeRowRef = useRef<HTMLDivElement>(null);
  const [breakpoints, setBreakpoints] = useState<Set<number>>(new Set());

  // Rehydrate breakpoints from orchestrator when it changes
  useEffect(() => {
    if (orchestrator) {
      const existing = orchestrator.getBreakpoints();
      setBreakpoints(new Set(existing));
    } else {
      setBreakpoints(new Set());
    }
  }, [orchestrator]);

  const toggleBreakpoint = useCallback(
    (pc: number) => {
      setBreakpoints((prev) => {
        const next = new Set(prev);
        if (next.has(pc)) {
          next.delete(pc);
        } else {
          next.add(pc);
        }
        orchestrator?.setBreakpoints([...next]);
        return next;
      });
    },
    [orchestrator],
  );

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
  const padWidth = maxPc > 0xffff ? Math.max(4, maxPc.toString(16).length) : 4;

  return (
    <div
      data-testid="instructions-panel"
      className="flex flex-col h-full overflow-hidden"
    >
      <div className="px-2 py-1 text-sm font-semibold text-foreground border-b border-border shrink-0">
        Instructions
      </div>
      <div ref={scrollRef} data-testid="instructions-scroll" className="flex-1 overflow-auto font-mono text-xs">
        {instructions.map((instr) => {
          const isCurrent = instr.pc === currentPc;
          return (
            <div key={instr.pc} ref={isCurrent ? activeRowRef : undefined}>
              <InstructionRow
                instruction={instr}
                isCurrent={isCurrent}
                isBreakpoint={breakpoints.has(instr.pc)}
                padWidth={padWidth}
                onToggleBreakpoint={toggleBreakpoint}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
