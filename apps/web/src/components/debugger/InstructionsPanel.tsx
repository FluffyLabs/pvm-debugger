import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import type { DecodedInstruction } from "../../hooks/useDisassembly";
import type { Orchestrator } from "@pvmdbg/orchestrator";
import { useBasicBlocks } from "../../hooks/useBasicBlocks";
import type { VirtualRow } from "../../hooks/useBasicBlocks";
import { InstructionRow } from "./InstructionRow";
import { BlockHeader } from "./BlockHeader";

const HEADER_HEIGHT = 28;
const ROW_HEIGHT = 24;

interface InstructionsPanelProps {
  instructions: DecodedInstruction[];
  currentPc: number;
  orchestrator: Orchestrator | null;
}

export function InstructionsPanel({ instructions, currentPc, orchestrator }: InstructionsPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [breakpoints, setBreakpoints] = useState<Set<number>>(new Set());

  const { rows, toggleBlock } = useBasicBlocks(instructions, currentPc);

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

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: (index) => (rows[index].kind === "header" ? HEADER_HEIGHT : ROW_HEIGHT),
    overscan: 15,
  });

  // Scroll to the current PC row when it changes
  useEffect(() => {
    if (instructions.length === 0) return;
    const idx = rows.findIndex(
      (r) => r.kind === "instruction" && r.instruction.pc === currentPc,
    );
    if (idx >= 0) {
      virtualizer.scrollToIndex(idx, { align: "auto", behavior: "smooth" });
    }
  }, [currentPc, rows, instructions.length, virtualizer]);

  const padWidth = useMemo(() => {
    if (instructions.length === 0) return 4;
    const maxPc = instructions[instructions.length - 1].pc;
    return maxPc > 0xffff ? Math.max(4, maxPc.toString(16).length) : 4;
  }, [instructions]);

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

  return (
    <div
      data-testid="instructions-panel"
      className="flex flex-col h-full overflow-hidden"
    >
      <div className="px-2 py-1 text-sm font-semibold text-foreground border-b border-border shrink-0">
        Instructions
      </div>
      <div
        ref={scrollRef}
        data-testid="instructions-scroll"
        className="flex-1 overflow-auto font-mono text-xs"
      >
        <div
          style={{
            height: virtualizer.getTotalSize(),
            width: "100%",
            position: "relative",
          }}
        >
          {virtualizer.getVirtualItems().map((virtualItem) => {
            const row: VirtualRow = rows[virtualItem.index];
            return (
              <div
                key={virtualItem.key}
                data-index={virtualItem.index}
                ref={virtualizer.measureElement}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  transform: `translateY(${virtualItem.start}px)`,
                }}
              >
                {row.kind === "header" ? (
                  <BlockHeader
                    block={row.block}
                    onToggle={toggleBlock}
                  />
                ) : (
                  <InstructionRow
                    instruction={row.instruction}
                    isCurrent={row.instruction.pc === currentPc}
                    isBreakpoint={breakpoints.has(row.instruction.pc)}
                    padWidth={padWidth}
                    onToggleBreakpoint={toggleBreakpoint}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
