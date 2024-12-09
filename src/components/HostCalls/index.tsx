import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useAppSelector } from "@/store/hooks.ts";
import { CurrentInstruction } from "@/types/pvm";
import { Args, ArgumentType } from "@typeberry/pvm-debugger-adapter";

function isInstructionError(
  instruction: CurrentInstruction,
): instruction is Extract<CurrentInstruction, { error: string }> {
  return "error" in instruction;
}

function isOneImmediateArgs(args: Args): args is Extract<Args, { type: ArgumentType.ONE_IMMEDIATE }> {
  return args.type === ArgumentType.ONE_IMMEDIATE;
}

export const HosCalls = ({
  currentInstructionEnriched,
}: {
  currentInstructionEnriched: CurrentInstruction | undefined;
}) => {
  const { hasHostCallOpen } = useAppSelector((state) => state.debugger);

  // const workerState = useAppSelector((state) => state.workers?.[0]);

  if (
    !currentInstructionEnriched ||
    isInstructionError(currentInstructionEnriched) ||
    !isOneImmediateArgs(currentInstructionEnriched.args)
  ) {
    return;
  }

  return (
    <Dialog open={hasHostCallOpen}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Handle host call</DialogTitle>
          <DialogDescription>Debugger encountered ecalli. Please handle the result manually</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <span>Type</span>
            <span>
              {currentInstructionEnriched.name}&nbsp;{currentInstructionEnriched.args.immediateDecoder.getUnsigned()}
            </span>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <span>value</span>
            <Input id="username" defaultValue="@peduarte" className="col-span-3" />
          </div>
        </div>
        <DialogFooter>
          <Button type="submit">Save changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
