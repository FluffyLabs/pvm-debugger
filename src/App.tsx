import "./App.css";
import { Button } from "@/components/ui/button";
import { InitialState, Pvm } from "@/pvm-packages/pvm/pvm.ts";
import { useState } from "react";
import { DiffChecker } from "./components/DiffChecker";
import { ProgramUpload } from "./components/ProgramUpload";
import { ExpectedState } from "./components/ProgramUpload/types";
import { Instructions } from "./components/Instructions";
import { InitialParams } from "./components/InitialParams";

function App() {
  const [program, setProgram] = useState([0, 0, 3, 8, 135, 9, 249]);
  const [initialState, setInitialState] = useState<InitialState>({
    regs: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    pc: 0,
    pageMap: [],
    memory: [],
    gas: 10000,
  });
  const [programPreviewResult, setProgramPreviewResult] = useState<unknown[]>();
  const [programRunResult, setProgramRunResult] = useState<unknown>();
  const [expectedResult, setExpectedResult] = useState<ExpectedState>();

  const handleClick = () => {
    window.scrollTo(0, 0);

    const pvm = new Pvm(new Uint8Array(program), initialState);
    setProgramPreviewResult(pvm.printProgram());

    pvm.runProgram();
    setProgramRunResult(pvm.getState());
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
              }}
            />

            <div className="text-right">
              <Button className="my-2" onClick={handleClick}>
                Check program
              </Button>
            </div>

            <InitialParams program={program} setProgram={setProgram} initialState={initialState} setInitialState={setInitialState} />
          </div>

          <Instructions programPreviewResult={programPreviewResult} />
          <DiffChecker actual={programRunResult as ReturnType<Pvm["getState"]>} expected={expectedResult} />
        </div>
      </div>
    </>
  );
}

export default App;
