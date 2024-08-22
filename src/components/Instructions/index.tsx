import { Table, TableBody } from "@/components/ui/table.tsx";

import { InstructionMode } from "@/components/Instructions/types.ts";
import { NumeralSystem } from "@/context/NumeralSystem.tsx";
import { NumeralSystemContext } from "@/context/NumeralSystemProvider";
import { ReactNode, useContext, useMemo } from "react";
import { CurrentInstruction, ExpectedState, Status } from "@/types/pvm";
import { InstructionItem } from "./InstructionItem";

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
      Object.assign(result, { addressEl: getAddressEl(result.address), counter: result.address });
      return result;
    });
    return programRows as ProgramRow[];
  }, [numeralSystem, programPreviewResult]);

  return (
    <div className="font-mono overflow-auto scroll-auto border-2 rounded-md h-full">
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
              />
            ))}
        </TableBody>
      </Table>
    </div>
  );
};
