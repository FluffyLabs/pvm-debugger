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
import { InitialState } from "@/types/pvm";
import { Loader } from "./Loader.tsx";
import { Upload } from "lucide-react";

export const ProgramLoader = (props: { initialState: InitialState; program: number[]; onOpen: () => void }) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  return (
    <Dialog
      open={isDialogOpen}
      onOpenChange={(val) => {
        setIsDialogOpen(val);
        if (val) {
          props.onOpen();
        }
      }}
    >
      <DialogTrigger asChild onClick={(e) => e.stopPropagation()}>
        <Button>
          <Upload size="12px" className="mr-2" /> Load
        </Button>
      </DialogTrigger>
      <DialogContent className="min-h-[500px] max-h-[85vh] flex flex-col overflow-auto m-0 p-0 border-0">
        <DialogHeader>
          <DialogTitle>
            <h2 className="text-lg mb-4 bg-[#4BB6AD] text-white font-light p-2">
              Start with an example program or upload your file
            </h2>
          </DialogTitle>
          <DialogDescription></DialogDescription>
        </DialogHeader>
        <Loader {...props} setIsDialogOpen={setIsDialogOpen} />
      </DialogContent>
    </Dialog>
  );
};
