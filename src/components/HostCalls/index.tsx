import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAppSelector } from "@/store/hooks.ts";
import { CurrentInstruction } from "@/types/pvm";
import { isInstructionError, isOneImmediateArgs } from "@/types/type-guards";
import { HostCallsForm } from "./form";

export const HosCalls = ({
  currentInstructionEnriched,
}: {
  currentInstructionEnriched: CurrentInstruction | undefined;
}) => {
  const { storage } = useAppSelector((state) => state.debugger);

  if (
    !currentInstructionEnriched ||
    isInstructionError(currentInstructionEnriched) ||
    !isOneImmediateArgs(currentInstructionEnriched.args)
  ) {
    return;
  }
  const ecalliIndex = currentInstructionEnriched.args.immediateDecoder.getUnsigned();
  const isOpen = storage === null && (ecalliIndex === 2 || ecalliIndex === 3);

  return (
    <Dialog open={isOpen}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Storage</DialogTitle>
          <DialogDescription>
            Debugger encountered ecalli. No storage detected. Please provide JSON storage or confirm empty
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-4 items-center gap-4">
          <span>Type</span>
          <span>Ecalli&nbsp;{ecalliIndex}</span>
        </div>
        <HostCallsForm />
      </DialogContent>
    </Dialog>
  );
};
