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
        <Button>Load</Button>
      </DialogTrigger>
      <DialogContent className="min-h-[500px] max-h-[85vh] flex flex-col overflow-auto">
        <DialogHeader>
          <DialogTitle></DialogTitle>
          <DialogDescription></DialogDescription>
        </DialogHeader>
        <Loader {...props} setIsDialogOpen={setIsDialogOpen} />
      </DialogContent>
    </Dialog>
  );
};
