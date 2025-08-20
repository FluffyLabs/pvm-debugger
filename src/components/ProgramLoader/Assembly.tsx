import { useCallback, useMemo, useState } from "react";
import { ProgramUploadFileOutput } from "./types";
import { InitialState, RegistersArray } from "../../types/pvm";
import classNames from "classnames";
import { compile_assembly, disassemble } from "@typeberry/spectool-wasm";
import { mapUploadFileInputToOutput } from "./utils";
import CodeMirror from "@uiw/react-codemirror";
import { ProgramEdit } from "../ProgramEdit";
import { useIsDarkMode } from "@/packages/ui-kit/DarkMode/utils";

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
    // 6. disassembler produces <<r (rotate) which is not supported
    // 7. diassembler produces only 32-bit representation of negative values `0xffffffff`
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
      // set first block as entry point
      l = l.replace("@block0", "pub @main");
      // replace rotate with shift (INCORRECT!)
      l = l.replace("<<r", "<<").replace(">>r", ">>");
      // replace large values with their 64-bit extensions (INCORRECT!; just for fib)
      l = l.replace("0xffffffff", "0xffffffffffffffff");
      return l;
    });

    const newProgram = fixedLines.join("\n");
    // now append initial registers
    const registers: string[] = [];
    for (const [idx, reg] of (initialState.regs ?? []).entries()) {
      if (BigInt(reg) !== 0n) {
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
  programName,
  initialState,
  onProgramLoad,
  program,
}: {
  programName: string;
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
        const output = mapUploadFileInputToOutput(newProgram, "assembly");
        output.name = programName;
        // avoid re-rendering when the code & state is the same.
        if (isArrayEqual(program, output.program)) {
          output.program = program;
        }
        const newInitialState = {
          ...initialState,
        };
        newInitialState.regs = truncateRegs(output.initial.regs);
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
        // if there are no changes do not re-render.
        if (JSON.stringify(output.initial) !== JSON.stringify(newInitialState)) {
          // we want to keep all of the old stuff to avoid re-rendering.
          output.initial = newInitialState;
          onProgramLoad(output);
        }
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
    [onProgramLoad, program, initialState, programName],
  );

  const [error, setError] = useState<string>();
  const [assembly, setAssembly] = useState(defaultAssembly);
  const isDark = useIsDarkMode();
  const isError = !!error;

  return (
    <div className="h-full flex flex-col">
      <ProgramEdit startSlot={<small>{programName}</small>} />
      <div
        className={classNames("flex-auto gap-1 font-poppins overflow-auto", {
          "focus-visible:ring-3 focus-visible:outline-none active:outline-none": isError,
          "border-red-500": isError,
        })}
      >
        <CodeMirror
          theme={isDark ? "dark" : "light"}
          autoFocus
          className="h-full"
          height="100%"
          placeholder="Try writing some PolkaVM assembly code."
          value={assembly}
          onChange={compile}
        />
      </div>
      <div>
        <p
          className={classNames(
            isError
              ? "text-[#D34D4B] bg-[#FFF4F4] dark:bg-[#D34D4B]/10"
              : "text-[#5FC18C] bg-[#F4FFF9] dark:bg-brand-dark/20",
            "text-sm p-2",
          )}
        >
          {error ?? "Compilation successful"}
        </p>
        <p className="text-xs p-2">
          Experimental assembler format as defined in{" "}
          <a
            target="_blank"
            href="https://github.com/koute/polkavm/blob/master/crates/polkavm-common/src/assembler.rs"
            className="underline"
          >
            koute/polkavm
          </a>
          .
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

function truncateRegs(regs: RegistersArray | undefined) {
  if (!regs) {
    return regs;
  }

  for (let i = 0; i < regs.length; i++) {
    // currently the assembler requires that registers are provided as u32
    regs[i] = regs[i] & 0xffff_ffffn;
  }
  return regs;
}
