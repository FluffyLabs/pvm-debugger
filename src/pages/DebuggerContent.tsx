import { useAppDispatch, useAppSelector } from "@/store/hooks.ts";
import { useDebuggerActions } from "@/hooks/useDebuggerActions.ts";
import { useCallback, useState } from "react";
import { CurrentInstruction, RegistersArray } from "@/types/pvm.ts";
import { setClickedInstruction, setIsProgramInvalid } from "@/store/debugger/debuggerSlice.ts";
import { InitialLoadProgramCTA } from "@/components/InitialLoadProgramCTA";
import { InstructionMode } from "@/components/Instructions/types.ts";
import { Assembly } from "@/components/ProgramLoader/Assembly.tsx";
import { ProgramTextLoader } from "@/components/ProgramTextLoader";
import { Instructions } from "@/components/Instructions";
import { Registers } from "@/components/Registers";
import { MemoryPreview } from "@/components/MemoryPreview";
// import { KnowledgeBase } from "@/components/KnowledgeBase";
// import { MobileKnowledgeBase } from "@/components/KnowledgeBase/Mobile.tsx";
import { HostCalls } from "@/components/HostCalls";
import classNames from "classnames";
import { Program } from "@typeberry/pvm-debugger-adapter";

const MobileTabs = ({ tabChange }: { tabChange: (val: string) => void }) => {
  const [activeTab, setActiveTab] = useState("program");
  const onTabClick = (tab: string) => {
    setActiveTab(tab);
    tabChange(tab);
  };

  return (
    <div className="grid grid-cols-3 ">
      <button
        onClick={() => onTabClick("program")}
        className={classNames(
          "py-2",
          activeTab === "program" ? "bg-[#242424] text-[#F6F7F9]" : "bg-[#EAEAEA] text-[#5C5C5C]",
        )}
      >
        Program
      </button>
      <button
        onClick={() => onTabClick("status")}
        className={classNames(
          "py-2",
          activeTab === "status" ? "bg-[#242424] text-[#F6F7F9]" : "bg-[#EAEAEA] text-[#5C5C5C]",
        )}
      >
        Status
      </button>
      <button
        onClick={() => onTabClick("memory")}
        className={classNames(
          "py-2",
          activeTab === "memory" ? "bg-[#242424] text-[#F6F7F9]" : "bg-[#EAEAEA] text-[#5C5C5C]",
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
    program,
    initialState,
    isProgramEditMode,
    programPreviewResult,
    // clickedInstruction,
    instructionMode,
    breakpointAddresses,
    isDebugFinished,
    isRunMode,
    isStepMode,
  } = useAppSelector((state) => state.debugger);
  const workers = useAppSelector((state) => state.workers);
  const [activeTab, setActiveTab] = useState("program");
  const { currentState, previousState } = workers[0] || {
    currentInstruction: null,
    currentState: initialState,
    previousState: initialState,
  };

  // const currentInstructionEnriched = programPreviewResult.find(
  //   (instruction) => instruction.instructionCode === currentInstruction?.instructionCode,
  // );

  // const mobileView = useRef<HTMLDivElement | null>(null);

  const onInstructionClick = useCallback(
    (row: CurrentInstruction) => {
      dispatch(setClickedInstruction(row));
    },
    [dispatch],
  );

  // const isMobileViewActive = () => {
  //   return mobileView?.current?.offsetParent !== null;
  // };

  return (
    <div className="grid grid-rows grid-cols-12 gap-3 overflow-hidden w-full h-full p-3">
      <div className="w-full col-span-12 sm:hidden">
        <MobileTabs tabChange={setActiveTab} />
      </div>
      <div
        className={classNames(
          "md:col-span-6 max-h-[70vh] max-sm:min-h-[330px]",
          activeTab === "program" ? "col-span-12" : "max-sm:hidden",
        )}
      >
        <HostCalls />

        {!program.length && <InitialLoadProgramCTA />}
        {!!program.length && (
          <>
            {isProgramEditMode && (
              <div className="border-2 rounded-md h-full">
                {instructionMode === InstructionMode.ASM ? (
                  <Assembly
                    program={program}
                    onProgramLoad={debuggerActions.handleProgramLoad}
                    initialState={initialState}
                  />
                ) : (
                  <ProgramTextLoader
                    program={program}
                    setProgram={(program, error) => {
                      if (error) {
                        dispatch(setIsProgramInvalid(true));
                      }

                      function tryAsSpi(program: number[]) {
                        try {
                          const { code, memory, registers } = Program.fromSpi(
                            new Uint8Array(program),
                            new Uint8Array(),
                          );
                          const regs = Array.from(registers.getAllU64()) as RegistersArray;
                          return {
                            program: Array.from(code) || [],
                            initial: { ...initialState, regs, mem: memory },
                            name: "custom",
                          };
                        } catch {
                          return null;
                        }
                      }

                      if (!error && program) {
                        const maybeSpi = tryAsSpi(program.slice());
                        if (maybeSpi) {
                          debuggerActions.handleProgramLoad(maybeSpi);
                        } else {
                          debuggerActions.handleProgramLoad({
                            initial: initialState,
                            program: program || [],
                            name: "custom",
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
          "md:col-span-3 max-h-[70vh] max-sm:min-h-[330px]",
          activeTab === "status" ? "col-span-12" : "max-sm:hidden",
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
          "md:col-span-3 max-sm:min-h-[330px] max-h-[70vh]",
          activeTab === "memory" ? "col-span-12" : "max-sm:hidden",
        )}
      >
        <MemoryPreview />
      </div>
      {/*
      <div className="max-sm:hidden md:col-span-3 overflow-hidden">
        <KnowledgeBase currentInstruction={clickedInstruction ?? currentInstructionEnriched} />
      </div> */}

      {/* <div className="md:hidden col-span-12 order-last" ref={mobileView}>
        <MobileKnowledgeBase
          currentInstruction={clickedInstruction ?? currentInstructionEnriched}
          open={clickedInstruction !== null && isMobileViewActive()}
          onClose={() => setClickedInstruction(null)}
        />
      </div> */}
    </div>
  );
};

export default DebuggerContent;
