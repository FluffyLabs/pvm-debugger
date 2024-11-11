import { ProgramTextLoader } from "../ProgramTextLoader";
import { ProgramUploadFileOutput } from "./types";
import { BinaryFileUpload } from "@/components/ProgramLoader/BinaryFileUpload.tsx";
import { useState } from "react";

const initial = {
  regs: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] as [
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
  ],
  pc: 0,
  pageMap: [],
  memory: [],
  gas: 10000,
};

export const Bytecode = ({
  onProgramLoad,
  program,
}: {
  onProgramLoad: (val?: ProgramUploadFileOutput, error?: string) => void;
  program: number[];
}) => {
  const [tempProgram, setTempProgram] = useState<number[] | undefined>(program);
  const handleFileUpload = (val: ProgramUploadFileOutput) => {
    setTempProgram(val.program);
    onProgramLoad(val);
  };

  return (
    <div className="h-full flex flex-col">
      <p className="mb-3">Edit program code bytes</p>
      <ProgramTextLoader
        program={tempProgram}
        setProgram={(program, error) => {
          if (program) {
            setTempProgram(program);
            onProgramLoad({ initial, program, name: "custom" }, error);
          } else {
            onProgramLoad(undefined, error);
          }
        }}
      />
      <BinaryFileUpload onFileUpload={handleFileUpload} />
    </div>
  );
};
