import { mapInstructionsArgsByType, valueToNumeralSystem } from "./utils";
import classNames from "classnames";
import { getStatusColor } from "../Registers/utils";
import { ExpectedState, RegistersArray, Status } from "@/types/pvm";
import { InstructionMode } from "./types";
import { ForwardedRef, forwardRef, useCallback, useContext, useState } from "react";
import { NumeralSystemContext } from "@/context/NumeralSystemContext";
import { TableCell, TableRow } from "../ui/table";
import { ProgramRow } from ".";
import { useAppSelector } from "@/store/hooks.ts";
import { selectWorkers, WorkerState } from "@/store/workers/workersSlice.ts";
import { hexToRgb } from "@/lib/utils.ts";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip.tsx";

const getWorkerValueFromState = (
  worker: WorkerState,
  state: "currentState" | "previousState",
  propName: keyof ExpectedState,
  propNameIndex?: number,
) =>
  propNameIndex !== undefined
    ? (worker[state][propName] as RegistersArray)[propNameIndex]
    : (worker[state][propName] as number);

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

export const InstructionItem = forwardRef(
  (
    {
      status,
      isLast,
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
    },
    ref: ForwardedRef<HTMLTableRowElement>,
  ) => {
    const { numeralSystem } = useContext(NumeralSystemContext);

    const workers = useAppSelector(selectWorkers);
    const pcInAllWorkers = (state: "currentState" | "previousState") =>
      workers.map((worker) => getWorkerValueFromState(worker, state, "pc"));
    const workersWithCurrentPc = workers.filter((worker) => worker.currentState.pc === programRow.address);

    const isActive = (programRow: ProgramRow) => {
      return pcInAllWorkers("currentState").includes(programRow.address);
    };

    const fillSearch = useCallback(() => {
      onClick(programRow);
    }, [programRow, onClick]);

    const isHighlighted = isActive(programRow);
    const bgColor = getBackgroundColor(status, isHighlighted).toUpperCase();

    const bgOpacity =
      pcInAllWorkers("currentState").filter((pc) => pc === programRow.address).length /
      pcInAllWorkers("currentState").length;

    const renderContent = () => {
      return (
        <TableRow
          ref={ref}
          className={classNames("hover:bg-gray-300", { "opacity-50": isLast })}
          test-id="instruction-item"
          style={{ backgroundColor: isHighlighted ? `rgba(${hexToRgb(bgColor)}, ${bgOpacity})` : "initial" }}
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
                  {"args" in programRow &&
                    mapInstructionsArgsByType(programRow.args, numeralSystem, programRow.counter)}
                </span>
              </TableCell>
            </>
          )}
        </TableRow>
      );
    };

    return bgOpacity > 0 && bgOpacity < 1 ? (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>{renderContent()}</TooltipTrigger>
          <TooltipContent side="left">
            {workersWithCurrentPc.map((worker, index) => (
              <div key={index}>
                <span>{worker.id} - PC:</span>
                <span className="pl-3">
                  <span>
                    {valueToNumeralSystem(getWorkerValueFromState(worker, "currentState", "pc"), numeralSystem)}
                  </span>
                </span>
              </div>
            ))}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    ) : (
      renderContent()
    );
  },
);
