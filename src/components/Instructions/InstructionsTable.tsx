import { ReactNode, useCallback, useContext, useEffect, useMemo, useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { InstructionItem } from "./InstructionItem";
import { NumeralSystem } from "@/context/NumeralSystem";
import { NumeralSystemContext } from "@/context/NumeralSystemContext";
import { useAppSelector } from "@/store/hooks";
import { selectWorkers } from "@/store/workers/workersSlice";
import { CurrentInstruction } from "@/types/pvm";
import { InstructionsProps } from ".";
import { mapInstructionsArgsByType } from "./utils";

export type ProgramRow = CurrentInstruction & {
  addressEl: ReactNode;
  counter: number;
  // Possibly other fields, e.g., block?
};

export const AddressEl = ({ address }: { address: number }) => {
  const { numeralSystem } = useContext(NumeralSystemContext);
  const isHex = numeralSystem === NumeralSystem.HEXADECIMAL;
  const counter = address;

  const valInNumeralSystem = isHex ? (counter >>> 0).toString(16) : counter.toString();

  return (
    <div>
      {isHex && <span className="text-muted-foreground">0x</span>}
      {[...Array(8 - (isHex ? 2 : 0) - valInNumeralSystem.length)].map((_, idx) => (
        <span key={idx} className="text-muted-foreground">
          0
        </span>
      ))}
      <span className="text-inherit">{valInNumeralSystem}</span>
    </div>
  );
};

export const InstructionsTable = ({
  status,
  program,
  programPreviewResult,
  currentState,
  instructionMode,
  onInstructionClick,
  onAddressClick,
  breakpointAddresses,
}: InstructionsProps) => {
  const workers = useAppSelector(selectWorkers);

  // We'll calculate the maximum PC across all workers
  const maxPc = workers.reduce((acc, worker) => Math.max(acc, worker.currentState.pc ?? 0), 0);

  // Transform the instructions into ProgramRows
  const programRows = useMemo<ProgramRow[] | undefined>(() => {
    if (!programPreviewResult) return;

    return programPreviewResult.map((item) => ({
      ...item,
      addressEl: <AddressEl address={item.address} />,
      counter: item.address,
    }));
  }, [programPreviewResult]);

  const parentRef = useRef<HTMLDivElement>(null);

  const widestItem = useMemo(
    () =>
      programRows?.reduce<{ widestItem: ProgramRow | null; maxWidth: number }>(
        (acc, item) => {
          const { widestItem, maxWidth } = acc;
          if (!("args" in item)) {
            return { widestItem: null, maxWidth: 0 };
          }
          const addressWidth =
            mapInstructionsArgsByType(item.args, NumeralSystem.HEXADECIMAL, 0, program)
              ?.map((x) => x.value)
              .join("").length ?? 0;

          if (addressWidth > maxWidth) {
            return { widestItem: item, maxWidth: addressWidth };
          } else {
            return { widestItem, maxWidth };
          }
        },
        { widestItem: null, maxWidth: 0 },
      ).widestItem,
    [programRows, program],
  );

  const rowVirtualizer = useVirtualizer({
    count: programRows?.length ?? 0,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 32,
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
    <div ref={parentRef} className="font-poppins overflow-auto relative h-[calc(100%-48px)] ml-2">
      <div style={{ height: `${rowVirtualizer.getTotalSize()}px` }}>
        <table className="w-full caption-bottom text-sm border-separate border-spacing-x-0 border-spacing-y-1">
          <tbody>
            {rowVirtualizer.getVirtualItems().map((virtualRow, index) => {
              const row = programRows[virtualRow.index];

              return (
                <InstructionItem
                  index={virtualRow.index}
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
                  style={{
                    height: `${virtualRow.size}px`,
                    transform: `translateY(${virtualRow.start - index * virtualRow.size}px)`,
                  }}
                />
              );
            })}

            {
              // an additional hidden item that prevents column resizing when table is scrolled
              widestItem && (
                <InstructionItem
                  index={0}
                  status={status}
                  isLast={false}
                  onClick={() => {}}
                  instructionMode={instructionMode}
                  programRow={widestItem}
                  currentPc={currentState.pc}
                  onAddressClick={() => {}}
                  breakpointAddresses={[]}
                  style={{
                    visibility: "hidden",
                  }}
                />
              )
            }
          </tbody>
        </table>
      </div>
    </div>
  );
};
