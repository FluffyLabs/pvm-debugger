import { useCallback, useEffect, useMemo, useState } from "react";
import { ProgramUploadFileOutput } from "./types";
import { InitialState } from "../../types/pvm";
import classNames from "classnames";
import { compile_assembly, disassemble } from "@typeberry/spectool-wasm";
import { mapUploadFileInputToOutput } from "./utils";
import CodeMirror from "@uiw/react-codemirror";
import useDarkMode from "@/hooks/useDarkMode.ts";

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
    // Since the disassemble does not produce output that could be passed
    // directly to `compile_assembly` we do a bit of post-processing
    // to make sure it's compatible.
    //
    // The output produced by disassembler has:
    // 1. Some extra initial whitespace for alignment
    // 2. Short, numeric labels like `@2`. We convert them to `@block2`.
    // 3. line numbers prepended to the code (`0: add`)
    // 4. `ecalli` instructions seem to have `// INVALID` comments next to them, but
    //    the assembler does not handle comments at all.
    // 5. disassembler produces unary minus (i.e. `r0 = -r7`), which isn't handled by the compiler.
    const fixedLines: string[] = lines.map((l: string) => {
      // remove leading whitespace
      l = l.trim();
      // replace labels
      l = l.replace(/(: )?@(.+)$/, "@block$2$1");
      // remove line number
      l = l.replace(/^[0-9]+: /, "\t");
      // fix ecalli comments?
      l = l.replace(/^(.*)\/\/.*/, "$1");
      // fix unary minus
      l = l.replace(/= -/, "= 0 -");
      // replace `invalid` instructions with a comment
      l = l.replace("invalid", "// invalid");
      return l;
    });

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
  onProgramLoad,
  program,
}: {
  initialState: InitialState;
  onProgramLoad: (val?: ProgramUploadFileOutput) => void;
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
        const newInitialState = {
          ...initialState,
        };
        newInitialState.regs = output.initial.regs;
        // this is incorrect, but we would need to alter the
        // assembly to include the actual data:
        // pub @main: (pc)
        // %rw_data / %ro_data (memory)
        // for now we are just going to assume we are "editing"
        // that code.
        if (output.initial.pc !== 0) {
          newInitialState.pc = output.initial.pc;
        }
        if ((output.initial.memory?.length ?? 0) !== 0) {
          newInitialState.memory = output.initial.memory;
        }
        if ((output.initial.pageMap?.length ?? 0) !== 0) {
          newInitialState.pageMap = output.initial.pageMap;
        }
        // we want to keep all of the old stuff to avoid re-rendering.
        output.initial = newInitialState;
        onProgramLoad(output);
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
        console.error(e);
        onProgramLoad(undefined);
        setError(`${e}`);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [onProgramLoad, program],
  );

  const [error, setError] = useState<string>();
  const [assembly, setAssembly] = useState(defaultAssembly);
  const [isFirstCompilation, setFirstCompilation] = useState(true);
  const isDarkMode = useDarkMode();

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
      <p className="pb-2 mb-1">
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
      <div
        className={classNames("flex-auto gap-1 font-mono border-2 rounded-md overflow-auto", {
          "focus-visible:ring-3 focus-visible:outline-none active:outline-none": isError,
          "border-red-500": isError,
        })}
      >
        <CodeMirror
          autoFocus
          className="h-full"
          height="100%"
          placeholder="Try writing some PolkaVM assembly code."
          value={assembly}
          theme={isDarkMode ? "dark" : "light"}
          onChange={(value) => compile(value)}
        />
      </div>
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
