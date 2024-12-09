import { Textarea } from "@/components/ui/textarea.tsx";
import React, { useMemo, useState } from "react";
import classNames from "classnames";
import { bytes } from "@typeberry/block";
import { logger } from "@/utils/loggerService";
import { useAppSelector } from "@/store/hooks.ts";
import { selectIsProgramInvalid } from "@/store/debugger/debuggerSlice.ts";

export const ProgramTextLoader = ({
  program,
  setProgram,
}: {
  program?: number[];
  setProgram: (val?: number[], error?: string) => void;
}) => {
  const defaultProgram = useMemo(() => {
    return program;
  }, [program]);

  const [programInput, setProgramInput] = useState(defaultProgram?.length ? JSON.stringify(defaultProgram) : "");
  const isProgramInvalid = useAppSelector(selectIsProgramInvalid);

  const handleOnChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newInput = e.target.value.trim();
    setProgramInput(newInput);

    if (!newInput.startsWith("[")) {
      try {
        const parsedBlob = bytes.BytesBlob.parseBlob(newInput);
        setProgram(Array.prototype.slice.call(parsedBlob.raw));
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
      <div className={classNames("h-full flex-auto flex gap-1 flex-col")}>
        <p className="pb-2 mb-1">
          <small>Edit program code bytes</small>
        </p>
        <Textarea
          autoFocus
          className={classNames("w-full flex-auto font-mono text-base border-2 rounded-md", {
            "focus-visible:ring-3 focus-visible:outline-none active:outline-none border-red-500": isProgramInvalid,
          })}
          id="program"
          placeholder="Paste the program as an array of numbers or hex string"
          value={programInput}
          onChange={handleOnChange}
        />
        {isProgramInvalid && <span className="text-red-500">Program is not valid</span>}
      </div>
    </div>
  );
};
