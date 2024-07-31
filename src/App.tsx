import "./App.css";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea.tsx";
import { InitialState, Pvm } from "@/pvm-packages/pvm/pvm.ts";
import { useState } from "react";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { ArgumentType } from "@/pvm-packages/pvm/args-decoder/argument-type.ts";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card.tsx";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible.tsx";
// import {ChevronsUpDown} from "lucide-react";
import { DiffChecker, ExpectedState } from "./components/DiffChecker";

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
  const [expectedResult, setExpectedResult] = useState<ExpectedState>();
  let fileReader: FileReader;

  const handleClick = () => {
    window.scrollTo(0, 0);

    const pvm = new Pvm(new Uint8Array(program), initialState);
    setProgramPreviewResult(pvm.printProgram());

    pvm.runProgram();
    setProgramRunResult(pvm.getState());
  };

  const handleFileRead = () => {
    const fileContent = fileReader?.result;

    try {
      if (fileContent !== null && typeof fileContent === "string") {
        const jsonFile = JSON.parse(fileContent);
        setExpectedResult({
          gas: jsonFile["expected-gas"],
          memory: jsonFile["expected-memory"],
          pc: jsonFile["expected-pc"],
          regs: jsonFile["expected-regs"],
          status: jsonFile["expected-status"],
        });
        setInitialState({
          regs: jsonFile["initial-regs"],
          pc: jsonFile["initial-pc"],
          pageMap: jsonFile["initial-page-map"],
          memory: jsonFile["initial-memory"],
          gas: jsonFile["initial-gas"],
        });
        setProgram(jsonFile["program"]);
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

  const mapInstructionsArgsByType = (args: any) => {
    switch (args?.type) {
      case ArgumentType.NO_ARGUMENTS:
        return "";
      case ArgumentType.ONE_IMMEDIATE:
        return <span>${args?.immediate}</span>;
      case ArgumentType.TWO_IMMEDIATE:
        // return `imm1: ${args?.immediate1}, imm2: ${args?.immediate2}`;
        return (
          <span>
            {args?.immediate1}, {args?.immediate2}
          </span>
        );
      case ArgumentType.ONE_OFFSET:
        return <span>{args?.offset}</span>;
      case ArgumentType.ONE_REGISTER_ONE_IMMEDIATE:
        return (
          <span>
            ω<sub>{args?.firstRegisterIndex}</sub>, ${args?.immediate}
          </span>
        );
      case ArgumentType.ONE_REGISTER_TWO_IMMEDIATE:
        return (
          <span>
            ω<sub>{args?.firstRegisterIndex}</sub>, ${args?.immediate1}, ${args?.immediate2}
          </span>
        );
      case ArgumentType.ONE_REGISTER_ONE_IMMEDIATE_ONE_OFFSET:
        return (
          <span>
            ω<sub>{args?.firstRegisterIndex}</sub>, ${args?.immediate}, {args?.offset}
          </span>
        );
      case ArgumentType.TWO_REGISTERS:
        return (
          <span>
            ω<sub>{args?.firstRegisterIndex}</sub>, ω<sub>{args?.secondRegisterIndex}</sub>
          </span>
        );
      case ArgumentType.TWO_REGISTERS_ONE_IMMEDIATE:
        return (
          <span>
            ω<sub>{args?.firstRegisterIndex}</sub>, ω<sub>{args?.secondRegisterIndex}</sub>, ${args?.immediate}
          </span>
        );
      case ArgumentType.TWO_REGISTERS_ONE_OFFSET:
        return (
          <span>
            ω<sub>{args?.firstRegisterIndex}</sub>, ω<sub>{args?.secondRegisterIndex}</sub>, {args?.offset}
          </span>
        );
      case ArgumentType.TWO_REGISTERS_TWO_IMMEDIATE:
        return (
          <span>
            ω<sub>{args?.firstRegisterIndex}</sub>, ω<sub>{args?.secondRegisterIndex}</sub>, ${args?.immediate1}, ${args?.immediate2}
          </span>
        );
      case ArgumentType.THREE_REGISTERS:
        return (
          <span>
            ω<sub>{args?.firstRegisterIndex}</sub>, ω<sub>{args?.secondRegisterIndex}</sub>, ω<sub>{args?.thirdRegisterIndex}</sub>
          </span>
        );

      default:
        return "err";
    }
  };

  return (
    <>
      <div className="p-3 text-left w-screen">
        <div className="grid grid-cols-12 gap-1.5 divide-x">
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
          </div>

          <div className="col-span-6 container py-3 font-mono">
            <Label>Instructions:</Label>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Instruction</TableHead>
                  <TableHead>Gas</TableHead>
                  <TableHead></TableHead>
                  {/*<TableHead>Args</TableHead>*/}
                </TableRow>
              </TableHeader>
              <TableBody>
                {!!programPreviewResult?.length &&
                  programPreviewResult.map((programRow: any) => (
                    <Collapsible asChild>
                      <>
                        <TableRow>
                          <TableCell>{programRow.instructionCode}</TableCell>
                          <TableCell>
                            <HoverCard>
                              <HoverCardTrigger>
                                <span className="uppercase font-bold">{programRow.name}</span>
                                &nbsp;
                                <span className="font-bold">{mapInstructionsArgsByType(programRow.args)}</span>
                              </HoverCardTrigger>
                              <HoverCardContent>
                                <pre>{JSON.stringify(programRow.args, null, 2)}</pre>
                              </HoverCardContent>
                            </HoverCard>
                          </TableCell>
                          <TableCell>{programRow.gas}</TableCell>
                          <TableCell>
                            <CollapsibleTrigger asChild>
                              {/*<Button variant="ghost" size="sm" className="w-9 p-0">*/}
                              {/*  <ChevronsUpDown className="h-4 w-4" />*/}
                              {/*  <span className="sr-only">Toggle</span>*/}
                              {/*</Button>*/}
                            </CollapsibleTrigger>
                          </TableCell>
                        </TableRow>
                        <CollapsibleContent asChild>
                          <TableRow>
                            <TableCell colSpan={3}>Row collapsible content</TableCell>
                          </TableRow>
                        </CollapsibleContent>
                      </>
                    </Collapsible>
                  ))}
              </TableBody>
            </Table>
          </div>

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
