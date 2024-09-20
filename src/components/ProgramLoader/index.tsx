import { Textarea } from "@/components/ui/textarea.tsx";
import { useEffect, useState } from "react";
import classNames from "classnames";

export const ProgramLoader = ({
  program,
  setProgram,
}: {
  program?: number[];
  setProgram: (val?: number[]) => void;
}) => {
  const [programInput, setProgramInput] = useState(program?.length ? JSON.stringify(program) : "");
  const [isInvalidProgram, setIsInvalidProgram] = useState(false);
  useEffect(() => {
    setProgramInput(program?.length ? JSON.stringify(program) : "");
  }, [program]);

  return (
    <div
      className={classNames("flex gap-1 flex-col border-2 rounded-md h-full", { "border-red-500": isInvalidProgram })}
    >
      <div className="w-full h-full">
        <Textarea
          rows={7}
          autoFocus
          className={classNames("w-full h-full font-mono border-0 text-base", {
            "focus-visible:ring-3 focus-visible:outline-none active:outline-none": isInvalidProgram,
          })}
          id="program"
          placeholder="Paste the program as an array of numbers"
          value={programInput}
          onChange={(e) => {
            setProgramInput(e.target.value);
            try {
              JSON.parse(e.target.value);
              setProgram(JSON.parse(e.target.value));
              setIsInvalidProgram(false);
            } catch (e) {
              console.log("wrong json");
              setIsInvalidProgram(true);
              setProgram();
            }
          }}
        />
      </div>
    </div>
  );
};
