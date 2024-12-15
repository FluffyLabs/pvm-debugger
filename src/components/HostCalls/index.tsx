import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAppDispatch, useAppSelector } from "@/store/hooks.ts";
import { HostCallsForm } from "./form";
import { handleHostCall } from "@/store/workers/workersSlice";

export const HostCalls = () => {
  const { hasHostCallOpen } = useAppSelector((state) => state.debugger);
  const dispatch = useAppDispatch();

  // if (
  //   !currentInstructionEnriched ||
  //   isInstructionError(currentInstructionEnriched) ||
  //   !isOneImmediateArgs(currentInstructionEnriched.args)
  // ) {
  //   return;
  // }
  // const ecalliIndex = currentInstructionEnriched.args.immediateDecoder.getUnsigned();
  // const isOpen = storage === null && (ecalliIndex === 2 || ecalliIndex === 3);

  return (
    <Dialog open={hasHostCallOpen}>
      <DialogContent className="sm:max-w-[425px]">
        <div>
          <DialogHeader>
            <DialogTitle>Storage</DialogTitle>
            <DialogDescription>
              Debugger encountered ecalli. No storage detected. Please provide JSON storage or confirm empty
            </DialogDescription>
          </DialogHeader>
          <HostCallsForm onAfterSubmit={() => dispatch(handleHostCall())} />
        </div>
      </DialogContent>
      {/*<DialogClose*/}
      {/*  onClick={() => {*/}
      {/*    dispatch(setHasHostCallOpen(false));*/}
      {/*  }}*/}
      {/*/>*/}
    </Dialog>
  );
};
