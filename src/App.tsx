import "./App.css";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea.tsx";
import { InitialState, Pvm } from "@/pvm-packages/pvm/pvm.ts";
import { useState } from "react";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";

function App() {
  const [program, setProgram] = useState([0, 0, 3, 8, 135, 9, 249]);
  const [initialState, setInitialState] = useState<InitialState>({
    regs: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    pc: 0,
    pageMap: [],
    memory: [],
    gas: 10000,
  });
  const [programInput, setProgramInput] = useState("[0, 0, 3, 8, 135, 9, 249]");
  const [isInvalidProgram, setIsInvalidProgram] = useState(false);
  // const [registersInput, setRegistersInput] = useState("[0,0,0,0,0,0,0,0,0,0,0,0,0]");
  // const [isInvalidRegisterTable, setIsInvalidRegisterTable] = useState(false);
  const [programPreviewResult, setProgramPreviewResult] = useState<unknown[]>();
  const [programRunResult, setProgramRunResult] = useState<unknown>();
  let fileReader: FileReader;
  // const program = [0, 0, 3, 8, 135, 9, 249]

  const handleClick = () => {
    window.scrollTo(0, 0);

    const pvm = new Pvm(new Uint8Array(program), initialState);

    // console.log({
    //   printed: pvm.printProgram()
    // })

    setProgramPreviewResult(pvm.printProgram());

    pvm.runProgram();
    setProgramRunResult(pvm.getState());
  };

  const handleFileRead = () => {
    const fileContent = fileReader?.result;

    try {
      if (fileContent !== null && typeof fileContent === "string") {
        const jsonFile = JSON.parse(fileContent);

        setInitialState({
          regs: jsonFile["initial-regs"],
          pc: jsonFile["initial-pc"],
          pageMap: jsonFile["initial-page-map"],
          memory: jsonFile["initial-memory"],
          gas: jsonFile["initial-gas"],
        });
        setProgram(jsonFile["program"]);
        // setRegistersInput(JSON.stringify(jsonFile["initial-regs"]));
        setProgramInput(JSON.stringify(jsonFile["program"]));
      } else {
        alert("Cannot read file");
      }
    } catch (e) {
      alert("Cannot parse JSON");
    }
  };

  const handleProgramUpload = (file: Blob) => {
    fileReader = new FileReader();
    fileReader.onloadend = handleFileRead;
    fileReader.readAsText(file);
  };

  return (
    <>
      <div className="p-3 text-left w-screen">
        <div className="grid grid-cols-12 gap-1.5">
          <div className="col-span-3">
            <div className="bg-sky-200 p-3">
              <Label htmlFor="test-file">Load test from json file:</Label>
              <Input
                id="test-file"
                type="file"
                accept="application/json"
                onChange={(e) => {
                  if (e.target.files?.length) {
                    handleProgramUpload(e.target.files[0]);
                  }
                }}
              />
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
                          ω<sub>{regNo}</sub>:
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
                    value={programInput}
                    onChange={(e) => {
                      console.log(e.target.value);
                      try {
                        setProgramInput(e.target.value);
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

            <div className="text-right">
              <Button className="my-2" onClick={handleClick}>
                Check program
              </Button>
            </div>
          </div>

          <div className="col-span-6 container py-3 font-mono">
            <Label>Instructions:</Label>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Gas</TableHead>
                  <TableHead>Args</TableHead>
                  <TableHead>Errors</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!!programPreviewResult?.length &&
                  programPreviewResult.map((programRow: any) => (
                    <TableRow>
                      <TableCell>{programRow.instructionCode}</TableCell>
                      <TableCell className="uppercase font-bold">{programRow.name}</TableCell>
                      <TableCell>{programRow.gas}</TableCell>
                      <TableCell className="text-xs text-left">
                        <pre>{JSON.stringify(programRow.args, null, 2)}</pre>
                      </TableCell>
                      <TableCell>{programRow.error}</TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </div>

          <div className="col-span-3 container py-3 text-left text-xs">
            <div className="grid grid-cols-2 p-3 bg-slate-100 rounded-md">
              {/*<pre className="p-3">*/}
              {/*  <code>Program preview: {JSON.stringify(programPreviewResult, null, 2)}</code>*/}
              {/*</pre>*/}

              <pre className="p-3">
                <code>Program run result: {JSON.stringify(programRunResult, null, 2)}</code>
              </pre>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default App;
