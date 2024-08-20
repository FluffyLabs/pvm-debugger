import { mapInstructionsArgsByType, valueToNumeralSystem } from "./utils";
import classNames from "classnames";
import { getStatusColor } from "../Registers/utils";
import { Status } from "@/types/pvm";
import { InstructionMode } from "./types";
import { useCallback, useContext, useRef, useState } from "react";
import { NumeralSystemContext } from "@/context/NumeralSystemProvider";
import { TableCell, TableRow } from "../ui/table";
import { ProgramRow } from ".";

function getBackgroundColor(status: Status | undefined, isHighlighted: boolean) {
  if (status === Status.OK && isHighlighted) {
    return getStatusColor();
  }

  return getStatusColor(status);
}

const AddressCell = ({
  breakpointAddresses,
  programRow,
  onAddressClick,
}: {
  breakpointAddresses: (number | undefined)[];
  programRow: ProgramRow;
  onAddressClick: (address: number) => void;
}) => {
  const [isHover, setIsHover] = useState(false);

  return (
    <TableCell
      className="p-1.5 border-transparent cursor-pointer relative"
      onMouseEnter={() => setIsHover(true)}
      onMouseLeave={() => setIsHover(false)}
    >
      <div
        className={classNames("w-[4px] absolute h-[100%] left-0 top-0", {
          "bg-red-600": breakpointAddresses.includes(programRow.counter),
          "bg-red-400": isHover,
        })}
      ></div>
      <span onClick={() => onAddressClick(programRow.counter)}>{programRow.addressEl}</span>
    </TableCell>
  );
};

export const InstructionItem = ({
  status,
  isLast,
  currentPc,
  instructionMode,
  programRow,
  onClick,
  onAddressClick,
  breakpointAddresses,
}: {
  status?: Status;
  isLast: boolean;
  programRow: ProgramRow;
  currentPc: number | undefined;
  instructionMode: InstructionMode;
  onClick: (r: ProgramRow) => void;
  onAddressClick: (address: number) => void;
  breakpointAddresses: (number | undefined)[];
}) => {
  const { numeralSystem } = useContext(NumeralSystemContext);
  const ref = useRef<HTMLTableRowElement>(null);

  const isActive = (programRow: ProgramRow) => {
    return programRow.address === currentPc;
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
          <AddressCell
            breakpointAddresses={breakpointAddresses}
            programRow={programRow}
            onAddressClick={onAddressClick}
          />
          <TableCell className="p-1.5">
            {"instructionBytes" in programRow && programRow.instructionBytes && (
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
          <AddressCell
            breakpointAddresses={breakpointAddresses}
            programRow={programRow}
            onAddressClick={onAddressClick}
          />
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
