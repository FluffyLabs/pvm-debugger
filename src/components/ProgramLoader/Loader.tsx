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
import { Links } from "./Links";
import { Separator } from "../ui/separator";

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
    <div className="border-2 flex-1 flex flex-col w-full h-full rounded-lg">
      <h2 className="text-lg mb-4 bg-[#4BB6AD] text-white font-light p-2 rounded-ss-lg rounded-se-lg">
        Start with an example program or upload your file
      </h2>
      <div className="flex flex-col p-4 justify-around h-full">
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
        <Links />
        {error && isSubmitted && <p className="text-red-500 whitespace-pre-line">{error}</p>}
      </div>
      <div className="px-5">
        <Separator />
      </div>
      <div className="m-5 flex justify-end">
        <Button
          className="mt-3 min-w-[200px] rounded-2xl font-bold text-brand bg-transparent border-brand"
          variant="outline"
          id="load-button"
          type="button"
          onClick={handleLoad}
        >
          Load
        </Button>
      </div>
    </div>
  );
};
