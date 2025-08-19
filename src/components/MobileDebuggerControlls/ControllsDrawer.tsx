import { useMemo, useState } from "react";
import { motion, useDragControls } from "framer-motion";
import { CurrentInstruction, ExpectedState, Status } from "@/types/pvm";
import { ArrowRight } from "lucide-react";
import { decodeAndGetArgsDecoder, mapInstructionsArgsByType, valueToNumeralSystem } from "../Instructions/utils";
import { NumeralSystemContext } from "@/context/NumeralSystemContext";
import { useContext } from "react";
import { useAppSelector } from "@/store/hooks";
import { AddressEl } from "../Instructions/InstructionsTable";
import { selectProgram } from "@/store/debugger/debuggerSlice.ts";
import { getStatusColor } from "@/utils/colors";
import { useIsDarkMode } from "@/packages/ui-kit/DarkMode/utils";
import { cn } from "@/lib/utils";

const InstructionDisplay = ({
  status,
  currentInstructionEnriched,
  prevInstructionEnriched,
}: {
  status?: Status;
  currentInstructionEnriched: CurrentInstruction;
  prevInstructionEnriched: CurrentInstruction | null;
}) => {
  const { numeralSystem } = useContext(NumeralSystemContext);
  const program = useAppSelector(selectProgram);
  const argsDecoder = useMemo(() => {
    return decodeAndGetArgsDecoder(program);
  }, [program]);
  const isDarkMode = useIsDarkMode();

  if (currentInstructionEnriched === undefined || !("args" in currentInstructionEnriched)) {
    return;
  }

  return (
    <div className="flex flex-col">
      {!prevInstructionEnriched || !("args" in prevInstructionEnriched) ? null : (
        <div className="flex items-center overflow-hidden" title={prevInstructionEnriched.block.name}>
          <span className="font-inconsolata text-foreground">
            <AddressEl address={prevInstructionEnriched.address} />
          </span>
          <span className="px-1.5 pr-5 text-foreground uppercase">{prevInstructionEnriched.name}</span>
          <span className="px-1.5 whitespace-nowrap font-inconsolata">
            <span
              dangerouslySetInnerHTML={{
                __html:
                  mapInstructionsArgsByType(prevInstructionEnriched.args, numeralSystem, 0, argsDecoder)
                    ?.map((instruction) => instruction.valueFormatted ?? instruction.value)
                    .join(", ") ?? "",
              }}
            />
          </span>
        </div>
      )}
      <div
        className="flex items-center overflow-hidden pb-1"
        style={{ backgroundColor: getStatusColor(isDarkMode, status).background }}
      >
        <span className="font-inconsolata text-foreground">
          <AddressEl address={currentInstructionEnriched.address} />
        </span>
        <span className="px-1.5 pr-5 text-foreground uppercase">{currentInstructionEnriched.name}</span>
        <span className="px-1.5 whitespace-nowrap font-inconsolata">
          <span
            dangerouslySetInnerHTML={{
              __html:
                mapInstructionsArgsByType(currentInstructionEnriched.args, numeralSystem, 0, argsDecoder)
                  ?.map((instruction) => instruction.valueFormatted ?? instruction.value)
                  .join(", ") ?? "",
            }}
          />
        </span>
      </div>
    </div>
  );
};

const ControllsContent = ({
  currentState,
  previousState,
}: {
  currentState: ExpectedState;
  previousState: ExpectedState;
}) => {
  const { numeralSystem } = useContext(NumeralSystemContext);
  const { activeMobileTab, programPreviewResult } = useAppSelector((state) => state.debugger);

  const currentInstructionEnrichedIndex = programPreviewResult.findIndex(
    (instruction) => instruction.address === currentState.pc,
  );

  const currentInstructionEnriched = programPreviewResult[currentInstructionEnrichedIndex];
  const prevInstructionEnriched =
    currentInstructionEnrichedIndex > 0 ? programPreviewResult[currentInstructionEnrichedIndex - 1] : null;

  const changedRegisters = currentState.regs?.reduce<
    {
      changedRegisterIndex: number;
      currentState: bigint;
      previousState: bigint | undefined;
    }[]
  >((prev, reg, i) => {
    if (reg !== previousState.regs?.[i]) {
      prev.push({
        changedRegisterIndex: i,
        currentState: reg,
        previousState: previousState.regs?.[i],
      });
    }
    return prev;
  }, []);

  return (
    <div className="flex flex-col justify-between h-full text-sm">
      <div className="shrink overflow-auto">
        <div className="flex flex-col px-4 py-3">
          {activeMobileTab === "program" ? (
            changedRegisters?.length ? (
              changedRegisters?.map((val, idx) => (
                <div className="flex font-inconsolata" key={idx}>
                  <div className="col-span-2">
                    ω<sub>{val.changedRegisterIndex}</sub>
                  </div>
                  <div className="col-span-8 flex">
                    {/* {valueToNumeralSystem(val.previousState, numeralSystem)}
                  <ArrowRight className="mx-2" /> */}
                    <span className="ml-3">{valueToNumeralSystem(val.currentState, numeralSystem)}</span>
                  </div>
                </div>
              ))
            ) : (
              <span>(all registers unchanged)</span>
            )
          ) : (
            <InstructionDisplay
              status={currentState.status}
              currentInstructionEnriched={currentInstructionEnriched}
              prevInstructionEnriched={prevInstructionEnriched}
            />
          )}
        </div>
      </div>
      <div className=" grid grid-cols-12 w-full font-inconsolata">
        <div className="col-span-5 p-3 border flex items-center">
          PC&nbsp;{previousState.pc !== undefined ? valueToNumeralSystem(previousState.pc, numeralSystem) : ""}
          {currentState.pc !== previousState.pc && (
            <>
              <ArrowRight height={14} />
              <span className="text-brand-dark dark:text-brand">
                {currentState.pc !== undefined ? valueToNumeralSystem(currentState.pc, numeralSystem) : ""}
              </span>
            </>
          )}
        </div>
        <div className="col-span-7 p-3 border flex items-center">
          Gas&nbsp;{previousState.gas !== undefined ? valueToNumeralSystem(previousState.gas, numeralSystem) : ""}
          {currentState.gas !== previousState.gas && (
            <>
              <ArrowRight height={14} />
              <span className="text-brand-dark dark:text-brand">
                {currentState.gas !== undefined ? valueToNumeralSystem(currentState.gas, numeralSystem) : ""}
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export const ControllsDrawer = (props: { currentState: ExpectedState; previousState: ExpectedState }) => {
  const [isOpen, setIsOpen] = useState(false);
  const minHeight = 8;
  const maxHeight = 120;
  const dragControls = useDragControls();

  return (
    <motion.div
      className={cn(
        "absolute bottom-full left-0 w-full max-w-screen",
        "border-t bg-background rounded-t-3xl",
        "shadow-[0_-5px_3px_rgba(200,200,200,0.6)]",
        "dark:shadow-[0_-5px_3px_rgba(48,48,48,0.9)]",
      )}
      initial={{ height: minHeight }}
      animate={{ height: isOpen ? maxHeight : minHeight }}
      dragControls={dragControls}
      dragListener={false}
      drag="y"
      dragConstraints={{ top: 0, bottom: 0 }}
      dragElastic={0}
      onDragEnd={(_, info) => {
        if (info.offset.y < -50) {
          setIsOpen(true);
        } else if (info.offset.y > 50) {
          setIsOpen(false);
        }
      }}
    >
      <div
        className="w-full flex justify-center pb-1 cursor-pointer"
        onPointerDown={(e) => {
          dragControls.start(e);
        }}
      >
        <div className="w-[120px] h-[8px] bg-[#3F3F3F] rounded-full" onClick={() => setIsOpen((x) => !x)}></div>
      </div>
      {isOpen && <ControllsContent {...props} />}
    </motion.div>
  );
};
