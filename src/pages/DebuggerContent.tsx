import { useAppDispatch, useAppSelector } from "@/store/hooks.ts";
import { useDebuggerActions } from "@/hooks/useDebuggerActions.ts";
import { useCallback, useRef } from "react";
import { CurrentInstruction } from "@/types/pvm.ts";
import {
  setClickedInstruction,
  setInstructionMode,
  setIsProgramEditMode,
  setIsProgramInvalid,
} from "@/store/debugger/debuggerSlice.ts";
import { InitialLoadProgramCTA } from "@/components/InitialLoadProgramCTA";
import { InstructionMode } from "@/components/Instructions/types.ts";
import { Assembly } from "@/components/ProgramLoader/Assembly.tsx";
import { ProgramTextLoader } from "@/components/ProgramTextLoader";
import { Instructions } from "@/components/Instructions";
import { Registers } from "@/components/Registers";
import { MobileRegisters } from "@/components/MobileRegisters";
import { MemoryPreview } from "@/components/MemoryPreview";
import { KnowledgeBase } from "@/components/KnowledgeBase";
import { MobileKnowledgeBase } from "@/components/KnowledgeBase/Mobile.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Switch } from "@/components/ui/switch.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Pencil, PencilOff } from "lucide-react";
import { NumeralSystemSwitch } from "@/components/NumeralSystemSwitch";
import { HostCalls } from "@/components/HostCalls";

const DebuggerContent = () => {
  const dispatch = useAppDispatch();
  const debuggerActions = useDebuggerActions();
  const {
    program,
    initialState,
    isProgramEditMode,
    isProgramInvalid,
    programPreviewResult,
    clickedInstruction,
    instructionMode,
    breakpointAddresses,
    pvmInitialized,
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
      <div className="col-span-12 md:col-span-4 max-h-[70vh] max-sm:min-h-[330px]">
        <HostCalls />

        {!program.length && <InitialLoadProgramCTA />}
        {!!program.length && (
          <>
            {isProgramEditMode && (
              <div className="border-2 rounded-md h-full p-2">
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

      <div className="max-sm:hidden md:col-span-2">
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

      <div className="col-span-12 md:hidden">
        <MobileRegisters
          isEnabled={pvmInitialized}
          currentState={isProgramEditMode ? initialState : currentState}
          previousState={isProgramEditMode ? initialState : previousState}
        />
      </div>

      <div className="max-sm:hidden col-span-12 md:col-span-3">
        <MemoryPreview />
      </div>

      <div className="max-sm:hidden md:col-span-3 overflow-hidden">
        <KnowledgeBase currentInstruction={clickedInstruction ?? currentInstructionEnriched} />
      </div>

      <div className="md:hidden col-span-12 order-last" ref={mobileView}>
        <MobileKnowledgeBase
          currentInstruction={clickedInstruction ?? currentInstructionEnriched}
          open={clickedInstruction !== null && isMobileViewActive()}
          onClose={() => setClickedInstruction(null)}
        />
      </div>

      <div className="col-span-12 md:col-span-4 max-sm:order-first flex items-center justify-between my-3">
        <div className={`flex items-center space-x-2 ${!program.length ? "invisible" : "visible"}`}>
          <Label htmlFor="instruction-mode">ASM</Label>
          <Switch
            id="instruction-mode"
            checked={instructionMode === InstructionMode.BYTECODE}
            onCheckedChange={(checked) =>
              dispatch(setInstructionMode(checked ? InstructionMode.BYTECODE : InstructionMode.ASM))
            }
          />
          <Label htmlFor="instruction-mode">RAW</Label>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="link"
            size="icon"
            className={!program.length ? "invisible" : "visible"}
            disabled={!program.length || isProgramInvalid}
            title="Edit the code"
            onClick={() => {
              if (isProgramEditMode) {
                debuggerActions.startProgram(initialState, program);
                dispatch(setIsProgramEditMode(false));
              } else {
                debuggerActions.restartProgram(initialState);
                dispatch(setIsProgramEditMode(true));
              }
            }}
          >
            {isProgramEditMode ? <PencilOff /> : <Pencil />}
          </Button>
        </div>
        <NumeralSystemSwitch className="ml-3 md:hidden" />
      </div>
    </>
  );
};

export default DebuggerContent;
