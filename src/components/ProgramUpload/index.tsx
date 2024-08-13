import { Input } from "@/components/ui/input.tsx";
import { ProgramUploadFileOutput } from "./types";
import { mapUploadFileInputToOutput } from "./utils";
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

export const ProgramUpload = ({ onFileUpload }: { onFileUpload: (val: ProgramUploadFileOutput) => void }) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  let fileReader: FileReader;

  const handleFileRead = () => {
    const fileContent = fileReader?.result;

    try {
      if (fileContent !== null && typeof fileContent === "string") {
        const jsonFile = JSON.parse(fileContent);
        onFileUpload(mapUploadFileInputToOutput(jsonFile));
      } else {
        alert("Cannot read file");
      }
    } catch (e) {
      alert("Cannot parse JSON");
    }
  };

  const handleProgramUpload = (file: Blob) => {
    fileReader = new FileReader();
    fileReader.onloadend = handleFileRead;
    fileReader.readAsText(file);
  };

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild onClick={(e) => e.stopPropagation()}>
        <Button>Load from test file</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Load program from test file</DialogTitle>
          <DialogDescription></DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <div className="col-auto">
              <Input
                className="w-200"
                id="test-file"
                type="file"
                accept="application/json"
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => {
                  if (e.target.files?.length) {
                    handleProgramUpload(e.target.files[0]);
                    setIsDialogOpen(false);
                  }
                }}
              />
            </div>
          </div>
        </div>
        <DialogFooter>{/*<Button type="submit">Save changes</Button>*/}</DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
