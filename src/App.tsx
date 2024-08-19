import "./App.css";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { Instructions } from "./components/Instructions";
import { Registers } from "./components/Registers";
import { CurrentInstruction, ExpectedState, InitialState } from "./types/pvm";

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
import { worker } from "./packages/web-worker";

import { Commands, TargerOnMessageParams } from "./packages/web-worker/worker";
import { InitialLoadProgramCTA } from "@/components/InitialLoadProgramCTA";
import { MobileRegisters } from "./components/MobileRegisters";
import { MobileKnowledgeBase } from "./components/KnowledgeBase/Mobile";

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
  const [currentInstruction, setCurrentInstruction] = useState<CurrentInstruction>();
  const [instructionMode, setInstructionMode] = useState<InstructionMode>(InstructionMode.ASM);
  const [currentState, setCurrentState] = useState<ExpectedState>(initialState as ExpectedState);
  const [previousState, setPreviousState] = useState<ExpectedState>(initialState as ExpectedState);

  const [isDebugFinished, setIsDebugFinished] = useState(false);
  const [pvmInitialized, setPvmInitialized] = useState(false);

  useEffect(() => {
    if (!worker) {
      return;
    }

    worker.onmessage = (e: MessageEvent<TargerOnMessageParams>) => {
      if (e.data.command === Commands.STEP || e.data.command === Commands.RUN) {
        const { state, isFinished } = e.data.payload;
        setCurrentState((prevState) => {
          setPreviousState(prevState);
          return state;
        });

        if (e.data.command === Commands.STEP) {
          setCurrentInstruction(e.data.payload.result);
        } else if (e.data.command === Commands.RUN) {
          setCurrentInstruction(programPreviewResult?.[0]);
        }

        if (isFinished) {
          setIsDebugFinished(true);
        }
      }
    };
    console.log("Message posted to worker");
  }, []);

  const startProgram = (initialState: ExpectedState, program: number[]) => {
    setInitialState(initialState);
    setProgram(program);

    setIsDebugFinished(false);

    worker.postMessage({ command: "init", payload: { program, initialState } });

    try {
      const result = disassemblify(new Uint8Array(program));
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
    console.log({
      pvmInitialized,
      currentInstruction,
    });
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
    setIsProgramEditMode(false);
    setIsDebugFinished(true);
    worker.postMessage({ command: "run", payload: { program } });
  };

  const restartProgram = (state: InitialState) => {
    setIsDebugFinished(false);
    setCurrentState(state);
    setPreviousState(state);
    setCurrentInstruction(programPreviewResult?.[0]);
    worker.postMessage({ command: "init", payload: { program, initialState: state } });
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
                className="md:mr-3"
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

            <div className="col-span-12 md:col-span-4 max-sm:max-h-[20vh] max-sm:min-h-[150px]">
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
                        programPreviewResult={programPreviewResult}
                        currentInstruction={currentInstruction}
                        instructionMode={instructionMode}
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
              <KnowledgeBase currentInstruction={currentInstruction} />
            </div>

            <div className="md:hidden col-span-12 order-last">
              <MobileKnowledgeBase currentInstruction={currentInstruction} />
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
