import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
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
        <Button variant="secondary">
          <Upload size="12px" /> <span className="max-sm:hidden ml-2">Load</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="flex flex-col m-0 p-0 border-0" hideClose>
        <Loader {...props} setIsDialogOpen={setIsDialogOpen} />
      </DialogContent>
    </Dialog>
  );
};
