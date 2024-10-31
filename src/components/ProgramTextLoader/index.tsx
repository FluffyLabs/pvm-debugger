import { Textarea } from "@/components/ui/textarea.tsx";
import React, { useEffect, useState } from "react";
import classNames from "classnames";
import { bytes } from "@typeberry/block";
import { logger } from "@/utils/loggerService";

export const ProgramTextLoader = ({
  program,
  setProgram,
}: {
  program?: number[];
  setProgram: (val?: number[], error?: string) => void;
}) => {
  const [programInput, setProgramInput] = useState(program?.length ? JSON.stringify(program) : "");
  useEffect(() => {
    setProgramInput(program?.length ? JSON.stringify(program) : "");
  }, [program]);

  const handleOnChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newInput = e.target.value.trim();
    setProgramInput(newInput);

    if (!newInput.startsWith("[")) {
      try {
        const parsedBlob = bytes.BytesBlob.parseBlob(newInput);
        setProgram(Array.prototype.slice.call(parsedBlob.buffer));
      } catch (error) {
        logger.error("Wrong binary file", { error, hideToast: true });
        setProgram(undefined, "Wrong binary file");
      }
    } else {
      try {
        JSON.parse(newInput);
        setProgram(JSON.parse(newInput));
      } catch (error) {
        logger.error("Wrong JSON", { error, hideToast: true });
        setProgram(undefined, "Wrong JSON");
      }
    }
  };

  return (
    <div className="h-full">
      <div className={classNames("h-full flex-auto flex gap-1 flex-col border-2 rounded-md ")}>
        <Textarea
          autoFocus
          className={classNames("w-full flex-auto font-mono border-0 text-base")}
          id="program"
          placeholder="Paste the program as an array of numbers or hex string"
          value={programInput}
          onChange={handleOnChange}
        />
      </div>
    </div>
  );
};
