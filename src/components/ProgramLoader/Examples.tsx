import { RegistersArray } from "@/types/pvm";
import { ProgramUploadFileOutput } from "./types";
import { Badge } from "@/components/ui/badge.tsx";
import { programs } from "./examplePrograms";

export const Examples = ({ onProgramLoad }: { onProgramLoad: (val: ProgramUploadFileOutput) => void }) => {
  return (
    <div>
      {Object.keys(programs).map((key) => {
        const program = programs[key];
        return (
          <Badge
            id={key}
            variant="brand"
            className={"mb-2 mr-2 text-xs sm:text-md cursor-pointer"}
            key={key}
            onClick={() => {
              onProgramLoad({
                initial: {
                  regs: program.regs.map((x) => BigInt(x)) as RegistersArray,
                  pc: program.pc,
                  pageMap: program.pageMap,
                  memory: program.memory,
                  gas: program.gas,
                },
                program: programs[key].program,
                name: program.name,
                exampleName: key,
              });
            }}
          >
            {programs[key].name}
          </Badge>
        );
      })}
    </div>
  );
};
