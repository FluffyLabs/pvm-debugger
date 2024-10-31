import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "../ui/button";
import { Assembly } from "./Assembly";
import { Bytecode } from "./Bytecode";
import { Examples } from "./Examples";
import { TextFileUpload } from "./TextFileUpload";
import { useState, useCallback } from "react";
import { ProgramUploadFileOutput } from "./types";
import { InitialState } from "@/types/pvm";

export const Loader = ({
  initialState,
  onProgramLoad,
  program,
  setIsDialogOpen,
}: {
  initialState: InitialState;
  onProgramLoad: (val: ProgramUploadFileOutput) => void;
  program: number[];
  setIsDialogOpen?: (val: boolean) => void;
}) => {
  const [programLoad, setProgramLoad] = useState<ProgramUploadFileOutput>();

  const handleLoad = useCallback(() => {
    if (!programLoad) return;

    onProgramLoad(programLoad);
    setIsDialogOpen?.(false);
  }, [programLoad, onProgramLoad, setIsDialogOpen]);

  return (
    <>
      <Tabs className="flex-1 flex flex-col items-start overflow-auto" defaultValue="upload">
        <TabsList>
          <TabsTrigger value="upload">JSON tests</TabsTrigger>
          <TabsTrigger value="examples">Examples</TabsTrigger>
          <TabsTrigger className="hidden lg:inline-flex" value="bytecode">
            RAW bytecode
          </TabsTrigger>
          <TabsTrigger value="assembly">Assembly</TabsTrigger>
        </TabsList>
        <div className="border-2 rounded p-4 flex-1 flex flex-col w-full h-full overflow-auto">
          <TabsContent value="upload">
            <TextFileUpload onFileUpload={setProgramLoad} />
          </TabsContent>
          <TabsContent value="examples">
            <Examples onProgramLoad={setProgramLoad} />
          </TabsContent>
          <TabsContent value="bytecode">
            <Bytecode onProgramLoad={setProgramLoad} program={program} />
          </TabsContent>
          <TabsContent value="assembly">
            <Assembly onProgramLoad={setProgramLoad} program={program} initialState={initialState} />
          </TabsContent>
        </div>
      </Tabs>
      <Button id="load-button" type="button" disabled={!programLoad} onClick={handleLoad}>
        Load
      </Button>
    </>
  );
};
