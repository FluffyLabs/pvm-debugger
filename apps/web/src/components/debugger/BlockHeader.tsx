import { ChevronDown, ChevronRight } from "lucide-react";
import { memo } from "react";
import type { BasicBlock } from "../../hooks/useBasicBlocks";

interface BlockHeaderProps {
  block: BasicBlock;
  onToggle: (blockIndex: number) => void;
}

export const BlockHeader = memo(function BlockHeader({
  block,
  onToggle,
}: BlockHeaderProps) {
  return (
    <button
      type="button"
      data-testid={`block-header-${block.index}`}
      className="flex items-center gap-1 px-2 py-0.5 text-xs font-normal text-muted-foreground bg-muted/30 border-b border-border cursor-pointer select-none hover:bg-muted/50 w-full text-left border-none"
      aria-expanded={!block.isCollapsed}
      aria-label={`Block ${block.index}`}
      onClick={() => onToggle(block.index)}
    >
      {block.isCollapsed ? (
        <ChevronRight className="w-3.5 h-3.5 shrink-0" />
      ) : (
        <ChevronDown className="w-3.5 h-3.5 shrink-0" />
      )}
      <span>Block {block.index}</span>
      <span className="text-muted-foreground/60 ml-1">
        ({block.instructions.length} instr)
      </span>
    </button>
  );
});
