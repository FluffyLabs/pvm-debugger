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

export const ProgramLoader = (props: { initialState: InitialState; program: number[] }) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

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
        <Loader {...props} setIsDialogOpen={setIsDialogOpen} />
      </DialogContent>
    </Dialog>
  );
};
