import "./App.css";
import { Button } from "@/components/ui/button";
import { useMemo, useState } from "react";
import { ProgramUpload } from "./components/ProgramUpload";
import { Instructions } from "./components/Instructions";
import { InitialParams } from "./components/InitialParams";
import { ExpectedState, InitialState, PageMapItem } from "./types/pvm";
import { DiffChecker } from "./components/DiffChecker";
import { Pvm } from "../node_modules/typeberry/packages/pvm/pvm";

import { CurrentInstruction, initPvm, nextInstruction } from "./components/Debugger/debug";
import { Play, RefreshCcw, StepForward } from "lucide-react";
import { Status } from "../node_modules/typeberry/packages/pvm/status";
import { disassemblify } from "./pvm-packages/pvm/disassemblify";

function App() {
  const [program, setProgram] = useState([0, 0, 3, 8, 135, 9, 249]);
  const [initialState, setInitialState] = useState<InitialState>({
    regs: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    pc: 0,
    pageMap: [],
    memory: [],
    gas: 10000,
  });
  const [programPreviewResult, setProgramPreviewResult] = useState<unknown[]>([]);
  const [expectedResult, setExpectedResult] = useState<ExpectedState>();
  const [currentInstruction, setCurrentInstruction] = useState<CurrentInstruction>();

  const [pvm, setPvm] = useState<Pvm>();
  const [isDebugFinished, setIsDebugFinished] = useState(false);

  const handleClick = () => {
    window.scrollTo(0, 0);

    const result = disassemblify(new Uint8Array(program));
    console.log(result);
    setProgramPreviewResult(result);
    // setProgramRunResult(result.programRunResult);
  };

  const currentState = useMemo(
    () =>
      pvm && {
        pc: pvm.getPC(),
        regs: Array.from(pvm.getRegisters()) as [number, number, number, number, number, number, number, number, number, number, number, number, number],
        gas: pvm.getGas(),
        pageMap: pvm.getMemory() as unknown as PageMapItem[],
        memory: pvm.getMemory(),
        status: pvm.getStatus() as unknown as "trap" | "halt",
      },
    [pvm],
  );

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
      <div className="p-3 text-left w-screen">
        <div className="grid grid-cols-12 gap-1.5 divide-x">
          <div className="col-span-3">
            <ProgramUpload
              onFileUpload={({ expected, initial, program }) => {
                setExpectedResult(expected);
                setInitialState(initial);
                setProgram(program);

                setIsDebugFinished(false);
                setPvm(initPvm(program, initial));

                const result = disassemblify(new Uint8Array(program));
                setProgramPreviewResult(result);
              }}
            />

            <div className="flex justify-end align-middle my-4">
              <Button
                className="mx-2"
                onClick={() => {
                  setIsDebugFinished(false);
                  setPvm(initPvm(program, initialState));
                }}
              >
                <RefreshCcw />
                Restart
              </Button>
              <Button className="mx-2" onClick={handleClick}>
                <Play />
                Run
              </Button>
              <Button className="mx-2" onClick={onNext} disabled={isDebugFinished}>
                <StepForward /> Step
              </Button>
            </div>

            <InitialParams program={program} setProgram={setProgram} initialState={initialState} setInitialState={setInitialState} />
          </div>

          <div className="col-span-6 h-100">
            <Instructions programPreviewResult={programPreviewResult} currentInstruction={currentInstruction} />
          </div>
          <DiffChecker actual={currentState} expected={expectedResult} />
        </div>
      </div>
    </>
  );
}

export default App;
