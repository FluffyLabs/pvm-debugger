import { Textarea } from "@/components/ui/textarea.tsx";
import React, { useMemo, useState } from "react";
import classNames from "classnames";
import { bytes } from "@typeberry/block";
import { logger } from "@/utils/loggerService";
import { useAppSelector } from "@/store/hooks.ts";
import { selectIsProgramInvalid } from "@/store/debugger/debuggerSlice.ts";
import { ProgramEdit } from "../ProgramEdit";

const parseArrayLikeString = (input: string): (number | string)[] => {
  // Remove the brackets and split the string by commas
  const items = input
    .replace(/^\[|\]$/g, "")
    .split(",")
    .map((item) => item.trim());

  // Process each item
  return items.map((item) => {
    if (/^0x[0-9a-fA-F]+$/i.test(item)) {
      return parseInt(item, 16);
    } else if (!isNaN(Number(item))) {
      return Number(item);
    } else {
      return item;
    }
  });
};

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
  const [programError, setProgramError] = useState("");
  const isProgramInvalid = useAppSelector(selectIsProgramInvalid);

  const handleOnChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newInput = e.target.value.trim();
    setProgramInput(newInput);

    if (!newInput.startsWith("[")) {
      try {
        const parsedBlob = bytes.BytesBlob.parseBlob(newInput);

        const parsedBlobArray = Array.prototype.slice.call(parsedBlob.raw);

        if (parsedBlobArray.length) {
          setProgram(parsedBlobArray);
        }

        setProgramError("");
      } catch (error: unknown) {
        logger.error("Wrong binary program", { error, hideToast: true });

        setProgram(undefined, "Wrong binary program");

        if (error instanceof Error) {
          if (error?.message) {
            setProgramError(error.message);
          }
        }
      }
    } else {
      try {
        // Make sure that hex strings are parsed as strings for JSON.parse validation
        const parseTest = newInput.replace(/0x([a-fA-F0-9]+)/g, '"0x$1"');
        // Parse it just to check if it's a valid JSON
        JSON.parse(parseTest);
        const parsedJson = parseArrayLikeString(newInput);
        const programArray = parsedJson.filter((item) => typeof item === "number") as number[];

        if (programArray.length) {
          setProgram(programArray);
        }
        setProgramError("");
      } catch (error) {
        logger.error("Wrong JSON", { error, hideToast: true });

        setProgram(undefined, "Wrong JSON");

        if (error) {
          setProgramError(error.toString());
        }
      }
    }
  };

  return (
    <div className="h-full flex flex-col">
      <ProgramEdit startSlot={<small>Generic PVM program bytes</small>} />
      <div className={classNames("h-full flex-auto flex flex-col")}>
        <Textarea
          autoFocus
          className={classNames(
            "w-full flex-auto font-inconsolata text-base border-2 rounded-md focus-visible:ring-offset-0",
            {
              "focus-visible:ring-1 focus-visible:outline-none active:outline-none border-red-500": isProgramInvalid,
            },
          )}
          id="program"
          placeholder="Paste the program as an array of numbers or hex string"
          value={programInput}
          onChange={handleOnChange}
        />
        {isProgramInvalid && <span className="text-red-500">{programError || "Program is not valid"}</span>}
      </div>
    </div>
  );
};
