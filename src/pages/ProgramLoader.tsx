import { Loader } from "@/components/ProgramLoader/Loader.tsx";
import { useEffect, useRef } from "react";
import { bytes } from "@typeberry/lib";
import { MemoryChunkItem, PageMapItem, RegistersArray } from "@/types/pvm.ts";
import { useNavigate } from "react-router";
import { useAppSelector } from "@/store/hooks.ts";
import { selectInitialState } from "@/store/debugger/debuggerSlice.ts";
import { useDebuggerActions } from "@/hooks/useDebuggerActions.ts";
import { bigUint64ArrayToRegistersArray, getAsChunks, getAsPageMap } from "@/lib/utils.ts";
import { programs } from "@/components/ProgramLoader/examplePrograms";
import { decodeSpiWithMetadata } from "@/utils/spi";

const ProgramLoader = () => {
  const initialState = useAppSelector(selectInitialState);
  const debuggerActions = useDebuggerActions();
  const navigate = useNavigate();
  const pvmLoaded = useAppSelector((state) => state.debugger.pvmLoaded);
  const isLoadedFromUrl = useRef(false);

  useEffect(() => {
    const loadProgramFromUrl = async () => {
      // we wait for the pvm to be loaded first.
      if (!pvmLoaded) {
        return;
      }
      // but we never load from url twice
      if (isLoadedFromUrl.current) {
        return;
      }

      isLoadedFromUrl.current = true;
      const searchParams = new URLSearchParams(window.location.search);

      const example = searchParams.get("example");
      if (example) {
        const program = programs[example];
        if (!program) {
          console.warn("Unknown example", example);
          navigate("/load", { replace: true });
          return;
        }

        await debuggerActions.handleProgramLoad({
          program: program.program,
          name: program.name,
          spiProgram: null,
          kind: "Example",
          initial: {
            regs: program.regs.map((x) => BigInt(x)) as RegistersArray,
            pc: program.pc,
            pageMap: program.pageMap,
            memory: program.memory,
            gas: program.gas,
          },
          exampleName: example,
        });

        navigate("/", { replace: true });
        return;
      }

      const program = searchParams.get("program");
      if (program) {
        try {
          // Add 0x prefix if it's not there - we're assuming it's the hex program either way
          const hexProgram = program?.startsWith("0x") ? program : `0x${program}`;
          const parsedBlob = bytes.BytesBlob.parseBlob(hexProgram ?? "");
          const parsedBlobArray = Array.prototype.slice.call(parsedBlob.raw);

          if (searchParams.get("flavour") === "jam") {
            try {
              const { code, memory, registers, metadata } = decodeSpiWithMetadata(parsedBlob.raw, new Uint8Array());

              const pageMap: PageMapItem[] = getAsPageMap(memory);
              const chunks: MemoryChunkItem[] = getAsChunks(memory);

              await debuggerActions.handleProgramLoad({
                program: Array.from(code),
                name: "loaded-from-url [SPI]",
                spiProgram: {
                  program: parsedBlob.raw,
                  hasMetadata: metadata !== undefined,
                },
                kind: "JAM SPI",
                initial: {
                  regs: bigUint64ArrayToRegistersArray(registers),
                  pc: 0,
                  pageMap,
                  memory: chunks,
                  gas: 10000n,
                },
              });

              navigate("/", { replace: true });
            } catch (e) {
              console.warn("Could not load the program from URL", e);
            }
          } else {
            await debuggerActions.handleProgramLoad({
              program: parsedBlobArray,
              name: "loaded-from-url [generic]",
              initial: initialState,
              kind: "Generic PVM",
              spiProgram: null,
            });

            navigate("/", { replace: true });
          }
        } catch (e) {
          console.warn("Could not parse the program from URL", e);
          navigate("/load", { replace: true });
        }
      }
    };

    loadProgramFromUrl();
  }, [pvmLoaded, isLoadedFromUrl, debuggerActions, navigate, initialState]);

  return (
    <div className="w-full h-full flex flex-col items-center bg-accent dark:bg-background">
      <div className="sm:max-w-[50vw] sm:my-auto 2xl:my-[100px] sm:mr-[72px] max-sm:h-full sm:rounded-lg sm:border-[1px] overflow-hidden">
        <Loader />
      </div>
    </div>
  );
};

export default ProgramLoader;
