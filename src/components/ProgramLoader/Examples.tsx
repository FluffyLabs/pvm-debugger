import { RegistersArray } from "@/types/pvm";
import { ProgramUploadFileOutput } from "./types";
import { Badge } from "@/components/ui/badge.tsx";
import { programs } from "./examplePrograms";
import { useState } from "react";
import doomUrl from "./doom.bin?url";
import golUrl from "./gol.jam?url";
import { loadFileFromUint8Array } from "./loading-utils";
import { useAppSelector } from "@/store/hooks";

export const Examples = ({ onProgramLoad }: { onProgramLoad: (val: ProgramUploadFileOutput) => void }) => {
  const [isDoomLoading, setIsDoomLoading] = useState(false);
  const [isGolLoading, setIsGolLoading] = useState(false);
  const spiArgs = useAppSelector((state) => state.debugger.spiArgs);

  return (
    <div className="flex flex-row flex-wrap max-w-[50vw]">
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
                spiProgram: null,
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
          try {
            const data = await fetch(doomUrl);
            const blob = await data.bytes();
            loadFileFromUint8Array("doom.bin", blob, spiArgs, () => {}, onProgramLoad, {});
          } finally {
            setIsDoomLoading(false);
          }
        }}
      >
        {isDoomLoading ? "..." : "Doom"}
      </Badge>
      <Badge
        id="gol-sdk"
        variant={isGolLoading ? "outline" : "brand"}
        className={`mb-2 mr-2 text-xs sm:text-md ${isGolLoading ? "cursor-wait" : "cursor-pointer"}`}
        onClick={async () => {
          if (isGolLoading) {
            return;
          }
          setIsGolLoading(true);
          try {
            const data = await fetch(golUrl);
            const blob = await data.bytes();
            loadFileFromUint8Array("game-of-life.jam", blob, spiArgs, () => {}, onProgramLoad, {});
          } finally {
            setIsGolLoading(false);
          }
        }}
      >
        {isGolLoading ? "..." : "GoL (JAM-SDK)"}
      </Badge>
    </div>
  );
};
