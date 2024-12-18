import { Button } from "../ui/button";
import { Examples } from "./Examples";
import { useState, useCallback, useEffect } from "react";
import { ProgramUploadFileOutput } from "./types";
import { useDebuggerActions } from "@/hooks/useDebuggerActions";
import { useAppDispatch, useAppSelector } from "@/store/hooks.ts";
import { setIsProgramEditMode } from "@/store/debugger/debuggerSlice.ts";
import { selectIsAnyWorkerLoading } from "@/store/workers/workersSlice";
import { isSerializedError } from "@/store/utils";
import { ProgramFileUpload } from "@/components/ProgramLoader/ProgramFileUpload.tsx";
import { bytes } from "@typeberry/block";
import { selectInitialState } from "@/store/debugger/debuggerSlice.ts";
import { decodeStandardProgram } from "@typeberry/pvm-debugger-adapter";
import { RegistersArray } from "@/types/pvm.ts";
import { useNavigate, useSearchParams } from "react-router";

export const Loader = ({ setIsDialogOpen }: { setIsDialogOpen?: (val: boolean) => void }) => {
  const dispatch = useAppDispatch();
  const initialState = useAppSelector(selectInitialState);
  const [programLoad, setProgramLoad] = useState<ProgramUploadFileOutput>();
  const [error, setError] = useState<string>();
  const [isSubmitted, setIsSubmitted] = useState(false);
  const debuggerActions = useDebuggerActions();
  const isLoading = useAppSelector(selectIsAnyWorkerLoading);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    setError("");
  }, [isLoading]);

  const handleLoad = useCallback(
    async (_event: unknown, program?: ProgramUploadFileOutput) => {
      setIsSubmitted(true);

      if (!programLoad && !program) return;

      dispatch(setIsProgramEditMode(false));

      try {
        await debuggerActions.handleProgramLoad(program || programLoad);
        setIsDialogOpen?.(false);
        navigate("/");
      } catch (error) {
        if (error instanceof Error || isSerializedError(error)) {
          setError(error.message);
        } else {
          setError("Unknown error occurred");
        }
      }
    },
    [dispatch, programLoad, debuggerActions, setIsDialogOpen, navigate],
  );

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

            handleLoad({
              program: Array.from(code),
              name: "custom",
              initial: {
                regs: Array.from(registers) as RegistersArray,
                pc: 0,
                pageMap: [],
                // TODO: map memory properly
                // memory: [...memory],
                gas: 10000n,
              },
            });
          } catch (e) {
            console.warn("Could not load the program from URL", e);
          }
        } else {
          handleLoad(undefined, {
            program: parsedBlobArray,
            name: "custom",
            initial: initialState,
          });
        }
      } catch (e) {
        console.warn("Could not parse the program from URL", e);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <div className="border-2 rounded p-4 flex-1 flex flex-col w-full h-full md:px-5">
        <Examples
          onProgramLoad={(val) => {
            setProgramLoad(val);
            setIsSubmitted(false);
            handleLoad(undefined, val);
          }}
        />
        <ProgramFileUpload
          onFileUpload={(val) => {
            setProgramLoad(val);
            setIsSubmitted(false);
          }}
          onParseError={(error) => {
            setError(error);
          }}
        />
        {error && isSubmitted && <p className="text-red-500 whitespace-pre-line">{error}</p>}
      </div>
      <Button className="mt-3" id="load-button" type="button" onClick={handleLoad}>
        Load
      </Button>
    </>
  );
};
