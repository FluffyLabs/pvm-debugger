import { useAppDispatch, useAppSelector } from "@/store/hooks.ts";
import { useDebuggerActions } from "@/hooks/useDebuggerActions.ts";
import { useCallback, useRef } from "react";
import { CurrentInstruction } from "@/types/pvm.ts";
import { setClickedInstruction, setIsProgramInvalid } from "@/store/debugger/debuggerSlice.ts";
import { InitialLoadProgramCTA } from "@/components/InitialLoadProgramCTA";
import { InstructionMode } from "@/components/Instructions/types.ts";
import { Assembly } from "@/components/ProgramLoader/Assembly.tsx";
import { ProgramTextLoader } from "@/components/ProgramTextLoader";
import { Instructions } from "@/components/Instructions";
import { Registers } from "@/components/Registers";
import { MemoryPreview } from "@/components/MemoryPreview";
// import { KnowledgeBase } from "@/components/KnowledgeBase";
import { MobileKnowledgeBase } from "@/components/KnowledgeBase/Mobile.tsx";
import { HostCalls } from "@/components/HostCalls";

const DebuggerContent = () => {
  const dispatch = useAppDispatch();
  const debuggerActions = useDebuggerActions();
  const {
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
  } = useAppSelector((state) => state.debugger);
  const workers = useAppSelector((state) => state.workers);

  const { currentInstruction, currentState, previousState } = workers[0] || {
    currentInstruction: null,
    currentState: initialState,
    previousState: initialState,
  };

  const currentInstructionEnriched = programPreviewResult.find(
    (instruction) => instruction.instructionCode === currentInstruction?.instructionCode,
  );

  const mobileView = useRef<HTMLDivElement | null>(null);

  const onInstructionClick = useCallback(
    (row: CurrentInstruction) => {
      dispatch(setClickedInstruction(row));
    },
    [dispatch],
  );

  const isMobileViewActive = () => {
    return mobileView?.current?.offsetParent !== null;
  };

  return (
    <>
      <div className="col-span-12 md:col-span-6 max-h-[70vh] max-sm:min-h-[330px] overflow-hidden">
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

                      if (!error && program) {
                        debuggerActions.handleProgramLoad({
                          initial: initialState,
                          program: program || [],
                          name: "custom",
                        });
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

      <div className="max-sm:hidden md:col-span-3">
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

      <div className="max-sm:hidden col-span-12 md:col-span-3">
        <MemoryPreview />
      </div>
      {/*
      <div className="max-sm:hidden md:col-span-3 overflow-hidden">
        <KnowledgeBase currentInstruction={clickedInstruction ?? currentInstructionEnriched} />
      </div> */}

      <div className="md:hidden col-span-12 order-last" ref={mobileView}>
        <MobileKnowledgeBase
          currentInstruction={clickedInstruction ?? currentInstructionEnriched}
          open={clickedInstruction !== null && isMobileViewActive()}
          onClose={() => setClickedInstruction(null)}
        />
      </div>
    </>
  );
};

export default DebuggerContent;
