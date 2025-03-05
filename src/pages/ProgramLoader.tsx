import { Loader } from "@/components/ProgramLoader/Loader.tsx";
import { useEffect } from "react";
import { bytes } from "@typeberry/block";
import { decodeStandardProgram } from "@typeberry/pvm-debugger-adapter";
import { MemoryChunkItem, PageMapItem, RegistersArray } from "@/types/pvm.ts";
import { useNavigate } from "react-router";
import { useAppSelector } from "@/store/hooks.ts";
import { selectInitialState } from "@/store/debugger/debuggerSlice.ts";
import { useDebuggerActions } from "@/hooks/useDebuggerActions.ts";
import { getAsChunks, getAsPageMap } from "@/lib/utils.ts";

const ProgramLoader = () => {
  const initialState = useAppSelector(selectInitialState);
  const debuggerActions = useDebuggerActions();
  const navigate = useNavigate();
  const { pvmInitialized } = useAppSelector((state) => state.debugger);

  useEffect(() => {
    const loadProgramFromUrl = async () => {
      const searchParams = new URLSearchParams(window.location.search);
      const programFromSearchParams = searchParams.get("program");

      if (!pvmInitialized && programFromSearchParams) {
        const program = programFromSearchParams;

        try {
          // Add 0x prefix if it's not there - we're assuming it's the hex program either way
          const hexProgram = program?.startsWith("0x") ? program : `0x${program}`;
          const parsedBlob = bytes.BytesBlob.parseBlob(hexProgram ?? "");
          const parsedBlobArray = Array.prototype.slice.call(parsedBlob.raw);

          if (searchParams.get("flavour") === "jam") {
            try {
              const { code, memory, registers } = decodeStandardProgram(parsedBlob.raw, new Uint8Array());

              const pageMap: PageMapItem[] = getAsPageMap(memory);
              const chunks: MemoryChunkItem[] = getAsChunks(memory);

              await debuggerActions.handleProgramLoad({
                program: Array.from(code),
                name: "custom",
                initial: {
                  regs: Array.from(registers).map((x) => BigInt(x as number | bigint)) as RegistersArray,
                  pc: 0,
                  pageMap,
                  memory: chunks,
                  gas: 10000n,
                },
              });

              navigate("/");
            } catch (e) {
              console.warn("Could not load the program from URL", e);
            }
          } else {
            await debuggerActions.handleProgramLoad({
              program: parsedBlobArray,
              name: "custom",
              initial: initialState,
            });

            navigate("/");
          }
        } catch (e) {
          console.warn("Could not parse the program from URL", e);
        }
      }
    };

    loadProgramFromUrl();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="max-w-[505px] sm:my-[100px] max-sm:h-full sm:rounded-lg sm:border-2">
      <Loader />
    </div>
  );
};

export default ProgramLoader;
