import { ChevronDown, ChevronRight } from "lucide-react";
import { BasicBlockGroup } from "./blockUtils";
import { forwardRef, useContext, useMemo } from "react";
import { NumeralSystemContext } from "@/context/NumeralSystemContext";
import { NumeralSystem } from "@/context/NumeralSystem";
import { useAppSelector } from "@/store/hooks";
import { selectWorkers } from "@/store/workers/workersSlice";
import classNames from "classnames";
import { useIsDarkMode } from "@/packages/ui-kit/DarkMode/utils";
import { Status } from "@/types/pvm";
import { getStatusColor } from "@/utils/colors";
import { cn, hexToRgb } from "@/lib/utils";

interface BasicBlockHeaderProps {
  block: BasicBlockGroup;
  isExpanded: boolean;
  onToggle: () => void;
  status?: Status;
  hasBreakpoint?: boolean;
  style?: React.CSSProperties;
  className?: string;
  widestItemValueLength: number;
  "data-index"?: number;
}

export const BasicBlockHeader = forwardRef<HTMLTableRowElement, BasicBlockHeaderProps>((props, ref) => {
  const { block, isExpanded, onToggle, status, hasBreakpoint = false, style, className, widestItemValueLength } = props;
  const { numeralSystem } = useContext(NumeralSystemContext);
  const isDarkMode = useIsDarkMode();
  const workers = useAppSelector(selectWorkers);
  const isHex = numeralSystem === NumeralSystem.HEXADECIMAL;

  // Check if any worker's PC is in this block
  const workersInBlock = useMemo(() => {
    return workers.filter((worker) => {
      const pc = worker.currentState.pc;
      return pc !== undefined && pc >= block.startAddress && pc <= block.endAddress;
    });
  }, [workers, block.startAddress, block.endAddress]);

  const isActive = workersInBlock.length > 0;
  const bgOpacity = workersInBlock.length / Math.max(workers.length, 1);

  // Get colors based on status and activity
  const colors = useMemo(() => {
    if (status === Status.OK && isActive) {
      return getStatusColor(isDarkMode);
    }
    return getStatusColor(isDarkMode, status);
  }, [status, isActive, isDarkMode]);

  // Format address for display - matching InstructionItem style
  const formatAddress = (address: number) => {
    const counter = address;
    const valInNumeralSystem = isHex ? (counter >>> 0).toString(16) : counter.toString();
    const paddingLength = 8 - (isHex ? 2 : 0) - valInNumeralSystem.length;

    return (
      <div>
        {isHex && <span className="text-muted-foreground">0x</span>}
        {[...Array(Math.max(0, paddingLength))].map((_, idx) => (
          <span key={idx} className="text-muted-foreground">
            0
          </span>
        ))}
        <span className="text-inherit">{valInNumeralSystem}</span>
      </div>
    );
  };

  const blockBackground = isDarkMode
    ? block.blockNumber % 2 === 0
      ? "#242424"
      : "#2D2D2D"
    : block.blockNumber % 2 === 0
      ? "#fff"
      : "#eee";

  const backgroundColor = isActive
    ? `rgba(${hexToRgb(colors.background.toUpperCase())}, ${bgOpacity})`
    : blockBackground;

  const textColor = isActive ? colors.color : isDarkMode ? "#B3B3B3" : "#14181F";
  const borderColor = hasBreakpoint ? "#EF4444" : isActive ? colors.border : isDarkMode ? "#444444" : "#EBEBEB";

  return (
    <tr
      ref={ref}
      data-index={props["data-index"]}
      className={classNames("cursor-pointer overflow-hidden opacity-75", className)}
      onClick={onToggle}
      style={{
        backgroundColor,
        color: textColor,
        ...style,
      }}
    >
      {/* Address Column with Expand/Collapse Icon */}
      <td className="p-1.5 cursor-pointer relative w-[20%] border-b">
        <div style={{ backgroundColor: borderColor }} className="w-[3px] absolute h-[100%] left-0 top-0" />
        <div className="flex items-center gap-1">{formatAddress(block.startAddress)}</div>
      </td>

      {/* Block Name Column */}
      <td
        className={cn("p-1.5 border-b w-[35%] min-w-[160px] lowercase", {
          italic: isExpanded,
        })}
      >
        {block.blockName}
        {isExpanded ? (
          <ChevronDown className="inline h-4 w-4 pb-1" />
        ) : (
          <ChevronRight className="inline h-4 w-4 pb-1" />
        )}
      </td>

      {/* Instruction Count Column */}
      <td className="p-1.5 whitespace-nowrap border-b">
        <span className="block opacity-75" style={{ width: `${widestItemValueLength}ch` }}>
          {block.instructionCount} instructions
        </span>
      </td>
    </tr>
  );
});

BasicBlockHeader.displayName = "BasicBlockHeader";
