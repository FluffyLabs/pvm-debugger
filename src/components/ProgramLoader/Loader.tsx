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
import { useNavigate } from "react-router";

export const Loader = ({ setIsDialogOpen }: { setIsDialogOpen?: (val: boolean) => void }) => {
  const dispatch = useAppDispatch();
  const [programLoad, setProgramLoad] = useState<ProgramUploadFileOutput>();
  const [error, setError] = useState<string>();
  const [isSubmitted, setIsSubmitted] = useState(false);
  const debuggerActions = useDebuggerActions();
  const isLoading = useAppSelector(selectIsAnyWorkerLoading);
  const navigate = useNavigate();

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
