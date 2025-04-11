import {
  argType,
  getASMInstructionValueHtml,
  mapInstructionsArgsByType,
  valueToBinary,
  valueToNumeralSystem,
} from "./utils";
import classNames from "classnames";
import { ExpectedState, RegistersArray, Status } from "@/types/pvm";
import { InstructionMode } from "./types";
import { ForwardedRef, forwardRef, useCallback, useContext, useState } from "react";
import { NumeralSystemContext } from "@/context/NumeralSystemContext";
import { TableCell, TableRow } from "../ui/table";
import { ProgramRow } from "./InstructionsTable";
import { useAppSelector } from "@/store/hooks.ts";
import { selectWorkers, WorkerState } from "@/store/workers/workersSlice.ts";
import { cn, hexToRgb } from "@/lib/utils.ts";
import { Tooltip, TooltipContent, TooltipPortal, TooltipTrigger } from "@/components/ui/tooltip.tsx";
import { useIsDarkMode } from "@/packages/ui-kit/DarkMode/utils";
import { selectProgram } from "@/store/debugger/debuggerSlice.ts";
import { getStatusColor } from "@/utils/colors";

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
      className={classNames("p-1.5 cursor-pointer relative font-inconsolata w-[20%]", className)}
      onMouseEnter={() => setIsHover(true)}
      onMouseLeave={() => setIsHover(false)}
    >
      <div
        style={{ backgroundColor: backgroundClass ? undefined : colors.border }}
        className={classNames("w-[3px] absolute h-[100%] left-0 top-0", backgroundClass)}
      ></div>
      <div style={{ color: colors.color }} onClick={() => onAddressClick(programRow.counter)}>
        {programRow.addressEl}
      </div>
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
      widestItemValueLength,
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
      widestItemValueLength: number;
    },
    ref: ForwardedRef<HTMLTableRowElement>,
  ) => {
    const { numeralSystem } = useContext(NumeralSystemContext);
    const isDarkMode = useIsDarkMode();
    const program = useAppSelector(selectProgram);

    const workers = useAppSelector(selectWorkers);
    const workersWithCurrentPc = workers.filter((worker) => worker.currentState.pc === programRow.address);

    const fillSearch = useCallback(() => {
      onClick(programRow);
    }, [programRow, onClick]);

    const { backgroundColor, color, border, pvmsDiverged } = getHighlightStatus(
      workers,
      programRow,
      status,
      isDarkMode,
    );

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
              <TableCell className="p-1.5 border-b w-[40%]">
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
              <TableCell className="p-1.5 border-b w-[40%] min-w-[170px]">
                <a onClick={fillSearch} className="cursor-pointer">
                  <span className="uppercase">{programRow.name}</span>
                </a>
              </TableCell>
              <TableCell className="p-1.5 whitespace-nowrap border-b font-inconsolata">
                <span
                  className=""
                  style={{ width: `${widestItemValueLength}ch`, display: "block", overflow: "hidden" }}
                >
                  {"args" in programRow && (
                    <span
                      dangerouslySetInnerHTML={{
                        __html: getASMInstructionValueHtml(programRow.args, numeralSystem, programRow.counter, program),
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
            <DetailsColumn
              kind="opcode"
              bits={valueToBinary(programRow.instructionCode, 8)}
              value={valueToNumeralSystem(programRow.instructionCode, numeralSystem)}
            />
            {"args" in programRow &&
              mapInstructionsArgsByType(programRow.args, numeralSystem, programRow.counter, program)
                ?.filter((instruction) => !instruction.hiddenFromDetails)
                .map((instruction, index) => (
                  <DetailsColumn
                    key={index}
                    kind={instruction.type}
                    bits={valueToBinary(instruction.valueDecimal, instruction.argumentBitLength)}
                    value={`${instruction.valueFormatted ?? instruction.value}`}
                  />
                ))}
          </div>
        </div>
      );
    };

    return (
      <Tooltip>
        <TooltipTrigger asChild>{renderContent()}</TooltipTrigger>
        <TooltipPortal>
          {pvmsDiverged ? (
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
          ) : (
            <TooltipContent side="bottom" className="m-0 p-0">
              {renderTooltipContentInstructionInfo()}
            </TooltipContent>
          )}
        </TooltipPortal>
      </Tooltip>
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
  // TODO [ToDr] The status should be coming from a particular worker and should not be shared!
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
    pvmsDiverged: bgOpacity > 0 && bgOpacity < 1,
  };
}

function getBackgroundForStatus(status: Status | undefined, isHighlighted: boolean, isDarkMode?: boolean) {
  if (status === Status.OK && isHighlighted) {
    return getStatusColor(isDarkMode);
  }

  return getStatusColor(isDarkMode, status);
}

type DetailsColumnProps = {
  kind: "opcode" | argType;
  bits: string;
  value: string;
};

function DetailsColumn({ kind, bits, value }: DetailsColumnProps) {
  const isImmediate = kind === argType.IMMEDIATE || kind === argType.EXTENDED_WIDTH_IMMEDIATE;
  const isRegister = kind === argType.REGISTER || kind === argType.IMMEDIATE_LENGTH;
  const isOffset = kind === argType.OFFSET;
  return (
    <div>
      <div className="font-inconsolata text-xs text-[#8F8F8F] dark:text-brand pl-3 pb-1 lowercase">{kind}</div>
      <div
        className={cn("border-r-2", {
          "border-[#F4B4FF] dark:border-[#C287B3]": kind === "opcode",
          "border-[#9FAEDB] dark:border-[#9FAEDB]": isRegister,
          "border-[#A6D7D4] dark:border-[#61EDE2]": isOffset,
          "border-[#A6D7D4] dark:border-[#61EDA2]": isImmediate,
        })}
      >
        <div
          className={cn("font-inconsolata text-md tracking-[0.2rem] px-3", {
            "bg-[#FCEBFF] dark:bg-[#8B537D] text-[#444444] dark:text-[#FF8FEA]": kind === "opcode",
            "bg-[#E8EEFF] dark:bg-[#5F6988] text-[#444444] dark:text-[#AABFFF]": isRegister,
            "bg-[#E8FFFE] dark:bg-[#016960] text-[#444444] dark:text-[#15C9BB]": isOffset,
            "bg-[#EBFFEE] dark:bg-[#114028] text-[#444444] dark:text-[#13A657]": isImmediate,
          })}
        >
          {bits}
        </div>
        <div className="text-xs p-1 pl-3 font-inconsolata">
          {kind === argType.REGISTER ? (
            <span
              dangerouslySetInnerHTML={{
                __html: value,
              }}
            />
          ) : (
            value
          )}
        </div>
      </div>
    </div>
  );
}
