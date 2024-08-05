import "./App.css";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { ProgramUpload } from "./components/ProgramUpload";
import { Instructions } from "./components/Instructions";
import { InitialParams } from "./components/InitialParams";
import { ExpectedState, InitialState } from "./types/pvm";
import { Status } from "../node_modules/typeberry/packages/pvm/status";
import { Pvm } from "../node_modules/typeberry/packages/pvm/pvm";
import { DiffChecker } from "./components/DiffChecker";

// The only files we need from PVM repo:
import { ProgramDecoder } from "./pvm-packages/pvm/program-decoder/program-decoder";
import { ArgsDecoder } from "./pvm-packages/pvm/args-decoder/args-decoder";
import { byteToOpCodeMap } from "./pvm-packages/pvm/assemblify";

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
    const programDecoder = new ProgramDecoder(new Uint8Array(program));
    const code = programDecoder.getCode();
    const mask = programDecoder.getMask();
    const argsDecoder = new ArgsDecoder(code, mask);

    const newProgramPreviewResult = [];

    do {
      const currentInstruction = code[pvm.getPC()];

      let args;

      try {
        args = argsDecoder.getArgs(pvm.getPC()) as any;

        const currentInstructionDebug = {
          instructionCode: currentInstruction,
          ...byteToOpCodeMap[currentInstruction],
          args: {
            ...args,
            immediate: args.immediateDecoder?.getUnsigned(),
          },
        };
        newProgramPreviewResult.push(currentInstructionDebug);
      } catch (e) {
        // The last iteration goes here since there's no instruction to proces and we didn't check if there's a next operation
        break;
        // newProgramPreviewResult.push({ instructionCode: currentInstruction, ...byteToOpCodeMap[currentInstruction], error: "Cannot get arguments from args decoder" });
      }
    } while (pvm.nextStep() === Status.OK);

    setProgramRunResult({
      pc: pvm.getPC(),
      regs: Array.from(pvm.getRegisters()),
      gas: pvm.getGas(),
      pageMap: pvm.getMemory(),
      memory: pvm.getMemory(),
      status: pvm.getStatus(),
    });

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
          <DiffChecker actual={programRunResult} expected={expectedResult} />
        </div>
      </div>
    </>
  );
}

export default App;
