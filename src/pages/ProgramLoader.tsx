import { Loader } from "@/components/ProgramLoader/Loader.tsx";
import { useEffect } from "react";
import { bytes } from "@typeberry/block";
import { decodeStandardProgram } from "@typeberry/pvm-debugger-adapter";
import { RegistersArray } from "@/types/pvm.ts";
import { useNavigate, useSearchParams } from "react-router";
import { useAppSelector } from "@/store/hooks.ts";
import { selectInitialState } from "@/store/debugger/debuggerSlice.ts";
import { useDebuggerActions } from "@/hooks/useDebuggerActions.ts";

const ProgramLoader = () => {
  const initialState = useAppSelector(selectInitialState);
  const debuggerActions = useDebuggerActions();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    if (searchParams.get("program")) {
      const program = searchParams.get("program");

      try {
        // Add 0x prefix if it's not there - we're assuming it's the hex program either way
        const hexProgram = program?.startsWith("0x") ? program : `0x${program}`;
        const parsedBlob = bytes.BytesBlob.parseBlob(hexProgram ?? "");
        const parsedBlobArray = Array.prototype.slice.call(parsedBlob.raw);

        if (searchParams.get("flavour") === "jam") {
          try {
            const { code, /*memory,*/ registers } = decodeStandardProgram(parsedBlob.raw, new Uint8Array());

            debuggerActions.handleProgramLoad({
              program: Array.from(code),
              name: "custom",
              initial: {
                regs: Array.from(registers).map((x) => BigInt(x as number | bigint)) as RegistersArray,
                pc: 0,
                pageMap: [],
                // TODO: map memory properly
                // memory: [...memory],
                gas: 10000n,
              },
            });

            navigate({
              pathname: "/",
              search: searchParams.toString(),
            });
          } catch (e) {
            console.warn("Could not load the program from URL", e);
          }
        } else {
          debuggerActions.handleProgramLoad({
            program: parsedBlobArray,
            name: "custom",
            initial: initialState,
          });

          navigate({
            pathname: "/",
            search: searchParams.toString(),
          });
        }
      } catch (e) {
        console.warn("Could not parse the program from URL", e);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="col-span-12 flex justify-center h-[50vh] align-middle">
      <div className="min-w-[50vw] max-md:w-[100%] min-h-[500px] h-[75vh] flex flex-col">
        <Loader />
      </div>
    </div>
  );
};

export default ProgramLoader;
