import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useAppDispatch, useAppSelector } from "@/store/hooks.ts";
import { setHasHostCallOpen } from "@/store/debugger/debuggerSlice";
import { HostCallsContent } from "./HostCallsContent";

export const HostCalls = () => {
  const dispatch = useAppDispatch();
  const { hasHostCallOpen } = useAppSelector((state) => state.debugger);

  return (
    <Dialog
      open={hasHostCallOpen}
      onOpenChange={(val) => {
        if (!val) {
          dispatch(setHasHostCallOpen(false));
        }
      }}
    >
      <DialogContent className="min-w-[680px] h-full sm:h-[75vh] p-0" hideClose>
        <HostCallsContent onSetStorage={() => setHasHostCallOpen(false)} />
      </DialogContent>
    </Dialog>
  );
};
