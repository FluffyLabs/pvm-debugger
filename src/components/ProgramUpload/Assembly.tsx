import { useCallback, useEffect, useMemo, useState } from "react";
import { Textarea } from "../ui/textarea";
import { ProgramUploadFileOutput } from "./types";
import { InitialState } from "../../types/pvm";
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

function assemblyFromInputProgram(initialState: InitialState, program: number[]) {
  if (program.length === 0) {
    return DEFAULT_ASSEMBLY;
  }
  try {
    const raw = disassemble(new Uint8Array(program));
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

    const newProgram = fixedLines.join("\n");
    // now append initial registers
    const registers: string[] = [];
    for (const [idx, reg] of (initialState.regs ?? []).entries()) {
      if (reg !== 0) {
        registers.push(`pre: r${idx} = ${reg}`);
      }
    }
    if (registers.length) {
      registers.push("");
      registers.push("");
    }
    return `${registers.join("\n")}${newProgram}`;
  } catch (e) {
    console.error("Error disassembling input: ", e);
    return DEFAULT_ASSEMBLY;
  }
}

export const Assembly = ({
  initialState,
  onFileUpload,
  program,
}: {
  initialState: InitialState;
  onFileUpload: (val?: ProgramUploadFileOutput) => void;
  program: number[];
}) => {
  const defaultAssembly = useMemo(() => {
    return assemblyFromInputProgram(initialState, program);
  }, [program, initialState]);

  const compile = useCallback(
    (input: string) => {
      setAssembly(input);
      try {
        const programJson = compile_assembly(input);
        const newProgram = JSON.parse(programJson);
        const output = mapUploadFileInputToOutput(newProgram);
        // avoid re-rendering when the code & state is the same.
        if (isArrayEqual(program, output.program)) {
          output.program = program;
        }
        initialState.regs = output.initial.regs;
        // this is incorrect, but we would need to alter the
        // assembly to include the actual data:
        // pub @main: (pc)
        // %rw_data / %ro_data (memory)
        // for now we are just going to assume we are "editing"
        // that code.
        if (output.initial.pc !== 0) {
          initialState.pc = output.initial.pc;
        }
        if ((output.initial.memory?.length ?? 0) !== 0) {
          initialState.memory = output.initial.memory;
        }
        if ((output.initial.pageMap?.length ?? 0) !== 0) {
          initialState.pageMap = output.initial.pageMap;
        }
        // we want to keep all of the old stuff to avoid re-rendering.
        output.initial = {
          ...initialState,
        };
        onFileUpload(output);
        setError(undefined);
      } catch (e) {
        if (e instanceof Error) {
          if (
            e.message.startsWith(
              "A state mutation was detected between dispatches, in the path 'debugger.initialState.regs'",
            )
          ) {
            console.warn(e);
            return;
          }
        }
        console.log(e);
        onFileUpload(undefined);
        setError(`${e}`);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [onFileUpload, program],
  );

  const [error, setError] = useState<string>();
  const [assembly, setAssembly] = useState(defaultAssembly);
  const [isFirstCompilation, setFirstCompilation] = useState(true);

  // compile the assembly for the first time
  useEffect(() => {
    if (isFirstCompilation) {
      compile(assembly);
      setFirstCompilation(false);
    }
  }, [compile, assembly, isFirstCompilation]);

  const isError = !!error;

  return (
    <div className="h-full flex flex-col">
      <p className="pb-2 -mt-4">
        <small>
          Experimental assembler format as defined in{" "}
          <a
            target="_blank"
            href="https://github.com/koute/polkavm/blob/master/crates/polkavm-common/src/assembler.rs"
            className="underline"
          >
            koute/polkavm
          </a>
          .
        </small>
      </p>
      <Textarea
        autoFocus
        className={classNames("flex-auto gap-1 font-mono border-2 rounded-md", {
          "focus-visible:ring-3 focus-visible:outline-none active:outline-none": isError,
          "border-red-500": isError,
        })}
        id="assembly"
        placeholder="Try writing some PolkaVM assembly code."
        value={assembly}
        onChange={(e) => compile(e.target.value)}
        style={{ fontSize: "10px" }}
      />
      <div>
        <p className={classNames(isError ? "text-red-500" : "text-green-500", "pt-4")}>
          {error ?? "Compilation successful"}
        </p>
      </div>
    </div>
  );
};

function isArrayEqual<T>(a: T[], b: T[]) {
  if (a.length !== b.length) {
    return false;
  }

  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) {
      return false;
    }
  }

  return true;
}
