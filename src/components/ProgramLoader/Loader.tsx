import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
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

export const Loader = ({ setIsDialogOpen }: { setIsDialogOpen?: (val: boolean) => void }) => {
  const dispatch = useAppDispatch();
  const [programLoad, setProgramLoad] = useState<ProgramUploadFileOutput>();
  const [error, setError] = useState<string>();
  const [isSubmitted, setIsSubmitted] = useState(false);
  const debuggerActions = useDebuggerActions();
  const isLoading = useAppSelector(selectIsAnyWorkerLoading);

  useEffect(() => {
    setError("");
  }, [isLoading]);

  const handleLoad = useCallback(async () => {
    setIsSubmitted(true);
    if (!programLoad) return;

    dispatch(setIsProgramEditMode(false));

    try {
      await debuggerActions.handleProgramLoad(programLoad);
      setIsDialogOpen?.(false);
    } catch (error) {
      if (error instanceof Error || isSerializedError(error)) {
        setError(error.message);
      } else {
        setError("Unknown error occured");
      }
    }
  }, [dispatch, programLoad, debuggerActions, setIsDialogOpen]);
  return (
    <>
      <Tabs className="flex-1 flex flex-col items-start overflow-auto" defaultValue="upload">
        <TabsList>
          <TabsTrigger value="upload">Upload file</TabsTrigger>
          <TabsTrigger value="examples">Start with examples</TabsTrigger>
        </TabsList>
        <div className="border-2 rounded p-4 flex-1 flex flex-col w-full h-full overflow-auto md:px-5">
          <TabsContent value="upload">
            <ProgramFileUpload
              onFileUpload={(val) => {
                setProgramLoad(val);
                setIsSubmitted(false);
              }}
              onParseError={(error) => {
                setError(error);
              }}
            />
          </TabsContent>
          <TabsContent value="examples">
            <Examples
              onProgramLoad={(val) => {
                setProgramLoad(val);
                setIsSubmitted(false);
              }}
            />
          </TabsContent>
          {error && isSubmitted && <p className="text-red-500 whitespace-pre-line">{error}</p>}
        </div>
      </Tabs>
      <Button className="mt-3" id="load-button" type="button" onClick={handleLoad}>
        Load
      </Button>
    </>
  );
};
