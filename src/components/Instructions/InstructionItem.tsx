import { argType, mapInstructionsArgsByType, valueToBinary, valueToNumeralSystem } from "./utils";
import classNames from "classnames";
import { getStatusColor } from "../Registers/utils";
import { ExpectedState, RegistersArray, Status } from "@/types/pvm";
import { InstructionMode } from "./types";
import { ForwardedRef, forwardRef, useCallback, useContext, useState } from "react";
import { NumeralSystemContext } from "@/context/NumeralSystemContext";
import { TableCell, TableRow } from "../ui/table";
import { ProgramRow } from "./InstructionsTable";
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
  style,
}: {
  breakpointAddresses: (number | undefined)[];
  programRow: ProgramRow;
  onAddressClick: (address: number) => void;
  style: React.CSSProperties;
}) => {
  const [isHover, setIsHover] = useState(false);

  return (
    <TableCell
      className="p-1.5 border-transparent cursor-pointer relative"
      style={style}
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
      style,
    }: {
      status?: Status;
      isLast: boolean;
      programRow: ProgramRow;
      currentPc: number | undefined;
      instructionMode: InstructionMode;
      onClick: (r: ProgramRow) => void;
      onAddressClick: (address: number) => void;
      breakpointAddresses: (number | undefined)[];
      style: React.CSSProperties;
    },
    ref: ForwardedRef<HTMLTableRowElement>,
  ) => {
    const { numeralSystem } = useContext(NumeralSystemContext);

    const workers = useAppSelector(selectWorkers);
    const workersWithCurrentPc = workers.filter((worker) => worker.currentState.pc === programRow.address);

    const fillSearch = useCallback(() => {
      onClick(programRow);
    }, [programRow, onClick]);

    const { backgroundColor, hasOpacity } = getHighlightStatus(workers, programRow, status);

    const renderContent = () => {
      return (
        <TableRow
          ref={ref}
          className={classNames("hover:bg-gray-300", { "opacity-50": isLast })}
          test-id="instruction-item"
          style={{
            backgroundColor,
            ...style,
          }}
          title={programRow.block.name}
        >
          {instructionMode === InstructionMode.BYTECODE && (
            <>
              <AddressCell
                style={{ borderTop: programRow.block.isStart ? "2px solid #bbb" : undefined }}
                breakpointAddresses={breakpointAddresses}
                programRow={programRow}
                onAddressClick={onAddressClick}
              />
              <TableCell
                className="p-1.5"
                style={{ borderTop: programRow.block.isStart ? "2px solid #bbb" : undefined }}
              >
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
                style={{ borderTop: programRow.block.isStart ? "2px solid #bbb" : undefined }}
                breakpointAddresses={breakpointAddresses}
                programRow={programRow}
                onAddressClick={onAddressClick}
              />
              <TableCell
                className="p-1.5"
                style={{ borderTop: programRow.block.isStart ? "2px solid #bbb" : undefined }}
              >
                <a onClick={fillSearch} className="cursor-pointer">
                  <span className="uppercase font-bold">{programRow.name}</span>
                </a>
              </TableCell>
              <TableCell
                className="p-1.5 whitespace-nowrap"
                style={{ borderTop: programRow.block.isStart ? "2px solid #bbb" : undefined }}
              >
                <span className="">
                  {"args" in programRow && (
                    <span
                      dangerouslySetInnerHTML={{
                        __html:
                          mapInstructionsArgsByType(programRow.args, numeralSystem, programRow.counter)
                            ?.map((instruction) => instruction.value)
                            .join(", ") ?? "",
                      }}
                    />
                  )}
                </span>
              </TableCell>
            </>
          )}
        </TableRow>
      );
    };

    const renderTooltipContentInstructionInfo = () => {
      return (
        <div>
          <div className="flex flex-row bg-white">
            <div>
              <div className="font-mono text-xs text-gray-500 pl-1 pb-1">opcode</div>
              <div className="border-r-2 border-red-400 ">
                <div className="font-mono text-md tracking-[0.2rem] bg-red-200 pl-1 text-right">
                  {valueToBinary(programRow.instructionCode, 8)}
                </div>
                <div className="font-mono text-xs p-1 font-bold">
                  {valueToNumeralSystem(programRow.instructionCode, numeralSystem)}
                </div>
              </div>
            </div>

            {"args" in programRow &&
              mapInstructionsArgsByType(programRow.args, numeralSystem, programRow.counter)?.map(
                (instruction, index) => (
                  <div key={index}>
                    <div className="font-mono text-xs text-gray-500 pl-1 pb-1 lowercase">{instruction.type}</div>
                    <div
                      className={classNames(
                        "border-r-2",
                        { "border-violet-400": instruction.type === argType.REGISTER },
                        { "border-green-300": instruction.type !== argType.REGISTER },
                      )}
                    >
                      <div
                        className={classNames(
                          "font-mono text-md tracking-[0.2rem] pl-1",
                          {
                            "bg-violet-200": instruction.type === argType.REGISTER,
                          },
                          { "bg-green-100": instruction.type !== argType.REGISTER },
                        )}
                      >
                        {valueToBinary(instruction.value, instruction.argumentBitLength)}
                      </div>
                      <div
                        className={classNames("text-xs p-1", {
                          "font-sans": instruction.type === argType.REGISTER,
                          "font-mono": instruction.type !== argType.REGISTER,
                        })}
                        dangerouslySetInnerHTML={{
                          __html: instruction.valueFormatted ?? instruction.value,
                        }}
                      />
                    </div>
                  </div>
                ),
              )}
          </div>
        </div>
      );
    };

    return hasOpacity ? (
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
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>{renderContent()}</TooltipTrigger>
          <TooltipContent side="bottom">{renderTooltipContentInstructionInfo()}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  },
);

function getHighlightStatus(workers: WorkerState[], programRow: ProgramRow, status?: Status) {
  const pcInAllWorkers = (state: "currentState" | "previousState") =>
    workers.map((worker) => getWorkerValueFromState(worker, state, "pc"));

  const isActive = (programRow: ProgramRow) => {
    return pcInAllWorkers("currentState").includes(programRow.address);
  };

  const isHighlighted = isActive(programRow);
  const bgColor = getBackgroundForStatus(status, isHighlighted).toUpperCase();

  const bgOpacity =
    pcInAllWorkers("currentState").filter((pc) => pc === programRow.address).length /
    pcInAllWorkers("currentState").length;

  const blockBackground = programRow.block.number % 2 === 0 ? "#fff" : "#efefef";
  const backgroundColor = isHighlighted ? `rgba(${hexToRgb(bgColor)}, ${bgOpacity})` : blockBackground;

  return {
    backgroundColor,
    hasOpacity: bgOpacity > 0 && bgOpacity < 1,
  };
}

function getBackgroundForStatus(status: Status | undefined, isHighlighted: boolean) {
  if (status === Status.OK && isHighlighted) {
    return getStatusColor();
  }

  return getStatusColor(status);
}
