import { ProgramTextLoader } from "../ProgramTextLoader";
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
  onProgramLoad,
  program,
}: {
  onProgramLoad: (val?: ProgramUploadFileOutput) => void;
  program: number[];
}) => {
  return (
    <div className="h-full flex flex-col">
      <p className="mb-3">Edit program code bytes</p>
      <ProgramTextLoader
        program={program}
        setProgram={(program) =>
          program ? onProgramLoad({ initial, program, name: "custom" }) : onProgramLoad(undefined)
        }
      />
    </div>
  );
};
