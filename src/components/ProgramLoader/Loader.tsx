import { Button } from "../ui/button";
import { Examples } from "./Examples";
import { useState, useCallback, useEffect } from "react";
import { ProgramUploadFileOutput } from "./types";
import { useDebuggerActions } from "@/hooks/useDebuggerActions";
import { useAppDispatch, useAppSelector } from "@/store/hooks.ts";
import { setIsProgramEditMode, setSpiArgs } from "@/store/debugger/debuggerSlice.ts";
import { selectIsAnyWorkerLoading } from "@/store/workers/workersSlice";
import { isSerializedError } from "@/store/utils";
import { ProgramFileUpload } from "@/components/ProgramLoader/ProgramFileUpload.tsx";
import { useNavigate } from "react-router";
import { Links } from "./Links";
import { Separator } from "../ui/separator";
import { TriangleAlert } from "lucide-react";
import { WithHelp } from "../WithHelp/WithHelp";
import { Input } from "../ui/input";
import { bytes } from "@typeberry/lib";
import { cn } from "@/lib/utils";

export const Loader = ({ setIsDialogOpen }: { setIsDialogOpen?: (val: boolean) => void }) => {
  const dispatch = useAppDispatch();
  const [programLoad, setProgramLoad] = useState<ProgramUploadFileOutput>();
  const [error, setError] = useState<string>();
  const debuggerActions = useDebuggerActions();
  const isLoading = useAppSelector(selectIsAnyWorkerLoading);
  const debuggerState = useAppSelector((state) => state.debugger);
  const navigate = useNavigate();
  const [textSpiArgs, setTextSpiArgs] = useState(debuggerState.spiArgs?.toString() ?? "");
  const isSpiArgsError = textSpiArgs !== debuggerState.spiArgs?.toString();
  const handleTextSpiArgs = (newVal: string) => {
    setTextSpiArgs(newVal);
    try {
      const parsed = bytes.BytesBlob.parseBlob(newVal);
      dispatch(setSpiArgs(parsed));
    } catch {
      // Ignore parse errors - user may be typing
    }
  };

  useEffect(() => {
    setError("");
  }, [isLoading]);

  const handleLoad = useCallback(
    async (program?: ProgramUploadFileOutput) => {
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
            handleLoad(val);
          }}
        />

        <div className="my-10">
          <ProgramFileUpload onFileUpload={setProgramLoad} isError={error !== undefined} setError={setError} />
        </div>
        {error && (
          <p className="flex items-top text-destructive-foreground h-[145px] overflow-auto text-[11px] whitespace-pre-line">
            <TriangleAlert className="mr-2" height="18px" /> {error}
          </p>
        )}
        {!error && programLoad && (
          <div className="h-[145px] overflow-auto text-xs">
            <div className="mt-2 flex justify-between items-center">
              <span className="block text-xs font-bold min-w-[150px]">Detected:</span>
              <code className="flex-1 ml-2"> {programLoad.kind}</code>
            </div>
            <div className="mt-2 flex justify-between items-center">
              <span className="block text-xs font-bold min-w-[150px]">Name:</span>
              <code className="flex-1 ml-2">{programLoad.name}</code>
            </div>
            <div className="mt-2 flex items-center">
              <span className="block text-xs font-bold min-w-[150px]">Initial state:</span>
              <details open={false} className="flex-1 ml-2">
                <summary>view</summary>
                <pre>{JSON.stringify(programLoad.initial, null, 2)}</pre>
              </details>
            </div>
            {programLoad.spiProgram !== null && (
              <>
                <div className="mt-2 flex justify-between items-center">
                  <span className="block text-xs font-bold min-w-[150px]">
                    <WithHelp help="Hex-encoded JAM SPI arguments written to the heap">Arguments</WithHelp>
                  </span>
                  <Input
                    size={2}
                    className={cn("text-xs m-2", { "border-red": isSpiArgsError })}
                    placeholder="0x-prefixed, encoded operands"
                    onChange={(e) => {
                      const value = e.target?.value;
                      handleTextSpiArgs(value);
                    }}
                    value={textSpiArgs}
                  />
                </div>
                <div className="mt-2 flex justify-between items-center">
                  <span className="block text-xs font-bold min-w-[150px]">
                    <WithHelp help="JSON containing instructions how to handle host calls">Host Calls Trace</WithHelp>
                  </span>
                  <p className="flex-1 ml-2">(coming soon)</p>
                </div>
              </>
            )}
          </div>
        )}
        {!error && !programLoad && <Links />}
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
