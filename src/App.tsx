import "./App.css";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import { Button } from "@/components/ui/button";
import { useCallback, useRef } from "react";
import { Instructions } from "./components/Instructions";
import { Registers } from "./components/Registers";
import { CurrentInstruction } from "./types/pvm";
import { Pencil, PencilOff } from "lucide-react";
import { Header } from "@/components/Header";
import { KnowledgeBase } from "@/components/KnowledgeBase";
import { Switch } from "@/components/ui/switch.tsx";
import { Label } from "@/components/ui/label.tsx";
import { InstructionMode } from "@/components/Instructions/types.ts";
import { PvmSelect } from "@/components/PvmSelect";
import { NumeralSystemSwitch } from "@/components/NumeralSystemSwitch";

import { InitialLoadProgramCTA } from "@/components/InitialLoadProgramCTA";
import { MobileRegisters } from "./components/MobileRegisters";
import { MobileKnowledgeBase } from "./components/KnowledgeBase/Mobile";
import { Assembly } from "./components/ProgramLoader/Assembly";
import { useAppDispatch, useAppSelector } from "@/store/hooks.ts";
import {
  setClickedInstruction,
  setInitialState,
  setInstructionMode,
  setIsProgramEditMode,
} from "@/store/debugger/debuggerSlice.ts";
import { MemoryPreview } from "@/components/MemoryPreview";
import { DebuggerControlls } from "./components/DebuggerControlls";
import { useDebuggerActions } from "./hooks/useDebuggerActions";
import { Loader } from "./components/ProgramLoader/Loader";
import classNames from "classnames";

const DebuggerContent = () => {
  const dispatch = useAppDispatch();
  const debuggerActions = useDebuggerActions();
  const {
    program,
    initialState,
    isProgramEditMode,
    isAsmError,
    programPreviewResult,
    clickedInstruction,
    instructionMode,
    breakpointAddresses,
    pvmInitialized,
  } = useAppSelector((state) => state.debugger);
  const workers = useAppSelector((state) => state.workers);

  const { currentInstruction, currentState, previousState } = workers[0] || {
    currentInstruction: null,
    currentState: initialState,
    previousState: initialState,
  };

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
      <div className="col-span-12 md:col-span-4 max-sm:max-h-[70vh] max-sm:min-h-[330px]">
        {!program.length && <InitialLoadProgramCTA />}
        {!!program.length && (
          <>
            {isProgramEditMode && (
              <div className="border-2 rounded-md h-full p-2 pt-8">
                <Assembly
                  program={program}
                  onProgramLoad={debuggerActions.handleProgramLoad}
                  initialState={initialState}
                />
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
            setInitialState(state);
            debuggerActions.restartProgram(state);
          }}
          allowEditing={false}
        />
      </div>

      <div className="col-span-12 md:hidden">
        <MobileRegisters
          isEnabled={pvmInitialized}
          currentState={isProgramEditMode ? initialState : currentState}
          previousState={isProgramEditMode ? initialState : previousState}
        />
      </div>

      <div className="max-sm:hidden col-span-12 md:col-span-3">{<MemoryPreview />}</div>

      <div className="max-sm:hidden md:col-span-3 overflow-hidden">
        <KnowledgeBase currentInstruction={clickedInstruction ?? currentInstruction} />
      </div>

      <div className="md:hidden col-span-12 order-last" ref={mobileView}>
        <MobileKnowledgeBase
          currentInstruction={clickedInstruction ?? currentInstruction}
          open={clickedInstruction !== null && isMobileViewActive()}
          onClose={() => setClickedInstruction(null)}
        />
      </div>

      <div className="col-span-12 md:col-span-4 max-sm:order-first flex items-center justify-between my-3">
        <div className={`flex items-center space-x-2 ${!program.length ? "invisible" : "visible"}`}>
          <Label htmlFor="instruction-mode">ASM</Label>
          <Switch
            disabled={isProgramEditMode}
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
            disabled={!program.length || isAsmError}
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

function App() {
  const debuggerActions = useDebuggerActions();
  const { pvmInitialized, initialState, program } = useAppSelector((state) => state.debugger);

  return (
    <>
      <Header />
      <div className="p-3 text-left w-screen">
        <div className="flex flex-col gap-5">
          <div className="grid grid-rows md:grid-cols-12 gap-1.5 pt-2">
            {pvmInitialized ? <DebuggerControlls /> : null}

            <div
              className={classNames("col-span-12 max-sm:order-first flex align-middle items-center justify-end", {
                "md:col-span-6": pvmInitialized,
              })}
            >
              <div className="w-full md:w-[350px]">
                <PvmSelect onValueChange={(selectedPvms) => debuggerActions.handlePvmTypeChange(selectedPvms)} />
              </div>
              <NumeralSystemSwitch className="hidden md:flex ml-3" />
            </div>

            {pvmInitialized ? (
              <DebuggerContent />
            ) : (
              <div className="col-span-12 flex justify-center h-[50vh] align-middle">
                <div className="min-w-[50vw] max-md:w-[100%] min-h-[500px] h-[75vh] flex flex-col">
                  <Loader initialState={initialState} program={program} />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      <ToastContainer />
    </>
  );
}

export default App;
