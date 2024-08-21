import { Table, TableRow, TableBody, TableCell } from "@/components/ui/table.tsx";
import { mapInstructionsArgsByType, valueToNumeralSystem } from "./utils";
import classNames from "classnames";
import { InstructionMode } from "@/components/Instructions/types.ts";
import { NumeralSystem } from "@/context/NumeralSystem.tsx";
import { NumeralSystemContext } from "@/context/NumeralSystemProvider";
import { ReactNode, useCallback, useContext, useMemo, useRef } from "react";
import { isEqual, omit } from "lodash";
import { CurrentInstruction, Status } from "@/types/pvm";
import { getStatusColor } from "../Registers/utils";

type ProgramRow = CurrentInstruction & { address: ReactNode };

const Row = ({
  status,
  isLast,
  currentInstruction,
  instructionMode,
  programRow,
  onClick,
}: {
  status?: Status;
  isLast: boolean;
  programRow: ProgramRow;
  currentInstruction: CurrentInstruction | undefined;
  instructionMode: InstructionMode;
  onClick: (r: ProgramRow) => void;
}) => {
  const { numeralSystem } = useContext(NumeralSystemContext);
  const ref = useRef<HTMLTableRowElement>(null);

  const isActive = (programRow: CurrentInstruction) => {
    if (!currentInstruction) {
      return false;
    }

    if ("error" in programRow && "error" in currentInstruction) {
      const val =
        programRow.name === currentInstruction.name &&
        programRow.instructionCode === currentInstruction.instructionCode;

      if (val) {
        ref.current?.scrollIntoView();
      }
      return val;
    }

    // Remove error instructions from type
    if ("error" in programRow || "error" in currentInstruction) {
      return false;
    }

    const val = isEqual(
      omit(currentInstruction, ["args.immediateDecoder", "instructionBytes", "address"]),
      omit(programRow, ["args.immediateDecoder", "instructionBytes", "address"]),
    );
    if (val) {
      ref.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }

    return val;
  };

  const fillSearch = useCallback(() => {
    onClick(programRow);
  }, [programRow, onClick]);

  const isHighlighted = isActive(programRow);
  const bgColor = getBackgroundColor(status, isHighlighted).toUpperCase();

  return (
    <TableRow
      ref={ref}
      className={classNames("hover:bg-gray-300", { "opacity-50": isLast })}
      style={{ backgroundColor: isHighlighted ? bgColor : "initial" }}
    >
      {instructionMode === InstructionMode.BYTECODE && (
        <>
          <TableCell className="p-1.5">
            <span>{programRow.address}</span>
          </TableCell>
          <TableCell className="p-1.5">
            {programRow.instructionBytes && (
              <span className="text-gray-500">
                {[...programRow.instructionBytes]
                  ?.map((byte) => valueToNumeralSystem(byte, numeralSystem, numeralSystem ? 2 : 3))
                  .join(" ")}
              </span>
            )}
          </TableCell>
        </>
      )}
      {instructionMode === InstructionMode.ASM && (
        <>
          <TableCell className="p-1.5">
            <span>{programRow.address}</span>
          </TableCell>
          <TableCell className="p-1.5">
            <a onClick={fillSearch} className="cursor-pointer">
              <span className="uppercase font-bold">{programRow.name}</span>
            </a>
          </TableCell>
          <TableCell className="p-1.5">
            <span className="">
              {"args" in programRow && mapInstructionsArgsByType(programRow.args, numeralSystem)}
            </span>
          </TableCell>
        </>
      )}
    </TableRow>
  );
};

function getBackgroundColor(status: Status | undefined, isHighlighted: boolean) {
  if (status === Status.OK && isHighlighted) {
    return getStatusColor();
  }

  return getStatusColor(status);
}

export const Instructions = ({
  status,
  programPreviewResult,
  currentInstruction,
  instructionMode,
  onInstructionClick,
}: {
  status?: Status;
  programPreviewResult: CurrentInstruction[] | undefined;
  currentInstruction: CurrentInstruction | undefined;
  instructionMode: InstructionMode;
  onInstructionClick: (r: ProgramRow) => void;
}) => {
  const { numeralSystem } = useContext(NumeralSystemContext);

  const programPreviewResultWithAddress = useMemo(() => {
    if (!programPreviewResult) {
      return programPreviewResult;
    }

    const isHex = numeralSystem === NumeralSystem.HEXADECIMAL;
    const getAddress = (counter: number) => {
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
    let counter = 0;
    const programRows = programPreviewResult?.map((result) => {
      const address = getAddress(counter);
      if ("args" in result) {
        counter += result.args?.noOfBytesToSkip ?? 0;
      }

      // return Object.assign(result, { address });
      (result as any).address = address;

      return result;
    });
    return programRows;
  }, [numeralSystem, programPreviewResult]);

  return (
    <div className="font-mono overflow-auto scroll-auto border-2 rounded-md h-full">
      <Table>
        <TableBody>
          {!!programPreviewResultWithAddress?.length &&
            programPreviewResultWithAddress.map((programRow, i) => (
              <Row
                status={status}
                isLast={i === programPreviewResultWithAddress.length - 1}
                onClick={onInstructionClick}
                currentInstruction={currentInstruction}
                instructionMode={instructionMode}
                key={i}
                programRow={programRow}
              />
            ))}
        </TableBody>
      </Table>
    </div>
  );
};
