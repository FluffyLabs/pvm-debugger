import { RegistersArray } from "@/types/pvm";
import { ProgramUploadFileOutput } from "./types";
import { Badge } from "@/components/ui/badge.tsx";
import { programs } from "./examplePrograms";
import { useState } from "react";
import doomUrl from "./doom.bin?url";
import { loadFileFromUint8Array } from "./loadingUtils";

export const Examples = ({ onProgramLoad }: { onProgramLoad: (val: ProgramUploadFileOutput) => void }) => {
  const [isDoomLoading, setIsDoomLoading] = useState(false);

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
                isSpi: false,
                kind: "Example",
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
      <Badge
        id="doom"
        variant={isDoomLoading ? "outline" : "brand"}
        className={`mb-2 mr-2 text-xs sm:text-md ${isDoomLoading ? "cursor-wait" : "cursor-pointer"}`}
        onClick={async () => {
          if (isDoomLoading) {
            return;
          }
          setIsDoomLoading(true);
          const data = await fetch(doomUrl);
          const blob = await data.bytes();
          setIsDoomLoading(false);
          loadFileFromUint8Array("doom.bin", blob, new Uint8Array(), () => {}, onProgramLoad, {});
        }}
      >
        {isDoomLoading ? "..." : "Doom"}
      </Badge>
    </div>
  );
};
