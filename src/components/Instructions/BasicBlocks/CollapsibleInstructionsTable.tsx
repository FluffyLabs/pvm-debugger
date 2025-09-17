import { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { InstructionItem } from "../InstructionItem";
import { BasicBlockHeader } from "./BasicBlockHeader";
import { NumeralSystemContext } from "@/context/NumeralSystemContext";
import { useAppSelector } from "@/store/hooks";
import { selectWorkers } from "@/store/workers/workersSlice";
import { CurrentInstruction } from "@/types/pvm";
import { InstructionsProps } from "..";
import { selectProgram } from "@/store/debugger/debuggerSlice";
import { decodeAndGetArgsDecoder, getASMInstructionValueHtml, valueToNumeralSystem } from "../utils";
import { InstructionMode } from "../types";
import { AddressEl, ProgramRow } from "../InstructionsTable";
import {
  groupInstructionsByBlocks,
  getVisibleInstructionCount,
  findBlockContainingAddress,
  getVirtualIndexForAddress,
  virtualIndexToBlockAndInstruction,
  toggleBlockExpanded,
  BasicBlockGroup,
} from "./blockUtils";

export const CollapsibleInstructionsTable = ({
  status,
  programPreviewResult,
  currentState,
  instructionMode,
  onInstructionClick,
  onAddressClick,
  breakpointAddresses,
}: InstructionsProps) => {
  const workers = useAppSelector(selectWorkers);
  const program = useAppSelector(selectProgram);
  const { numeralSystem } = useContext(NumeralSystemContext);

  // Group instructions into blocks
  const blocks = useMemo(() => {
    if (!programPreviewResult) return [];
    return groupInstructionsByBlocks(programPreviewResult);
  }, [programPreviewResult]);

  // Track expanded/collapsed state
  const [expandedBlocks, setExpandedBlocks] = useState<Set<number>>(() => {
    // Start with all blocks collapsed
    return new Set();
  });

  // Calculate the maximum PC across all workers
  const maxPc = workers.reduce((acc, worker) => Math.max(acc, worker.currentState.pc ?? 0), 0);

  // Check if a block contains any breakpoints
  const blockHasBreakpoint = useCallback(
    (block: BasicBlockGroup) => {
      return block.instructions.some((inst) => breakpointAddresses.includes(inst.address));
    },
    [breakpointAddresses],
  );

  // Calculate total visible items for virtualization
  const visibleItemCount = useMemo(() => {
    return getVisibleInstructionCount(blocks, expandedBlocks);
  }, [blocks, expandedBlocks]);

  const parentRef = useRef<HTMLDivElement>(null);

  // Get item type and data for a virtual index
  const getItemForVirtualIndex = useCallback(
    (
      virtualIndex: number,
    ): {
      type: "header" | "instruction";
      block: BasicBlockGroup;
      instruction?: CurrentInstruction;
      instructionIndex?: number;
    } | null => {
      const result = virtualIndexToBlockAndInstruction(blocks, expandedBlocks, virtualIndex);
      if (!result) return null;

      const block = blocks[result.blockIndex];

      // For single instruction blocks, always return as instruction
      if (block.isSingleInstruction) {
        return {
          type: "instruction",
          block,
          instruction: block.instructions[0],
          instructionIndex: 0,
        };
      }

      if (result.instructionIndex === null) {
        return { type: "header", block };
      } else {
        return {
          type: "instruction",
          block,
          instruction: block.instructions[result.instructionIndex],
          instructionIndex: result.instructionIndex,
        };
      }
    },
    [blocks, expandedBlocks],
  );

  const rowVirtualizer = useVirtualizer({
    count: visibleItemCount,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 32,
    overscan: 8,
  });

  // Handle block expansion/collapse with scroll position preservation
  const handleToggleBlock = useCallback((blockNumber: number) => {
    // Save current scroll position before toggling
    const scrollElement = parentRef.current;
    const scrollTop = scrollElement?.scrollTop ?? 0;

    setExpandedBlocks((prev) => {
      const newSet = toggleBlockExpanded(prev, blockNumber);

      // Restore scroll position after state update
      requestAnimationFrame(() => {
        if (scrollElement) {
          scrollElement.scrollTop = scrollTop;
        }
      });

      return newSet;
    });
  }, []);

  // Scroll to PC
  const scrollToIndex = useCallback(
    (index: number) => {
      rowVirtualizer.scrollToIndex(index, {
        align: "center",
        behavior: "auto",
      });
    },
    [rowVirtualizer],
  );

  // Auto-scroll to current PC
  useEffect(() => {
    if (!blocks.length) return;

    // Find block containing PC
    const blockWithPc = findBlockContainingAddress(blocks, maxPc);
    if (!blockWithPc) return;

    // // Ensure block is expanded
    // if (!expandedBlocks.has(blockWithPc.blockNumber)) {
    //   setExpandedBlocks(prev => new Set([...prev, blockWithPc.blockNumber]));
    // }

    // Get virtual index for the PC address
    const virtualIndex = getVirtualIndexForAddress(blocks, expandedBlocks, maxPc);
    if (virtualIndex >= 0) {
      scrollToIndex(virtualIndex);
    }
  }, [maxPc, blocks, expandedBlocks, scrollToIndex]);

  // Calculate widest item for consistent column width
  const widestItemValue = useMemo(() => {
    if (!blocks.length) return "";

    const argsDecoder = decodeAndGetArgsDecoder(program);
    let widest = "";

    blocks.forEach((block) => {
      block.instructions.forEach((item) => {
        if (instructionMode === InstructionMode.ASM && "args" in item) {
          const valueNoHtml = getASMInstructionValueHtml(item.args, numeralSystem, 0, argsDecoder)
            .replace(/<sub>/g, "")
            .replace(/<\/sub>/g, "");
          if ((valueNoHtml?.length || 0) > widest.length) {
            widest = valueNoHtml || "";
          }
        } else if (instructionMode === InstructionMode.BYTECODE && "instructionBytes" in item) {
          const bytecode = Array.from(item.instructionBytes)
            .map((byte) => valueToNumeralSystem(byte, numeralSystem, numeralSystem ? 2 : 3))
            .join(" ");
          if (bytecode.length > widest.length) {
            widest = bytecode;
          }
        }
      });
    });

    return widest;
  }, [blocks, numeralSystem, instructionMode, program]);

  if (!blocks.length) {
    return <div>No instructions to display</div>;
  }
  const lastInstructionAddress =
    programPreviewResult === undefined ? 0 : programPreviewResult[programPreviewResult.length - 1].address;

  return (
    <div ref={parentRef} className="overflow-auto relative h-[calc(100%-48px)] ml-2">
      <div style={{ height: `${rowVirtualizer.getTotalSize()}px` }}>
        <table className="w-full caption-bottom text-sm border-separate border-spacing-x-0 border-spacing-y-1">
          <tbody>
            {rowVirtualizer.getVirtualItems().map((virtualRow, index) => {
              const item = getItemForVirtualIndex(virtualRow.index);
              if (!item) return null;

              if (item.type === "header") {
                return (
                  <BasicBlockHeader
                    key={virtualRow.key}
                    ref={rowVirtualizer.measureElement}
                    data-index={virtualRow.index}
                    block={item.block}
                    isExpanded={expandedBlocks.has(item.block.blockNumber)}
                    onToggle={() => handleToggleBlock(item.block.blockNumber)}
                    status={status}
                    hasBreakpoint={blockHasBreakpoint(item.block)}
                    widestItemValueLength={widestItemValue.length}
                    style={{
                      height: `${virtualRow.size}px`,
                      transform: `translateY(${virtualRow.start - index * virtualRow.size}px)`,
                    }}
                  />
                );
              }

              // It's an instruction
              const programRow: ProgramRow = {
                ...item.instruction!,
                addressEl: <AddressEl address={item.instruction!.address} />,
                counter: item.instruction!.address,
              };
              const isLast = item.instruction?.address === lastInstructionAddress;

              return (
                <InstructionItem
                  index={virtualRow.index}
                  key={virtualRow.key}
                  ref={rowVirtualizer.measureElement}
                  status={status}
                  isLast={isLast}
                  isSingleInBlock={item.block.instructionCount === 1}
                  onClick={onInstructionClick}
                  instructionMode={instructionMode}
                  widestItemValueLength={widestItemValue.length}
                  programRow={programRow}
                  currentPc={currentState.pc}
                  onAddressClick={onAddressClick}
                  breakpointAddresses={breakpointAddresses}
                  style={{
                    height: `${virtualRow.size}px`,
                    transform: `translateY(${virtualRow.start - index * virtualRow.size}px)`,
                  }}
                />
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
