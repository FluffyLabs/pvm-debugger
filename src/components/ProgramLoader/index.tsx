import { Textarea } from "@/components/ui/textarea.tsx";
import React, { useEffect, useState } from "react";
import classNames from "classnames";
import { bytes } from "@typeberry/block";

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

  const handleOnChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newInput = e.target.value;
    setProgramInput(newInput);

    if (!newInput.startsWith("[")) {
      try {
        setIsInvalidProgram(false);
        const parsedBlob = bytes.BytesBlob.parseBlob(newInput);
        console.log({
          parsedBlob,
          setProgram: Array.prototype.slice.call(parsedBlob.buffer),
        });
        // setProgram(parsedBlob.buffer); // convert to array of numbers
        setProgram(Array.prototype.slice.call(parsedBlob.buffer));
      } catch (e) {
        console.warn(e);
        console.log("wrong binary file");
        setIsInvalidProgram(true);
      }
      // bytes.BytesBlob.fromBlob(new Uint8Array(fileContent)).toString());

      // TODO: parse hex string input array of numbers
      // const hex = programInput.slice(2);
      // const program = hex.match(/.{1,2}/g)?.map((x) => parseInt(x, 16));
      // console.log({
      //   program
      // })
      // setProgramInput(program);
    } else {
      try {
        JSON.parse(newInput);
        setProgram(JSON.parse(newInput));
        setIsInvalidProgram(false);
      } catch (e) {
        console.log("wrong json");
        setIsInvalidProgram(true);
        setProgram();
      }
    }
  };

  return (
    <div
      className={classNames("flex-auto flex gap-1 flex-col border-2 rounded-md ", {
        "border-red-500": isInvalidProgram,
      })}
    >
      <Textarea
        autoFocus
        className={classNames("w-full flex-auto font-mono border-0 text-base", {
          "focus-visible:ring-3 focus-visible:outline-none active:outline-none": isInvalidProgram,
        })}
        id="program"
        placeholder="Paste the program as an array of numbers or hex string"
        value={programInput}
        onChange={handleOnChange}
      />
    </div>
  );
};
