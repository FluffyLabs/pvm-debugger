import { mapInstructionsArgsByType, valueToNumeralSystem } from "./utils";
import classNames from "classnames";
import { getStatusColor } from "../Registers/utils";
import { ExpectedState, RegistersArray, Status } from "@/types/pvm";
import { InstructionMode } from "./types";
import { forwardRef, useCallback, useContext, useState } from "react";
import { NumeralSystemContext } from "@/context/NumeralSystemContext";
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
      className="p-1.5 border-transparent cursor-pointer relative"
      onMouseEnter={() => setIsHover(true)}
      onMouseLeave={() => setIsHover(false)}
    >
      <div
        className={classNames("w-[4px] absolute h-full left-0 top-0", {
          "bg-red-600": breakpointAddresses.includes(programRow.counter),
          "bg-red-400": isHover,
        })}
      />
      <span onClick={() => onAddressClick(programRow.counter)}>{programRow.addressEl}</span>
    </div>
  );
};

export const InstructionItem = forwardRef<
  HTMLDivElement,
  {
    status?: Status;
    isLast: boolean;
    programRow: ProgramRow;
    currentPc: number | undefined;
    instructionMode: InstructionMode;
    onClick: (r: ProgramRow) => void;
    onAddressClick: (address: number) => void;
    breakpointAddresses: (number | undefined)[];
  }
>(({ status, isLast, instructionMode, programRow, onClick, onAddressClick, breakpointAddresses }, ref) => {
  const { numeralSystem } = useContext(NumeralSystemContext);

  const workers = useAppSelector(selectWorkers);
  const workersWithCurrentPc = workers.filter((worker) => worker.currentState.pc === programRow.address);

  const fillSearch = useCallback(() => {
    onClick(programRow);
  }, [programRow, onClick]);

  const { backgroundColor, hasTooltip } = getHighlightStatus(workers, programRow, status);

  function renderContent() {
    return (
      <div
        ref={ref}
        className={classNames("hover:bg-gray-300", {
          "opacity-50": isLast,
        })}
        data-test-id="instruction-item"
        style={{
          backgroundColor,
          // If you no longer want a “block” separator effect, remove this:
          borderTop: programRow.block.isStart ? "2px solid #bbb" : undefined,
        }}
        // Using a plain title attribute or remove it if you prefer a custom tooltip
        title={programRow.block.name}
      >
        {instructionMode === InstructionMode.BYTECODE && (
          <div className="flex">
            <AddressCell
              breakpointAddresses={breakpointAddresses}
              programRow={programRow}
              onAddressClick={onAddressClick}
            />
            <div className="p-1.5">
              {"instructionBytes" in programRow && programRow.instructionBytes && (
                <span className="text-gray-500">
                  {[...programRow.instructionBytes]
                    ?.map((byte) => valueToNumeralSystem(byte, numeralSystem, numeralSystem ? 2 : 3))
                    .join(" ")}
                </span>
              )}
            </div>
          </div>
        )}

        {instructionMode === InstructionMode.ASM && (
          <div className="flex">
            <AddressCell
              breakpointAddresses={breakpointAddresses}
              programRow={programRow}
              onAddressClick={onAddressClick}
            />
            <div className="p-1.5">
              <a onClick={fillSearch} className="cursor-pointer">
                <span className="uppercase font-bold">{programRow.name}</span>
              </a>
            </div>
            <div className="p-1.5 whitespace-nowrap">
              {"args" in programRow && mapInstructionsArgsByType(programRow.args, numeralSystem, programRow.counter)}
            </div>
          </div>
        )}
      </div>
    );
  }

  if (hasTooltip) {
    return (
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
    );
  }

  return renderContent();
});

function getHighlightStatus(workers: WorkerState[], programRow: ProgramRow, status?: Status) {
  const pcInAllWorkers = (state: "currentState" | "previousState") =>
    workers.map((worker) => getWorkerValueFromState(worker, state, "pc"));

  const isActive = (p: ProgramRow) => pcInAllWorkers("currentState").includes(p.address);

  const isHighlighted = isActive(programRow);
  const bgColor = getBackgroundForStatus(status, isHighlighted).toUpperCase();

  const bgOpacity =
    pcInAllWorkers("currentState").filter((pc) => pc === programRow.address).length /
    pcInAllWorkers("currentState").length;

  const blockBackground = programRow.block.number % 2 === 0 ? "#fff" : "#efefef";
  const backgroundColor = isHighlighted ? `rgba(${hexToRgb(bgColor)}, ${bgOpacity})` : blockBackground;

  return {
    backgroundColor,
    hasTooltip: bgOpacity > 0 && bgOpacity < 1,
  };
}

function getBackgroundForStatus(status: Status | undefined, isHighlighted: boolean) {
  if (status === Status.OK && isHighlighted) {
    return getStatusColor();
  }
  return getStatusColor(status);
}
