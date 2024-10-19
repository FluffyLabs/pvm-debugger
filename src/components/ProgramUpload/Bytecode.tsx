import { ProgramLoader } from "../ProgramLoader";
import { ProgramUploadFileOutput } from "./types";

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
  onFileUpload,
  program,
}: {
  onFileUpload: (val?: ProgramUploadFileOutput) => void;
  program: number[];
}) => {
  return (
    <div className="h-full flex flex-col">
      <p className="mb-3">Edit program code bytes</p>
      <ProgramLoader
        program={program}
        setProgram={(program) =>
          program ? onFileUpload({ initial, program, name: "custom" }) : onFileUpload(undefined)
        }
      />
    </div>
  );
};
