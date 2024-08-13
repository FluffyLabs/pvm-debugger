import "./App.css";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { Instructions } from "./components/Instructions";
import { Registers } from "./components/Registers";
import { CurrentInstruction, ExpectedState, InitialState } from "./types/pvm";

import { disassemblify } from "./packages/pvm/pvm/disassemblify";
import { Play, RefreshCcw, StepForward } from "lucide-react";
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

function App() {
  const [program, setProgram] = useState<number[]>([]);
  const [isProgramEditMode, setIsProgramEditMode] = useState(true);
  const [initialState, setInitialState] = useState<InitialState>({
    regs: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    pc: 0,
    pageMap: [],
    memory: [],
    gas: 10000,
  });
  const [programPreviewResult, setProgramPreviewResult] = useState<CurrentInstruction[]>([]);
  // const [expectedResult, setExpectedResult] = useState<ExpectedState>();
  const [currentInstruction, setCurrentInstruction] = useState<CurrentInstruction>();
  const [instructionMode, setInstructionMode] = useState<InstructionMode>(InstructionMode.ASM);
  const [currentState, setCurrentState] = useState<ExpectedState>(initialState as ExpectedState);
  const [previousState, setPreviousState] = useState<ExpectedState>(initialState as ExpectedState);

  const [isDebugFinished, setIsDebugFinished] = useState(false);
  const [isInitialCTA, setIsInitialCTA] = useState(true);
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
    const result = disassemblify(new Uint8Array(program));
    setProgramPreviewResult(result);
    setCurrentInstruction(result?.[0]);
    setPvmInitialized(true);
  };

  const handleFileUpload = ({ /*expected, */ initial, program }: ProgramUploadFileOutput) => {
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
          <div className="grid grid-cols-12 gap-1.5 pt-2">
            <div className="col-span-6 flex align-middle">
              <Button
                className="mr-3"
                onClick={() => {
                  restartProgram(initialState);
                  setCurrentInstruction(programPreviewResult?.[0]);
                }}
              >
                <RefreshCcw className="w-3.5 mr-1.5" />
                Restart
              </Button>
              <Button className="mr-3" onClick={handleRunProgram} disabled={isDebugFinished}>
                <Play className="w-3.5 mr-1.5" />
                Run
              </Button>
              <Button className="mr-3" onClick={onNext} disabled={isDebugFinished}>
                <StepForward className="w-3.5 mr-1.5" /> Step
              </Button>
            </div>

            <div className="col-span-6 flex align-middle justify-end gap-10">
              <PvmSelect />
              <NumeralSystemSwitch />
            </div>
          </div>

          <div className="grid auto-rows-fr grid-cols-[3fr_200px_3fr_3fr] gap-1.5 pt-2">
            <div>
              {isInitialCTA && (
                <InitialLoadProgramCTA
                  onFileUpload={(uploadedProgram) => {
                    handleFileUpload(uploadedProgram);
                    setIsInitialCTA(false);
                  }}
                  onEditClick={() => {
                    setIsInitialCTA(false);
                  }}
                />
              )}
              {!isInitialCTA && (
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

            <div>
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

            <div>
              <MemoryPreview />
            </div>

            <div>
              <KnowledgeBase currentInstruction={currentInstruction} />
            </div>

            {/*<DiffChecker actual={currentState} expected={expectedResult} />*/}
          </div>

          <div className="grid grid-cols-[3fr_200px_3fr_3fr] gap-1.5">
            <div className="flex items-center justify-between">
              <div>
                {isProgramEditMode && <ProgramUpload onFileUpload={handleFileUpload} />}
                {!isProgramEditMode && (
                  <Button
                    onClick={() => {
                      restartProgram(initialState);
                      setIsProgramEditMode(true);
                    }}
                  >
                    Edit program
                  </Button>
                )}
              </div>
              <div>
                {!isProgramEditMode && (
                  <div className="flex items-center space-x-2">
                    <Label htmlFor="instruction-mode">ASM</Label>
                    <Switch
                      id="instruction-mode"
                      onCheckedChange={(checked) =>
                        setInstructionMode(checked ? InstructionMode.BYTECODE : InstructionMode.ASM)
                      }
                    />
                    <Label htmlFor="instruction-mode">Bytecode</Label>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default App;
