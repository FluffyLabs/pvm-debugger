import { ProgramUploadFileOutput } from "./types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button.tsx";
import { useCallback, useState } from "react";
import { FileUpload } from "./FileUpload";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Examples } from "./Examples";
import { Bytecode } from "./Bytecode";
import { Assembly } from "./Assembly";
import { InitialState } from "@/types/pvm";

export const ProgramUpload = ({
  initialState,
  onFileUpload,
  program,
}: {
  initialState: InitialState;
  onFileUpload: (val: ProgramUploadFileOutput) => void;
  program: number[];
}) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [file, setFile] = useState<ProgramUploadFileOutput>();

  const handleLoad = useCallback(() => {
    if (!file) return;

    onFileUpload(file);
    setIsDialogOpen(false);
  }, [file, onFileUpload]);

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild onClick={(e) => e.stopPropagation()}>
        <Button>Load</Button>
      </DialogTrigger>
      <DialogContent className="min-h-[500px] h-[75vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Load program</DialogTitle>
          <DialogDescription></DialogDescription>
        </DialogHeader>
        <Tabs className="flex-1 flex flex-col items-start" defaultValue="upload">
          <TabsList>
            <TabsTrigger value="upload">JSON tests</TabsTrigger>
            <TabsTrigger value="examples">Examples</TabsTrigger>
            <TabsTrigger className="hidden lg:inline-flex" value="bytecode">
              RAW bytecode
            </TabsTrigger>
            <TabsTrigger value="assembly">Assembly</TabsTrigger>
          </TabsList>
          <div className="border-2 rounded mt-2 p-4 flex-1 flex flex-col w-full">
            <TabsContent value="upload">
              <FileUpload onFileUpload={setFile} />
            </TabsContent>
            <TabsContent value="examples">
              <Examples onFileUpload={setFile} />
            </TabsContent>
            <TabsContent value="bytecode">
              <Bytecode onFileUpload={setFile} program={program} />
            </TabsContent>
            <TabsContent value="assembly">
              <Assembly onFileUpload={setFile} program={program} initialState={initialState} />
            </TabsContent>
          </div>
        </Tabs>
        <DialogFooter>
          <Button
            id="load-button"
            type="button"
            disabled={!file}
            onClick={handleLoad}>
            Load
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
