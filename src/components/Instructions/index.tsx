import { Table, TableBody } from "@/components/ui/table.tsx";

import { InstructionMode } from "@/components/Instructions/types.ts";
import { NumeralSystem } from "@/context/NumeralSystem.tsx";
import { NumeralSystemContext } from "@/context/NumeralSystemContext";
import { ReactNode, useContext, useEffect, useMemo, useRef } from "react";
import { CurrentInstruction, ExpectedState, Status } from "@/types/pvm";
import { InstructionItem } from "./InstructionItem";
import { useAppSelector } from "@/store/hooks.ts";
import { selectWorkers } from "@/store/workers/workersSlice.ts";

export type ProgramRow = CurrentInstruction & { addressEl: ReactNode; counter: number };

export const Instructions = ({
  status,
  programPreviewResult,
  currentState,
  instructionMode,
  onInstructionClick,
  onAddressClick,
  breakpointAddresses,
}: {
  status?: Status;
  programPreviewResult: CurrentInstruction[] | undefined;
  currentState: ExpectedState;
  instructionMode: InstructionMode;
  onInstructionClick: (r: ProgramRow) => void;
  onAddressClick: (address: number) => void;
  breakpointAddresses: (number | undefined)[];
}) => {
  const { numeralSystem } = useContext(NumeralSystemContext);
  const workers = useAppSelector(selectWorkers);
  const scrollToRef = useRef<HTMLTableRowElement>(null);
  const maxPc = workers.reduce((acc, worker) => Math.max(acc, worker.currentState.pc ?? 0), 0);

  const programPreviewResultWithAddress = useMemo(() => {
    if (!programPreviewResult) {
      return programPreviewResult;
    }

    const isHex = numeralSystem === NumeralSystem.HEXADECIMAL;
    const getAddressEl = (counter: number) => {
      const valInNumeralSystem = isHex ? `${(counter >>> 0).toString(16)}` : counter.toString();
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
    const programRows = programPreviewResult?.map((result) => {
      return {
        ...result,
        addressEl: getAddressEl(result.address),
        counter: result.address,
      };
    });
    return programRows as ProgramRow[];
  }, [numeralSystem, programPreviewResult]);

  useEffect(() => {
    if (scrollToRef.current) {
      scrollToRef.current.scrollIntoView({
        behavior: "smooth", // Enables smooth scrolling
        block: "nearest", // Aligns element to nearest scroll position
      });
    }
  }, [scrollToRef, maxPc]);

  return (
    <div className="font-mono overflow-auto scroll-auto border-2 rounded-md h-[70vh]">
      <Table>
        <TableBody>
          {!!programPreviewResultWithAddress?.length &&
            programPreviewResultWithAddress.map((programRow, i) => (
              <InstructionItem
                status={status}
                isLast={i === programPreviewResultWithAddress.length - 1}
                onClick={onInstructionClick}
                instructionMode={instructionMode}
                key={i}
                programRow={programRow}
                currentPc={currentState.pc}
                onAddressClick={onAddressClick}
                breakpointAddresses={breakpointAddresses}
                ref={maxPc === programRow.counter ? scrollToRef : undefined}
              />
            ))}
        </TableBody>
      </Table>
    </div>
  );
};
