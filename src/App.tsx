import "./App.css";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea.tsx";
import { InitialState, Pvm } from "@/pvm-packages/pvm/pvm.ts";
import { useState } from "react";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { DiffChecker } from "./components/DiffChecker";
import { ProgramUpload } from "./components/ProgramUpload";
import { ExpectedState } from "./components/ProgramUpload/types";
import { Instructions } from "./components/Instructions";

function App() {
  const [program, setProgram] = useState([0, 0, 3, 8, 135, 9, 249]);
  const [initialState, setInitialState] = useState<InitialState>({
    regs: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    pc: 0,
    pageMap: [],
    memory: [],
    gas: 10000,
  });
  const [isInvalidProgram, setIsInvalidProgram] = useState(false);
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

            <br />
            <div className="border-2 border-dashed border-sky-500 rounded-md">
              <div className="p-3 grid grid-cols-2">
                <div>
                  <Label htmlFor="registers">Initial registers:</Label>

                  <div className="flex flex-col items-start">
                    {initialState.regs?.map((_, regNo) => (
                      <div className="flex items-center">
                        <Label className="inline-flex w-20" htmlFor={`reg-${regNo}`}>
                          <p>
                            ω<sub>{regNo}</sub>:
                          </p>
                        </Label>
                        <Input
                          className="inline-flex w-14"
                          id={`reg-${regNo}`}
                          type="number"
                          value={initialState.regs?.[regNo]}
                          onChange={(e) => {
                            setInitialState((prevState: any) => ({
                              ...prevState,
                              regs: prevState.regs?.map((val: string, index: number) => (index === regNo ? parseInt(e.target.value) : val)),
                            }));
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-1.5 flex flex-col items-start">
                  <div className="flex flex-col items-start">
                    <Label className="mb-2" htmlFor="initial-pc">
                      Initial PC:
                    </Label>
                    <Input className="mb-5 w-32" id="initial-pc" type="number" value={initialState.pc} onChange={(e) => setInitialState({ ...initialState, pc: parseInt(e.target.value) })} />
                  </div>
                  <div className="flex flex-col items-start">
                    <Label className="mb-2" htmlFor="initial-gas">
                      Initial GAS:
                    </Label>
                    <Input className="w-32" id="initial-gas" type="number" value={initialState.gas} onChange={(e) => setInitialState({ ...initialState, gas: parseInt(e.target.value) })} />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-1.5">
                <div className="p-3 col-span-3 rounded-md">
                  <Label htmlFor="program">PVM program as array of numbers:</Label>
                  <Textarea
                    className="w-full"
                    id="program"
                    placeholder="Paste program as an array of numbers"
                    value={JSON.stringify(program)}
                    onChange={(e) => {
                      console.log(e.target.value);
                      try {
                        JSON.parse(e.target.value);
                        setProgram(JSON.parse(e.target.value));
                        setIsInvalidProgram(false);
                      } catch (e) {
                        console.log("wrong json");
                        setIsInvalidProgram(true);
                      }
                    }}
                  />
                  {isInvalidProgram && <div>Program is not a valid JSON array</div>}
                </div>
              </div>
            </div>
          </div>

          <Instructions programPreviewResult={programPreviewResult} />

          <div className="col-span-3 container py-3 text-left text-xs">
            <div className="p-3 bg-slate-100 rounded-md">
              <DiffChecker actual={programRunResult as ReturnType<Pvm["getState"]>} expected={expectedResult} />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default App;
