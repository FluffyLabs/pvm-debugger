import { forwardRef, useCallback, useContext, useState } from "react";
import classNames from "classnames";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip.tsx";

import { mapInstructionsArgsByType, valueToNumeralSystem } from "./utils";
import { getStatusColor } from "../Registers/utils";
import { hexToRgb } from "@/lib/utils.ts";
import { ExpectedState, RegistersArray, Status } from "@/types/pvm";
import { InstructionMode } from "./types";
import { NumeralSystemContext } from "@/context/NumeralSystemContext";
import { ProgramRow } from ".";
import { useAppSelector } from "@/store/hooks.ts";
import { selectWorkers, WorkerState } from "@/store/workers/workersSlice.ts";

/**
 * Renders just the address + red breakpoint bar inside a container
 * that we will place into a <td>.
 */
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
    <div
      className="relative cursor-pointer"
      onMouseEnter={() => setIsHover(true)}
      onMouseLeave={() => setIsHover(false)}
      onClick={() => onAddressClick(programRow.counter)}
    >
      {/* Red bar on the left */}
      <div
        className={classNames("w-[4px] absolute h-full left-0 top-0", {
          "bg-red-600": breakpointAddresses.includes(programRow.counter),
          "bg-red-400": isHover,
        })}
      />
      {/* The address text */}
      <span className="ml-6">{programRow.addressEl}</span>
    </div>
  );
};

export const InstructionItem = forwardRef<
  HTMLTableRowElement,
  {
    status?: Status;
    isLast: boolean;
    programRow: ProgramRow;
    currentPc: number | undefined;
    instructionMode: InstructionMode;
    onClick: (r: ProgramRow) => void;
    onAddressClick: (address: number) => void;
    breakpointAddresses: (number | undefined)[];
    style?: React.CSSProperties;
  }
>(function InstructionItem(
  { status, isLast, style, instructionMode, programRow, onClick, onAddressClick, breakpointAddresses },
  ref,
) {
  const { numeralSystem } = useContext(NumeralSystemContext);
  const workers = useAppSelector(selectWorkers);
  const workersWithCurrentPc = workers.filter((w) => w.currentState.pc === programRow.address);

  const fillSearch = useCallback(() => {
    onClick(programRow);
  }, [programRow, onClick]);

  const { backgroundColor, hasTooltip } = getHighlightStatus(workers, programRow, status);

  function renderRow() {
    return (
      <tr
        ref={ref}
        className={classNames("hover:bg-gray-300", {
          "opacity-50": isLast, // e.g. fade the last row
        })}
        data-test-id="instruction-item"
        style={{
          backgroundColor,
          borderTop: programRow.block.isStart ? "2px solid #bbb" : undefined,
          ...style, // includes position: 'absolute', transform, etc. from the virtualizer
        }}
        title={programRow.block.name}
      >
        {/* Address Column */}
        <td className="p-1.5 relative">
          <AddressCell
            breakpointAddresses={breakpointAddresses}
            programRow={programRow}
            onAddressClick={onAddressClick}
          />
        </td>

        {/* Instruction Column */}
        <td className="p-1.5">
          {instructionMode === InstructionMode.BYTECODE ? (
            // If you want to show the instruction name for Bytecode, adapt this:
            <span className="font-bold uppercase">{programRow.name || "BYTECODE"}</span>
          ) : (
            // ASM mode: clickable instruction name
            <a onClick={fillSearch} className="cursor-pointer uppercase font-bold">
              {programRow.name}
            </a>
          )}
        </td>

        {/* Data / Args Column */}
        <td className="p-1.5 whitespace-nowrap">
          {instructionMode === InstructionMode.BYTECODE &&
          "instructionBytes" in programRow &&
          programRow.instructionBytes ? (
            <span className="text-gray-500">
              {[...programRow.instructionBytes]
                .map((byte) => valueToNumeralSystem(byte, numeralSystem, numeralSystem ? 2 : 3))
                .join(" ")}
            </span>
          ) : instructionMode === InstructionMode.ASM ? (
            // ASM arguments
            <>{"args" in programRow && mapInstructionsArgsByType(programRow.args, numeralSystem, programRow.counter)}</>
          ) : null}
        </td>
      </tr>
    );
  }

  if (hasTooltip) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>{renderRow()}</TooltipTrigger>
          <TooltipContent side="left">
            {workersWithCurrentPc.map((worker, index) => (
              <div key={index}>
                <span>{worker.id} - PC:&nbsp;</span>
                <span>
                  {valueToNumeralSystem(getWorkerValueFromState(worker, "currentState", "pc"), numeralSystem)}
                </span>
              </div>
            ))}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return renderRow();
});

/** Helpers **/

function getWorkerValueFromState(
  worker: WorkerState,
  state: "currentState" | "previousState",
  propName: keyof ExpectedState,
  propNameIndex?: number,
) {
  return propNameIndex !== undefined
    ? (worker[state][propName] as RegistersArray)[propNameIndex]
    : (worker[state][propName] as number);
}

function getHighlightStatus(workers: WorkerState[], programRow: ProgramRow, status?: Status) {
  const pcInAllWorkers = (state: "currentState" | "previousState") =>
    workers.map((w) => getWorkerValueFromState(w, state, "pc"));

  const isActive = pcInAllWorkers("currentState").includes(programRow.address);
  const bgColor = getBackgroundForStatus(status, isActive).toUpperCase();

  // If multiple workers share this PC, it can affect the highlight alpha
  const highlightCount = pcInAllWorkers("currentState").filter((pc) => pc === programRow.address).length;
  const totalWorkers = workers.length || 1;
  const bgOpacity = highlightCount / totalWorkers;

  // Alternate block color for each block
  const blockBackground = programRow.block.number % 2 === 0 ? "#fff" : "#efefef";
  const backgroundColor = isActive ? `rgba(${hexToRgb(bgColor)}, ${bgOpacity})` : blockBackground;

  return {
    backgroundColor,
    hasTooltip: bgOpacity > 0 && bgOpacity < 1, // Show tooltip if some but not all workers share this PC
  };
}

function getBackgroundForStatus(status: Status | undefined, isHighlighted: boolean) {
  if (status === Status.OK && isHighlighted) {
    return getStatusColor();
  }
  return getStatusColor(status);
}
