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
import { TriangleAlert } from "lucide-react";

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
    async (program?: ProgramUploadFileOutput) => {
      setIsSubmitted(true);

      if (!programLoad && !program) return;

      dispatch(setIsProgramEditMode(false));

      try {
        await debuggerActions.handleProgramLoad(program || programLoad);
        setIsDialogOpen?.(false);
        navigate("/", { replace: true });
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

  const isProgramLoaded = programLoad !== undefined;

  return (
    <div className="flex flex-col w-full h-full bg-card pb-3">
      <p className="sm:mb-4 bg-brand-dark dark:bg-brand/65 text-white text-xs font-light px-3 pt-3 pb-2">
        Start with an example program or upload your file
      </p>
      <div className="flex flex-col px-7 pt-[30px] h-full overflow-auto">
        <Examples
          onProgramLoad={(val) => {
            setProgramLoad(val);
            setIsSubmitted(false);
            handleLoad(val);
          }}
        />

        <div className="my-10">
          <ProgramFileUpload
            onFileUpload={(val) => {
              setProgramLoad(val);
              setIsSubmitted(false);
              // handleLoad(val);
            }}
          />
        </div>
        <Links />
        {error && isSubmitted && (
          <p className="flex items-center text-destructive-foreground mt-10 text-[11px] whitespace-pre-line">
            <TriangleAlert className="mr-2" height="18px" /> {error}
          </p>
        )}
      </div>
      <div className="px-5 mt-[30px]">
        <Separator />
      </div>
      <div className="m-6 mb-7 flex justify-end">
        <Button
          className="mt-3 min-w-[92px]"
          id="load-button"
          type="button"
          disabled={!isProgramLoaded}
          onClick={() => handleLoad()}
        >
          Load
        </Button>
      </div>
    </div>
  );
};
