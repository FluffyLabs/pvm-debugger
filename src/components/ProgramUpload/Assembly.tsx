import { useCallback, useEffect, useMemo, useState } from "react";
import { Textarea } from "../ui/textarea";
import { ProgramUploadFileOutput } from "./types";
import classNames from "classnames";
import { compile_assembly, disassemble } from "@typeberry/spectool-wasm";
import { mapUploadFileInputToOutput } from "./utils";

const DEFAULT_ASSEMBLY = `pre: a0 = 9
pre: ra = 0xffff0000

pub @main:
    // first & second
    a1 = 1
    a2 = 1
    jump @loop
    trap

@loop:
    a0 = a0 - 1
    jump @end if a0 == 0
    a3 = a1
    a1 = a1 + a2
    a2 = a3
    jump @loop

@end:
    a0 = a1
    a1 = 0
    a2 = 0

pub @expected_exit:
    ret
`;

function assemblyFromInputProgram(program: number[]) {
  if (program.length === 0) {
    return DEFAULT_ASSEMBLY;
  }
  try {
    const raw = disassemble(program);
    const lines = raw.split("\n");
    const fixedLines: string[] = lines.map((l: string) => {
      // remove leading whitespace
      l = l.trim();
      // replace labels
      l = l.replace(/: @(.+)$/, "@block$1:");
      return l;
    });

    // make a map of line targets into basic block labels
    const basicBlocks = new Map<string, string>();
    for (let i = 0; i < fixedLines.length; i += 1) {
      if (fixedLines[i].startsWith("@")) {
        const blockName = fixedLines[i].replace(":", "");
        const number = fixedLines[i + 1].split(":")[0];
        basicBlocks.set(number, blockName);
      }
      // remove line number
      fixedLines[i] = fixedLines[i].replace(/[0-9]+: /, "\t");
    }

    // fix jumps
    for (let i = 0; i < fixedLines.length; i += 1) {
      fixedLines[i] = fixedLines[i].replace(/jump ([0-9]+)/, (_, num) => {
        return `jump ${basicBlocks.get(num)}`;
      });
    }
    return fixedLines.join("\n");
  } catch (e) {
    console.error("Error disassembling input: ", e);
    return DEFAULT_ASSEMBLY;
  }
}

export const Assembly = ({
  onFileUpload,
  program,
}: {
  onFileUpload: (val: ProgramUploadFileOutput) => void;
  program: number[];
}) => {
  const defaultAssembly = useMemo(() => {
    return assemblyFromInputProgram(program);
  }, [program]);

  const compile = useCallback(
    (input: string) => {
      setAssembly(input);
      try {
        const programJson = compile_assembly(input);
        const program = JSON.parse(programJson);
        const output = mapUploadFileInputToOutput(program);
        onFileUpload(output);
        setError(undefined);
      } catch (e) {
        console.log(e);
        setError(`${e}`);
      }
    },
    [onFileUpload],
  );

  const [error, setError] = useState<string>();
  const [assembly, setAssembly] = useState(defaultAssembly);

  // compile the assembly for the first time
  useEffect(() => {
    compile(assembly);
  }, [compile, assembly]);

  const isError = !!error;

  return (
    <div>
      <div className={classNames("flex gap-1 flex-col border-2 rounded-md h-full", { "border-red-500": isError })}>
        <Textarea
          rows={20}
          autoFocus
          className={classNames("w-full h-full font-mono border-0", {
            "focus-visible:ring-3 focus-visible:outline-none active:outline-none": isError,
          })}
          id="assembly"
          placeholder="Try writing some PolkaVM assembly code."
          value={assembly}
          onChange={(e) => compile(e.target.value)}
          style={{ fontSize: "10px" }}
        />
      </div>
      <br />
      <p className={classNames({ "text-red-500": isError }, "h-8")}>{error ?? "OK"}</p>
    </div>
  );
};
