import { ProgramUploadFileOutput } from "./types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button.tsx";
import { useState } from "react";
import { FileUpload } from "./FileUpload";

export const ProgramUpload = ({ onFileUpload }: { onFileUpload: (val: ProgramUploadFileOutput) => void }) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild onClick={(e) => e.stopPropagation()}>
        <Button>Load</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Load program</DialogTitle>
          <DialogDescription></DialogDescription>
        </DialogHeader>
        <FileUpload onFileUpload={onFileUpload} close={() => setIsDialogOpen(false)} />
      </DialogContent>
    </Dialog>
  );
};
