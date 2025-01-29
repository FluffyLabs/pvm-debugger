import { ReactNode, useCallback, useContext, useEffect, useMemo, useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { InstructionMode } from "@/components/Instructions/types.ts";
import { InstructionItem } from "./InstructionItem";
import { NumeralSystem } from "@/context/NumeralSystem.tsx";
import { NumeralSystemContext } from "@/context/NumeralSystemContext";
import { useAppSelector } from "@/store/hooks.ts";
import { selectWorkers } from "@/store/workers/workersSlice.ts";
import { CurrentInstruction, ExpectedState, Status } from "@/types/pvm";

export type ProgramRow = CurrentInstruction & {
  addressEl: ReactNode;
  counter: number;
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

  // We'll calculate the maximum PC across all workers to know which row to scroll to
  const maxPc = workers.reduce((acc, worker) => Math.max(acc, worker.currentState.pc ?? 0), 0);

  const programPreview = useMemo<ProgramRow[] | undefined>(() => {
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
    count: programPreview?.length ?? 0,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 36,
    overscan: 8,
  });

  const scrollToIndex = useCallback(
    (index: number) => {
      rowVirtualizer.scrollToIndex(index, {
        align: "center",
        behavior: "auto",
      });
    },
    [rowVirtualizer],
  );

  useEffect(() => {
    if (!programPreview) return;
    const idx = programPreview.findIndex((r) => r.counter === maxPc);
    if (idx > -1) {
      scrollToIndex(idx);
    }
  }, [maxPc, programPreview, scrollToIndex]);

  if (!programPreview) {
    return <div>No instructions to display</div>;
  }

  return (
    <div ref={parentRef} className="font-mono overflow-auto border-2 rounded-md h-[70vh]">
      <div
        style={{
          position: "relative",
          width: "100%",
          height: rowVirtualizer.getTotalSize(),
        }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
          const row = programPreview[virtualRow.index];
          return (
            <div
              key={virtualRow.key}
              ref={rowVirtualizer.measureElement}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              <InstructionItem
                status={status}
                isLast={virtualRow.index === programPreview.length - 1}
                onClick={onInstructionClick}
                instructionMode={instructionMode}
                programRow={row}
                currentPc={currentState.pc}
                onAddressClick={onAddressClick}
                breakpointAddresses={breakpointAddresses}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};
