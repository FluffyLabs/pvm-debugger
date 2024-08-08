import "./App.css";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { Instructions } from "./components/Instructions";
import { Registers } from "./components/Registers";
import { ExpectedState, InitialState, PageMapItem, Pvm, Status } from "./types/pvm";

import { CurrentInstruction, initPvm, nextInstruction } from "./components/Debugger/debug";
import { Play, RefreshCcw, StepForward } from "lucide-react";
import { disassemblify } from "./pvm-packages/pvm/disassemblify";
import { Header } from "@/components/Header";
import { ProgramLoader } from "@/components/ProgramLoader";
import { MemoryPreview } from "@/components/MemoryPreview";
import { KnowledgeBase } from "@/components/KnowledgeBase";

function App() {
  const [program, setProgram] = useState([0, 0, 3, 8, 135, 9, 249]);
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
  const [currentState, setCurrentState] = useState<ExpectedState>(initialState as ExpectedState);

  const [pvm, setPvm] = useState<Pvm>();
  const [isDebugFinished, setIsDebugFinished] = useState(false);

  const handleClick = () => {
    window.scrollTo(0, 0);

    const result = disassemblify(new Uint8Array(program));
    console.log(result);
    setProgramPreviewResult(result);
    // setProgramRunResult(result.programRunResult);
  };

  useEffect(() => {
    if (pvm) {
      setCurrentState({
        pc: pvm.getPC(),
        regs: Array.from(pvm.getRegisters()) as [number, number, number, number, number, number, number, number, number, number, number, number, number],
        gas: pvm.getGas(),
        pageMap: pvm.getMemory() as unknown as PageMapItem[],
        memory: pvm.getMemory(),
        status: pvm.getStatus() as unknown as "trap" | "halt",
      });
    }
  }, [pvm, currentInstruction]);

  const onNext = () => {
    if (!pvm) return;

    const result = nextInstruction(pvm, program);

    setCurrentInstruction(result);

    if (pvm.nextStep() !== Status.OK) {
      setIsDebugFinished(true);
      setPvm(undefined);
    }
  };

  return (
    <>
      <Header />
      <div className="p-3 text-left w-screen">
        <div className="flex flex-col gap-5 divide-y-2">
          <ProgramLoader
            program={program}
            setProgram={setProgram}
            onFileUpload={({ /*expected, */ initial, program }) => {
              // setExpectedResult(expected);
              setInitialState(initial);
              setProgram(program);

              setIsDebugFinished(false);
              setPvm(initPvm(program, initial));

              const result = disassemblify(new Uint8Array(program));
              setProgramPreviewResult(result);
            }}
          />

          <div className="grid grid-cols-12 gap-1.5 pt-2">
            <div className="col-span-12 flex align-middle my-3">
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
              <Button className="mr-3" onClick={handleClick}>
                <Play className="w-3.5 mr-1.5" />
                Run
              </Button>
              <Button className="mr-3" onClick={onNext} disabled={isDebugFinished}>
                <StepForward className="w-3.5 mr-1.5" /> Step
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-[3fr_200px_3fr_3fr] gap-1.5 pt-2">
            <div>
              <Instructions programPreviewResult={programPreviewResult} currentInstruction={currentInstruction} />
            </div>

            <div>
              <Registers currentState={currentState} setCurrentState={setCurrentState} />
            </div>

            <div>
              <MemoryPreview />
            </div>

            <div>
              <KnowledgeBase currentInstruction={currentInstruction} />
            </div>

            {/*<DiffChecker actual={currentState} expected={expectedResult} />*/}
          </div>
        </div>
      </div>
    </>
  );
}

export default App;
