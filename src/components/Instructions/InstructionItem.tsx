import { argType, mapInstructionsArgsByType, valueToBinary, valueToNumeralSystem } from "./utils";
import classNames from "classnames";
import { ExpectedState, RegistersArray, Status } from "@/types/pvm";
import { InstructionMode } from "./types";
import { ForwardedRef, forwardRef, useCallback, useContext, useState } from "react";
import { NumeralSystemContext } from "@/context/NumeralSystemContext";
import { TableCell, TableRow } from "../ui/table";
import { ProgramRow } from "./InstructionsTable";
import { useAppSelector } from "@/store/hooks.ts";
import { selectWorkers, WorkerState } from "@/store/workers/workersSlice.ts";
import { hexToRgb } from "@/lib/utils.ts";
import { Tooltip, TooltipContent, TooltipPortal, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip.tsx";
import { useIsDarkMode } from "@/packages/ui-kit/DarkMode/utils";

const getWorkerValueFromState = (
  worker: WorkerState,
  state: "currentState" | "previousState",
  propName: keyof ExpectedState,
  propNameIndex?: number,
) =>
  propNameIndex !== undefined
    ? (worker[state][propName] as RegistersArray)?.[propNameIndex]
    : (worker[state][propName] as number);

const AddressCell = ({
  breakpointAddresses,
  programRow,
  onAddressClick,
  className,
  colors,
}: {
  breakpointAddresses: (number | undefined)[];
  programRow: ProgramRow;
  onAddressClick: (address: number) => void;
  className?: string;
  colors:
    | {
        color: string;
        border: string;
      }
    | {
        color: string;
        border: string;
      };
}) => {
  const [isHover, setIsHover] = useState(false);
  const backgroundClass =
    (breakpointAddresses.includes(programRow.counter) && "bg-red-600") || (isHover && "bg-red-400");
  return (
    <TableCell
      className={"p-1.5 cursor-pointer relative font-inconsolata " + className}
      onMouseEnter={() => setIsHover(true)}
      onMouseLeave={() => setIsHover(false)}
    >
      <div
        style={{ backgroundColor: backgroundClass ? undefined : colors.border }}
        className={classNames("w-[3px] absolute h-[100%] left-0 top-0", backgroundClass)}
      ></div>
      <span style={{ color: colors.color }} onClick={() => onAddressClick(programRow.counter)}>
        {programRow.addressEl}
      </span>
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
      index,
    }: {
      status?: Status;
      isLast: boolean;
      programRow: ProgramRow;
      currentPc: number | undefined;
      instructionMode: InstructionMode;
      onClick: (r: ProgramRow) => void;
      onAddressClick: (address: number) => void;
      breakpointAddresses: (number | undefined)[];
      index: number;
      style: React.CSSProperties;
    },
    ref: ForwardedRef<HTMLTableRowElement>,
  ) => {
    const { numeralSystem } = useContext(NumeralSystemContext);
    const isDarkMode = useIsDarkMode();
    const workers = useAppSelector(selectWorkers);
    const workersWithCurrentPc = workers.filter((worker) => worker.currentState.pc === programRow.address);

    const fillSearch = useCallback(() => {
      onClick(programRow);
    }, [programRow, onClick]);

    const { backgroundColor, color, border, hasOpacity } = getHighlightStatus(workers, programRow, status, isDarkMode);

    const renderContent = () => {
      return (
        <TableRow
          ref={ref}
          className={classNames({ "opacity-50": isLast }, "overflow-hidden")}
          test-id="instruction-item"
          style={{
            backgroundColor,
            color,
            ...style,
          }}
          data-index={index}
          title={programRow.block.name}
        >
          {instructionMode === InstructionMode.BYTECODE && (
            <>
              <AddressCell
                className="border-b"
                breakpointAddresses={breakpointAddresses}
                programRow={programRow}
                onAddressClick={onAddressClick}
                colors={{
                  color,
                  border,
                }}
              />
              <TableCell className="p-1.5 border-b">
                {"instructionBytes" in programRow && programRow.instructionBytes && (
                  <span className="text-title-foreground">
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
                className="border-b"
                breakpointAddresses={breakpointAddresses}
                programRow={programRow}
                onAddressClick={onAddressClick}
                colors={{
                  color,
                  border,
                }}
              />
              <TableCell className="p-1.5 border-b">
                <a onClick={fillSearch} className="cursor-pointer">
                  <span className="uppercase">{programRow.name}</span>
                </a>
              </TableCell>
              <TableCell className="p-1.5 whitespace-nowrap border-b font-inconsolata">
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
          <div className="flex flex-row bg-title p-3">
            <div>
              <div className="font-inconsolata text-xs text-[#8F8F8F] dark:text-brand pl-1 pb-1">opcode</div>
              <div className="border-r-2 border-[#F16764] dark:border-[#C287B3]">
                <div className="font-inconsolata text-md tracking-[0.2rem] bg-[#FDD3D0] dark:bg-[#8B537D] text-[#5A5A5A] dark:text-[#FF8FEA] pl-1 text-right">
                  {valueToBinary(programRow.instructionCode, 8)}
                </div>
                <div className="font-inconsolata text-xs p-1 font-bold text-title-foreground dark:text-brand ">
                  {valueToNumeralSystem(programRow.instructionCode, numeralSystem)}
                </div>
              </div>
            </div>

            {"args" in programRow &&
              mapInstructionsArgsByType(programRow.args, numeralSystem, programRow.counter)?.map(
                (instruction, index) => (
                  <div key={index}>
                    <div className="font-inconsolata text-xs text-[#8F8F8F] dark:text-foreground pl-1 pb-1 lowercase">
                      {instruction.type}
                    </div>
                    <div
                      className={classNames(
                        "border-r-2",
                        { "border-[#A6B3D7] dark:border-[#61EDE2]": instruction.type === argType.REGISTER },
                        { "border-green-300 dark:border-green-600": instruction.type !== argType.REGISTER },
                      )}
                    >
                      <div
                        className={classNames(
                          "font-inconsolata text-md tracking-[0.2rem] pl-1 text-[#8F8F8F] dark:text-foreground",
                          {
                            "bg-[#E8EEFF] dark:bg-[#016960] text-[#5A5A5A] dark:text-[#15C9BB]":
                              instruction.type === argType.REGISTER,
                          },
                          {
                            "bg-[#EBFFEE] dark:bg-[#114028] text-[#5A5A5A] dark:text-[#13A657]":
                              instruction.type !== argType.REGISTER,
                          },
                        )}
                      >
                        {valueToBinary(
                          instruction.value,
                          instruction.type === argType.EXTENDED_WIDTH_IMMEDIATE ? 16 : 8,
                        )}
                      </div>
                      <div
                        className={classNames("text-xs p-1", {
                          "font-sans": instruction.type === argType.REGISTER,
                          "font-inconsolata": instruction.type !== argType.REGISTER,
                        })}
                        dangerouslySetInnerHTML={{
                          __html: instruction.value,
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
          <TooltipPortal>
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
          </TooltipPortal>
        </Tooltip>
      </TooltipProvider>
    ) : (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>{renderContent()}</TooltipTrigger>
          <TooltipPortal>
            <TooltipContent side="bottom" className="m-0 p-0">
              {renderTooltipContentInstructionInfo()}
            </TooltipContent>
          </TooltipPortal>
        </Tooltip>
      </TooltipProvider>
    );
  },
);

function getHighlightStatus(workers: WorkerState[], programRow: ProgramRow, status?: Status, isDarkMode?: boolean) {
  const pcInAllWorkers = (state: "currentState" | "previousState") =>
    workers.map((worker) => getWorkerValueFromState(worker, state, "pc"));

  const isActive = (programRow: ProgramRow) => {
    return pcInAllWorkers("currentState").includes(programRow.address);
  };

  const isHighlighted = isActive(programRow);
  const colors = getBackgroundForStatus(status, isHighlighted, isDarkMode);

  const bgOpacity =
    pcInAllWorkers("currentState").filter((pc) => pc === programRow.address).length /
    pcInAllWorkers("currentState").length;

  const blockBackground = isDarkMode
    ? programRow.block.number % 2 === 0
      ? "#242424"
      : "#2D2D2D"
    : programRow.block.number % 2 === 0
      ? "#fff"
      : "#F8F8F8";

  const backgroundColor = isHighlighted
    ? `rgba(${hexToRgb(colors.background.toUpperCase())}, ${bgOpacity})`
    : blockBackground;
  const color = isHighlighted ? colors.color : isDarkMode ? "#B3B3B3" : "#14181F";
  const border = isHighlighted ? colors.border : isDarkMode ? "#444444" : "#EBEBEB";
  return {
    backgroundColor,
    color,
    border,
    hasOpacity: bgOpacity > 0 && bgOpacity < 1,
  };
}

function getBackgroundForStatus(status: Status | undefined, isHighlighted: boolean, isDarkMode?: boolean) {
  if (status === Status.OK && isHighlighted) {
    return isDarkMode ? getDarkStatusColor() : getStatusColor();
  }

  return isDarkMode ? getDarkStatusColor(status) : getStatusColor(status);
}

const getStatusColor = (status?: Status) => {
  if (status === Status.OK || status === Status.HALT) {
    return {
      background: "#4caf50",
      color: "#367f39",
      border: "#4caf50",
    };
  }

  if (status === Status.PANIC) {
    return {
      background: "#f44336",
      color: "#b32d23",
      border: "#f44336",
    };
  }

  // Highlight color
  return {
    background: "#E4FFFD",
    color: "#17AFA3",
    border: "#61EDE2",
  };
};

const getDarkStatusColor = (status?: Status) => {
  if (status === Status.OK || status === Status.HALT) {
    return {
      background: "#124b14",
      color: "#4caf50",
      border: "#4caf50",
    };
  }

  if (status === Status.PANIC) {
    return {
      background: "#f44336",
      color: "#b32d23",
      border: "#b32d23",
    };
  }

  // Highlight color
  return {
    background: "#00413B",
    color: "#00FFEB",
    border: "#61EDE2",
  };
};
