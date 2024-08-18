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
import { useState } from "react";
import { FileUpload } from "./FileUpload";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Examples } from "./Examples";
import { Bytecode } from "./Bytecode";

export const ProgramUpload = ({
  onFileUpload,
  program,
}: {
  onFileUpload: (val: ProgramUploadFileOutput) => void;
  program: number[];
}) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [file, setFile] = useState<ProgramUploadFileOutput>();

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild onClick={(e) => e.stopPropagation()}>
        <Button>Load</Button>
      </DialogTrigger>
      <DialogContent className="min-h-[500px] h-100% flex flex-col">
        <DialogHeader>
          <DialogTitle>Load program</DialogTitle>
          <DialogDescription></DialogDescription>
        </DialogHeader>
        <Tabs className="grow flex flex-col items-start" defaultValue="upload">
          <TabsList>
            <TabsTrigger value="upload">Upload testfile</TabsTrigger>
            <TabsTrigger value="examples">Examples</TabsTrigger>
            <TabsTrigger value="bytecode">Bytecode</TabsTrigger>
          </TabsList>
          <div className="border-2 rounded mt-2 p-4 grow w-full">
            <TabsContent value="upload">
              <FileUpload onFileUpload={setFile} />
            </TabsContent>
            <TabsContent value="examples">
              <Examples onFileUpload={setFile} />
            </TabsContent>
            <TabsContent value="bytecode">
              <Bytecode onFileUpload={setFile} program={program} />
            </TabsContent>
          </div>
        </Tabs>
        <DialogFooter>
          <Button
            type="button"
            disabled={!file}
            onClick={() => {
              if (!file) return;

              onFileUpload(file);
              setIsDialogOpen(false);
            }}
          >
            Load
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
