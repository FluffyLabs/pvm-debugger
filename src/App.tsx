import "./App.css";
import { Button } from "@/components/ui/button";
import { useCallback, useEffect, useRef, useState } from "react";
import { Instructions } from "./components/Instructions";
import { Registers } from "./components/Registers";
import { CurrentInstruction, ExpectedState, InitialState, Status } from "./types/pvm";

import { disassemblify } from "./packages/pvm/pvm/disassemblify";
import { Play, RefreshCcw, StepForward, Check } from "lucide-react";
import { Header } from "@/components/Header";
import { ProgramLoader } from "@/components/ProgramLoader";
import { MemoryPreview } from "@/components/MemoryPreview";
import { KnowledgeBase } from "@/components/KnowledgeBase";
import { ProgramUpload } from "@/components/ProgramUpload";
import { ProgramUploadFileOutput } from "@/components/ProgramUpload/types.ts";
import { Switch } from "@/components/ui/switch.tsx";
import { Label } from "@/components/ui/label.tsx";
import { InstructionMode } from "@/components/Instructions/types.ts";
import { PvmSelect } from "@/components/PvmSelect";
import { NumeralSystemSwitch } from "@/components/NumeralSystemSwitch";
import { wasmWorker as worker } from "./packages/web-worker";

import { Commands, TargerOnMessageParams } from "./packages/web-worker/worker";
import { InitialLoadProgramCTA } from "@/components/InitialLoadProgramCTA";
import { MobileRegisters } from "./components/MobileRegisters";
import { MobileKnowledgeBase } from "./components/KnowledgeBase/Mobile";
import { virtualTrapInstruction } from "./utils/virtualTrapInstruction";

function App() {
  const [program, setProgram] = useState<number[]>([]);
  const [isProgramEditMode, setIsProgramEditMode] = useState(false);
  const [initialState, setInitialState] = useState<InitialState>({
    regs: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    pc: 0,
    pageMap: [],
    memory: [],
    gas: 10000,
  });
  const [programPreviewResult, setProgramPreviewResult] = useState<CurrentInstruction[]>([]);
  const [currentInstruction, setCurrentInstructionState] = useState<CurrentInstruction>();
  const [clickedInstruction, setClickedInstruction] = useState<CurrentInstruction | null>(null);
  const [instructionMode, setInstructionMode] = useState<InstructionMode>(InstructionMode.ASM);
  const [currentState, setCurrentState] = useState<ExpectedState>(initialState as ExpectedState);
  const [previousState, setPreviousState] = useState<ExpectedState>(initialState as ExpectedState);
  const [breakpointAddresses, setBreakpointAddresses] = useState<(number | undefined)[]>([]);
  const [isRunMode, setIsRunMode] = useState(false);

  const [isDebugFinished, setIsDebugFinished] = useState(false);
  const [pvmInitialized, setPvmInitialized] = useState(false);

  const mobileView = useRef<HTMLDivElement | null>(null);

  const setCurrentInstruction = useCallback((ins: CurrentInstruction | null) => {
    if (ins === null) {
      setCurrentInstruction(virtualTrapInstruction);
    } else {
      setCurrentInstructionState(ins);
    }
    setClickedInstruction(null);
  }, []);

  useEffect(() => {
    worker.postMessage({ command: "load" });
  }, []);

  useEffect(() => {
    if (!worker) {
      return;
    }

    worker.onmessage = (e: MessageEvent<TargerOnMessageParams>) => {
      if (e.data.command === Commands.STEP) {
        const { state, isFinished, isRunMode } = e.data.payload;
        setCurrentState((prevState) => {
          setPreviousState(prevState);
          return state;
        });

        if (e.data.command === Commands.STEP) {
          setCurrentInstruction(e.data.payload.result);
        }

        if (isRunMode && !isFinished && !breakpointAddresses.includes(state.pc)) {
          worker.postMessage({ command: "step", payload: { program } });
        }

        if (isRunMode && breakpointAddresses.includes(state.pc)) {
          worker.postMessage({ command: "stop", payload: { program } });
          setIsRunMode(false);
        }

        if (isFinished) {
          setIsDebugFinished(true);
        }
      }
    };
  }, [isRunMode, breakpointAddresses, currentState, program, setCurrentInstruction, programPreviewResult]);

  const startProgram = (initialState: ExpectedState, program: number[]) => {
    setInitialState(initialState);
    setProgram(program);
    const currentState = {
      pc: 0,
      regs: initialState.regs,
      gas: initialState.gas,
      status: Status.OK,
    };
    setCurrentState(currentState);
    setPreviousState(currentState);

    setIsDebugFinished(false);

    worker.postMessage({ command: "init", payload: { program, initialState } });

    try {
      const result = disassemblify(new Uint8Array(program));
      console.info("Disassembly result:", result);
      setProgramPreviewResult(result);
      setCurrentInstruction(result?.[0]);
      setPvmInitialized(true);
    } catch (e) {
      console.log("Error disassembling program", e);
    }
  };

  const handleFileUpload = ({ initial, program }: ProgramUploadFileOutput) => {
    startProgram(initial, program);
  };

  const onNext = () => {
    setIsRunMode(false);

    if (!pvmInitialized) {
      startProgram(initialState, program);
    }

    if (!currentInstruction) {
      setCurrentState(initialState);
    } else {
      worker.postMessage({ command: "step", payload: { program } });
    }

    setIsProgramEditMode(false);
  };

  const handleRunProgram = () => {
    if (!pvmInitialized) {
      startProgram(initialState, program);
    }
    setIsRunMode(true);
    worker.postMessage({ command: "run", payload: { program } });
    worker.postMessage({ command: "step", payload: { program } });
  };

  const restartProgram = (state: InitialState) => {
    setIsDebugFinished(false);
    setCurrentState(state);
    setPreviousState(state);
    setCurrentInstruction(programPreviewResult?.[0]);
    worker.postMessage({ command: "init", payload: { program, initialState: state } });
  };

  const handleBreakpointClick = (address: number) => {
    if (breakpointAddresses.includes(address)) {
      setBreakpointAddresses(breakpointAddresses.filter((x) => x !== address));
    } else {
      setBreakpointAddresses([...breakpointAddresses, address]);
    }
  };
  const onInstructionClick = useCallback((row: CurrentInstruction) => {
    setClickedInstruction(row);
  }, []);

  const isMobileViewActive = () => {
    return mobileView?.current?.offsetParent !== null;
  };

  return (
    <>
      <Header />
      <div className="p-3 text-left w-screen">
        <div className="flex flex-col gap-5">
          <div className="grid grid-rows md:grid-cols-12 gap-1.5 pt-2">
            <div className="col-span-12 md:col-span-6 max-sm:order-2 flex align-middle max-sm:justify-between mb-3">
              <div className="md:mr-3">
                <ProgramUpload onFileUpload={handleFileUpload} program={program} />
              </div>
              <Button
                className="md:mr-3 hidden-button"
                disabled={!program.length}
                onClick={() => {
                  if (isProgramEditMode) {
                    startProgram(initialState, program);
                    setIsProgramEditMode(false);
                  } else {
                    restartProgram(initialState);
                    setIsProgramEditMode(true);
                  }
                }}
              >
                {isProgramEditMode ? <Check /> : "Edit"}
              </Button>
              <Button
                className="md:mr-3"
                onClick={() => {
                  restartProgram(initialState);
                  setCurrentInstruction(programPreviewResult?.[0]);
                }}
                disabled={!pvmInitialized}
              >
                <RefreshCcw className="w-3.5 md:mr-1.5" />
                <span className="hidden md:block">Reset</span>
              </Button>
              <Button className="md:mr-3" onClick={handleRunProgram} disabled={isDebugFinished || !pvmInitialized}>
                <Play className="w-3.5 md:mr-1.5" />
                <span className="hidden md:block">Run</span>
              </Button>
              <Button className="md:mr-3" onClick={onNext} disabled={isDebugFinished || !pvmInitialized}>
                <StepForward className="w-3.5 md:mr-1.5" />
                <span className="hidden md:block">Step</span>
              </Button>
            </div>

            <div className="col-span-12 md:col-span-6 max-sm:order-first flex align-middle items-center justify-end">
              <div className="w-full md:w-[300px]">
                <PvmSelect />
              </div>
              <NumeralSystemSwitch className="hidden md:flex ml-3" />
            </div>

            <div className="col-span-12 md:col-span-4 max-sm:max-h-[70vh] max-sm:min-h-[330px]">
              {!program.length && <InitialLoadProgramCTA />}
              {!!program.length && (
                <>
                  {isProgramEditMode && (
                    <>
                      <ProgramLoader program={program} setProgram={setProgram} />
                    </>
                  )}

                  {!isProgramEditMode && (
                    <>
                      <Instructions
                        status={currentState.status}
                        currentState={currentState}
                        programPreviewResult={programPreviewResult}
                        instructionMode={instructionMode}
                        onAddressClick={handleBreakpointClick}
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
                  restartProgram(state);
                }}
                allowEditing={isProgramEditMode}
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
              <KnowledgeBase currentInstruction={clickedInstruction ?? currentInstruction} />
            </div>

            <div className="md:hidden col-span-12 order-last" ref={mobileView}>
              <MobileKnowledgeBase
                currentInstruction={clickedInstruction ?? currentInstruction}
                open={clickedInstruction !== null && isMobileViewActive()}
                onClose={() => setClickedInstruction(null)}
              />
            </div>

            <div className="col-span-12 md:col-span-3 max-sm:order-first flex items-center justify-between my-3">
              <div>
                {!isProgramEditMode && (
                  <div className="flex items-center space-x-2">
                    <Label htmlFor="instruction-mode">ASM</Label>
                    <Switch
                      id="instruction-mode"
                      checked={instructionMode === InstructionMode.BYTECODE}
                      onCheckedChange={(checked) =>
                        setInstructionMode(checked ? InstructionMode.BYTECODE : InstructionMode.ASM)
                      }
                    />
                    <Label htmlFor="instruction-mode">RAW</Label>
                  </div>
                )}
              </div>
              <NumeralSystemSwitch className="ml-3 md:hidden" />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default App;
