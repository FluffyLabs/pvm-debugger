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
  const [registersInput, setRegistersInput] = useState("[0,0,0,0,0,0,0,0,0,0,0,0,0]");
  const [isInvalidProgram, setIsInvalidProgram] = useState(false);
  const [isInvalidRegisterTable, setIsInvalidRegisterTable] = useState(false);
  const [programPreviewResult, setProgramPreviewResult] = useState<unknown[]>();
  const [programRunResult, setProgramRunResult] = useState<unknown>();
  let fileReader: FileReader;
  // const program = [0, 0, 3, 8, 135, 9, 249]

  const handleClick = () => {
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
        setRegistersInput(JSON.stringify(jsonFile["initial-regs"]));
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
      <div className="container py-3 text-left">
        <div className="grid grid-cols-3 gap-1.5">
          <div className="p-3 col-span-2 bg-sky-200 rounded-md">
            <Label htmlFor="program">PVM program as array of numbers:</Label>
            <Textarea
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
            <div className="text-right">
              <Button className="my-2" onClick={handleClick}>
                Check program
              </Button>
            </div>
          </div>

          <div className="p-3">
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
            <br />

            <Label htmlFor="registers">Initial registers:</Label>
            <Textarea
              id="registers"
              placeholder="Paste initial registers as an array of numbers"
              value={registersInput}
              onChange={(e) => {
                console.log(e.target.value);
                try {
                  setRegistersInput(e.target.value);
                  JSON.parse(e.target.value);
                  setInitialState((prevState) => ({
                    ...prevState,
                    regs: JSON.parse(e.target.value),
                  }));
                  setIsInvalidRegisterTable(false);
                } catch (e) {
                  console.log("wrong json");
                  setIsInvalidRegisterTable(true);
                }
              }}
            />
            {isInvalidRegisterTable && <div>Registers are not a valid JSON array</div>}
          </div>
        </div>
      </div>

      <div className="container py-3 font-mono">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Instruction Code</TableHead>
              <TableHead>Instruction Name</TableHead>
              <TableHead>Instruction Gas</TableHead>
              <TableHead>Instruction Args</TableHead>
              <TableHead>Instruction Errors</TableHead>
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

      <div className="container py-3 text-left text-xs">
        <div className="grid grid-cols-2 p-3 bg-slate-100 rounded-md">
          <pre className="p-3">
            <code>Program preview: {JSON.stringify(programPreviewResult, null, 2)}</code>
          </pre>

          <pre className="p-3">
            <code>Program run result: {JSON.stringify(programRunResult, null, 2)}</code>
          </pre>
        </div>
      </div>
    </>
  );
}

export default App;
