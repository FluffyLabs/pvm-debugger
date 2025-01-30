import { ReactNode, useCallback, useContext, useEffect, useMemo, useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { InstructionMode } from "@/components/Instructions/types";
import { InstructionItem } from "./InstructionItem";
import { NumeralSystem } from "@/context/NumeralSystem";
import { NumeralSystemContext } from "@/context/NumeralSystemContext";
import { useAppSelector } from "@/store/hooks";
import { selectWorkers } from "@/store/workers/workersSlice";
import { CurrentInstruction, ExpectedState, Status } from "@/types/pvm";

export type ProgramRow = CurrentInstruction & {
  addressEl: ReactNode;
  counter: number;
  // Possibly other fields, e.g., block?
};

interface InstructionsProps {
  status?: Status;
  programPreviewResult?: CurrentInstruction[];
  currentState: ExpectedState;
  instructionMode: InstructionMode;
  onInstructionClick: (row: ProgramRow) => void;
  onAddressClick: (address: number) => void;
  breakpointAddresses: (number | undefined)[];
}

export const Instructions = ({
  status,
  programPreviewResult,
  currentState,
  instructionMode,
  onInstructionClick,
  onAddressClick,
  breakpointAddresses,
}: InstructionsProps) => {
  const { numeralSystem } = useContext(NumeralSystemContext);
  const workers = useAppSelector(selectWorkers);

  // We'll calculate the maximum PC across all workers
  const maxPc = workers.reduce((acc, worker) => Math.max(acc, worker.currentState.pc ?? 0), 0);

  // Transform the instructions into ProgramRows
  const programRows = useMemo<ProgramRow[] | undefined>(() => {
    if (!programPreviewResult) return;

    const isHex = numeralSystem === NumeralSystem.HEXADECIMAL;
    const getAddressEl = (counter: number) => {
      const valInNumeralSystem = isHex ? (counter >>> 0).toString(16) : counter.toString();

      return (
        <div>
          {isHex && <span className="opacity-20">0x</span>}
          {[...Array(8 - (isHex ? 2 : 0) - valInNumeralSystem.length)].map((_, idx) => (
            <span key={idx} className="opacity-20">
              0
            </span>
          ))}
          <span>{valInNumeralSystem}</span>
        </div>
      );
    };

    return programPreviewResult.map((item) => ({
      ...item,
      addressEl: getAddressEl(item.address),
      counter: item.address,
    }));
  }, [programPreviewResult, numeralSystem]);

  const parentRef = useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: programRows?.length ?? 0,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 36,
    overscan: 8,
  });

  const scrollToIndex = useCallback(
    (index: number) => {
      rowVirtualizer.scrollToIndex(index, {
        align: "center",
        behavior: "smooth",
      });
    },
    [rowVirtualizer],
  );

  useEffect(() => {
    if (!programRows) return;
    const idx = programRows.findIndex((r) => r.counter === maxPc);
    if (idx > -1) {
      scrollToIndex(idx);
    }
  }, [maxPc, programRows, scrollToIndex]);

  if (!programRows) {
    return <div>No instructions to display</div>;
  }

  return (
    <div ref={parentRef} className="font-mono overflow-auto border-2 rounded-md h-[70vh]">
      {/* A table with fixed layout so columns remain consistent */}
      <table className="table-fixed w-full" style={{ position: "relative" }}>
        {/* (Optional) <colgroup> or <thead> to fix column widths */}
        <thead>
          <tr className="bg-gray-100">
            <th className="w-32 px-3 py-2 border-b">Address</th>
            <th className="w-40 px-3 py-2 border-b">Instruction</th>
            <th className="px-3 py-2 border-b">Data / Args</th>
          </tr>
        </thead>

        <tbody
          style={{
            // Display block to allow absolute positioning of rows
            display: "block",
            position: "relative",
            // We let the table's "spacer" be the total height
            height: rowVirtualizer.getTotalSize(),
          }}
        >
          {rowVirtualizer.getVirtualItems().map((virtualRow) => {
            const row = programRows[virtualRow.index];
            return (
              // Instead of <div>, we place a <tr> with absolutely positioned styling
              <InstructionItem
                key={virtualRow.key}
                ref={rowVirtualizer.measureElement}
                status={status}
                isLast={virtualRow.index === programRows.length - 1}
                onClick={onInstructionClick}
                instructionMode={instructionMode}
                programRow={row}
                currentPc={currentState.pc}
                onAddressClick={onAddressClick}
                breakpointAddresses={breakpointAddresses}
                // Add absolute positioning so each row is stacked vertically
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              />
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
