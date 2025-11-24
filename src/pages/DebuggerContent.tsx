import { useAppDispatch, useAppSelector } from "@/store/hooks.ts";
import { useDebuggerActions } from "@/hooks/useDebuggerActions.ts";
import { useCallback } from "react";
import { CurrentInstruction } from "@/types/pvm.ts";
import { setActiveMobileTab, setClickedInstruction, setIsProgramInvalid } from "@/store/debugger/debuggerSlice.ts";
import { InitialLoadProgramCTA } from "@/components/InitialLoadProgramCTA";
import { InstructionMode } from "@/components/Instructions/types.ts";
import { Assembly } from "@/components/ProgramLoader/Assembly.tsx";
import { ProgramTextLoader } from "@/components/ProgramTextLoader";
import { Instructions } from "@/components/Instructions";
import { Registers } from "@/components/Registers";
import { MemoryPreview } from "@/components/MemoryPreview";
import classNames from "classnames";
import { KnowledgeBase } from "@/components/KnowledgeBase";
import { bigUint64ArrayToRegistersArray, getAsChunks, getAsPageMap } from "@/lib/utils";
import { decodeSpiWithMetadata } from "@/utils/spi";

const MobileTabs = () => {
  const dispatch = useAppDispatch();

  const { activeMobileTab } = useAppSelector((state) => state.debugger);

  const onTabClick = (tab: string) => {
    dispatch(setActiveMobileTab(tab));
  };

  return (
    <div className="grid grid-cols-3 ">
      <button
        onClick={() => onTabClick("program")}
        className={classNames(
          "py-2 rounded-ss rounded-es",
          activeMobileTab === "program"
            ? "bg-primary text-primary-foreground"
            : "bg-secondary text-secondary-foreground",
        )}
      >
        Program
      </button>
      <button
        onClick={() => onTabClick("status")}
        className={classNames(
          "py-2",
          activeMobileTab === "status"
            ? "bg-primary text-primary-foreground"
            : "bg-secondary text-secondary-foreground",
        )}
      >
        Status
      </button>
      <button
        onClick={() => onTabClick("memory")}
        className={classNames(
          "py-2 rounded-ee rounded-se",
          activeMobileTab === "memory"
            ? "bg-primary text-primary-foreground"
            : "bg-secondary text-secondary-foreground",
        )}
      >
        Memory
      </button>
    </div>
  );
};

const DebuggerContent = () => {
  const dispatch = useAppDispatch();
  const debuggerActions = useDebuggerActions();
  const {
    programName,
    program,
    initialState,
    isProgramEditMode,
    programPreviewResult,
    clickedInstruction,
    instructionMode,
    breakpointAddresses,
    isDebugFinished,
    isRunMode,
    isStepMode,
    activeMobileTab,
    spiArgs,
  } = useAppSelector((state) => state.debugger);
  const workers = useAppSelector((state) => state.workers);
  const { currentState, previousState } = workers[0] || {
    currentState: initialState,
    previousState: initialState,
  };

  const currentInstructionEnriched = programPreviewResult.find(
    (instruction) => instruction.address === currentState.pc,
  );

  const onInstructionClick = useCallback(
    (row: CurrentInstruction) => {
      dispatch(setClickedInstruction(row));
    },
    [dispatch],
  );

  const programNameWithoutSuffix = programName.substring(
    0,
    programName.includes("(") ? programName.indexOf("(") : undefined,
  );

  return (
    <div className="w-full h-full p-3 pt-0 flex flex-col gap-4 overflow-hidden max-sm:mb-3">
      <div className="w-full col-span-12 mt-3 sm:hidden">
        <MobileTabs />
      </div>
      <div className="grow h-full overflow-hidden grid grid-rows grid-cols-12 gap-3">
        <div
          className={classNames(
            "md:col-span-5 max-sm:min-h-[330px] h-full overflow-hidden",
            activeMobileTab === "program" ? "max-sm:col-span-12" : "max-sm:hidden",
          )}
        >
          {!program.length ? (
            <InitialLoadProgramCTA />
          ) : (
            <>
              {isProgramEditMode && (
                <div className="border-[1px] rounded-md h-full">
                  {instructionMode === InstructionMode.ASM ? (
                    <Assembly
                      programName={`${programNameWithoutSuffix} (edited)`}
                      program={program}
                      onProgramLoad={debuggerActions.handleProgramLoad}
                      initialState={initialState}
                    />
                  ) : (
                    <ProgramTextLoader
                      program={program}
                      setProgram={(programBlob: number[] | undefined, error) => {
                        if (error) {
                          dispatch(setIsProgramInvalid(true));
                        }
                        let maybeSpi;
                        try {
                          maybeSpi = decodeSpiWithMetadata(
                            programBlob === undefined ? new Uint8Array() : new Uint8Array(programBlob),
                            spiArgs ?? new Uint8Array(),
                          );
                        } catch {
                          maybeSpi = null;
                        }

                        if (!error && programBlob) {
                          if (maybeSpi) {
                            const { code, memory: rawMemory, registers, metadata } = maybeSpi;
                            const regs = bigUint64ArrayToRegistersArray(registers);

                            const pageMap = getAsPageMap(rawMemory);
                            const memory = getAsChunks(rawMemory);

                            const program = {
                              program: Array.from(code) || [],
                              initial: { ...initialState, regs, pageMap, memory },
                              name: `${programNameWithoutSuffix} (SPI)`,
                              kind: "JAM SPI",
                              spiProgram: {
                                program: new Uint8Array(programBlob),
                                hasMetadata: metadata !== undefined,
                              },
                            };
                            debuggerActions.handleProgramLoad(program);
                          } else {
                            debuggerActions.handleProgramLoad({
                              initial: initialState,
                              program: programBlob ?? [],
                              name: `${programName} (generic)`,
                              spiProgram: null,
                              kind: "Generic PVM",
                            });
                          }
                        }
                      }}
                    />
                  )}
                </div>
              )}

              {!isProgramEditMode && (
                <>
                  <Instructions
                    programName={programName}
                    status={currentState.status}
                    currentState={currentState}
                    programPreviewResult={programPreviewResult}
                    instructionMode={instructionMode}
                    onAddressClick={debuggerActions.handleBreakpointClick}
                    breakpointAddresses={breakpointAddresses}
                    onInstructionClick={onInstructionClick}
                  />
                </>
              )}
            </>
          )}
        </div>

        <div
          className={classNames(
            "md:col-span-3 max-sm:min-h-[330px] h-full overflow-hidden",
            activeMobileTab === "status" ? "col-span-12" : "max-sm:hidden",
          )}
        >
          <Registers
            currentState={isProgramEditMode ? initialState : currentState}
            previousState={isProgramEditMode ? initialState : previousState}
            onCurrentStateChange={(state) => {
              debuggerActions.restartProgram(state);
            }}
            allowEditingPc={!isDebugFinished && !isRunMode && !isStepMode}
            allowEditingGas={!isDebugFinished && !isRunMode && !isStepMode}
            allowEditingRegisters={false}
          />
        </div>

        <div
          className={classNames(
            "md:col-span-4 h-full max-sm:min-h-[330px] overflow-hidden",
            activeMobileTab === "memory" ? "col-span-12" : "max-sm:hidden",
          )}
        >
          <MemoryPreview />
        </div>
      </div>

      <KnowledgeBase currentInstruction={clickedInstruction ?? currentInstructionEnriched} />
    </div>
  );
};

export default DebuggerContent;
