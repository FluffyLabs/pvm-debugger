import "./App.css";
import { Button } from "@/components/ui/button";
import { useState } from "react";
// import { DiffChecker } from "./components/DiffChecker";
import { ProgramUpload } from "./components/ProgramUpload";
import { Instructions } from "./components/Instructions";
import { InitialParams } from "./components/InitialParams";
import { ExpectedState, InitialState } from "./types/pvm";
import { ProgramDecoder } from "./pvm-packages/pvm/program-decoder/program-decoder";
import { ArgsDecoder } from "./pvm-packages/pvm/args-decoder/args-decoder";
import { byteToOpCodeMap } from "./pvm-packages/pvm/assemblify";
import { Status } from "typeberry/packages/pvm/status";
import { Pvm } from "typeberry/packages/pvm/pvm";

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
    // setProgramPreviewResult(pvm.printProgram());

    // pvm.runProgram();
    // setProgramRunResult(pvm.getState());

    const programDecoder = new ProgramDecoder(new Uint8Array(program));
    const code = programDecoder.getCode();
    const mask = programDecoder.getMask();
    const argsDecoder = new ArgsDecoder(code, mask);

    const newProgramPreviewResult = [];
    while (pvm.nextStep() === Status.OK) {
      const currentInstruction = code[pvm.getPC()];
      const args = argsDecoder.getArgs(pvm.getPC()) as any;

      const currentInstructionDebug = {
        instructionCode: currentInstruction,
        ...byteToOpCodeMap[currentInstruction],
        args: {
          ...args,
          immediate: args.immediateDecoder?.getUnsigned(),
        },
      };

      // newProgramPreviewResult.push({
      //   instructionCode: pvm.getPC(),
      //   name: pvm,
      //   gas: pvm.getGas(),
      //   regs: pvm.getRegisters(),
      // });
      console.log(currentInstructionDebug);
      newProgramPreviewResult.push(currentInstructionDebug);
    }

    setProgramPreviewResult(newProgramPreviewResult);
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
          {/* <DiffChecker actual={programRunResult as ReturnType<Pvm["getState"]>} expected={expectedResult} /> */}
        </div>
      </div>
    </>
  );
}

export default App;
