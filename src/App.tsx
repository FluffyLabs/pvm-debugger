import "./App.css";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { Instructions } from "./components/Instructions";
import { Registers } from "./components/Registers";
import { ExpectedState, InitialState, PageMapItem, Pvm, RegistersArray, Status } from "./types/pvm";

import { CurrentInstruction, initPvm, nextInstruction } from "./components/Debugger/debug";
import { Play, RefreshCcw, StepForward } from "lucide-react";
import { disassemblify } from "./pvm-packages/pvm/disassemblify";
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

  const [pvm, setPvm] = useState<Pvm>();
  const [isDebugFinished, setIsDebugFinished] = useState(false);
  const [isInitialCTA, setIsInitialCTA] = useState(true);

  useEffect(() => {
    if (pvm) {
      const currentState = {
        pc: pvm.getPC(),
        regs: Array.from(pvm.getRegisters()) as RegistersArray,
        gas: pvm.getGas(),
        pageMap: pvm.getMemory() as unknown as PageMapItem[],
        memory: pvm.getMemory(),
        status: pvm.getStatus() as unknown as Status,
      };
      setCurrentState((prevState) => {
        setPreviousState(prevState);
        return currentState;
      });
    }
  }, [pvm, currentInstruction]);

  const handleFileUpload = ({ /*expected, */ initial, program }: ProgramUploadFileOutput) => {
    // setExpectedResult(expected);
    setInitialState(initial);
    setProgram(program);

    setIsDebugFinished(false);
    setPvm(initPvm(program, initial));

    const result = disassemblify(new Uint8Array(program));
    setProgramPreviewResult(result);
  };

  const onNext = () => {
    if (!pvm) return;

    const result = nextInstruction(pvm, program);

    setCurrentInstruction(result);
    setIsProgramEditMode(false);

    if (pvm.nextStep() !== Status.OK) {
      setIsDebugFinished(true);
      setPvm(undefined);
    }
  };

  const handleRunProgram = () => {
    if (!pvm) return;

    setIsProgramEditMode(false);
    pvm?.runProgram();
    setCurrentInstruction({} as CurrentInstruction);
  };

  const restartProgram = () => {
    setIsDebugFinished(false);
    setPvm(initPvm(program, initialState));
    setCurrentState(initialState);
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
                  setIsDebugFinished(false);
                  setPvm(initPvm(program, initialState));
                  setCurrentState(initialState);
                }}
              >
                <RefreshCcw className="w-3.5 mr-1.5" />
                Restart
              </Button>
              <Button className="mr-3" onClick={handleRunProgram}>
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
                  setCurrentState(state);
                  setPvm(initPvm(program, state));
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
                      restartProgram();
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
