import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAppDispatch, useAppSelector } from "@/store/hooks.ts";
import { handleHostCall, setAllWorkersStorage } from "@/store/workers/workersSlice";
import { TrieInput } from "./trie-input";
import { Button } from "../ui/button";
import { setHasHostCallOpen, setStorage } from "@/store/debugger/debuggerSlice";
import { useEffect, useState } from "react";
import { DebuggerEcalliStorage } from "@/types/pvm";
import { isSerializedError } from "@/store/utils";
import { ChevronLeft, InfoIcon } from "lucide-react";
import { Separator } from "../ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip";

const isEcalliWriteOrRead = (exitArg?: number) => {
  return exitArg === 2 || exitArg === 3;
};
export const HostCalls = () => {
  const dispatch = useAppDispatch();
  const { storage, hasHostCallOpen } = useAppSelector((state) => state.debugger);
  const firstWorker = useAppSelector((state) => state.workers?.[0]);

  const [newStorage, setNewStorage] = useState<DebuggerEcalliStorage | null>();
  const [error, setError] = useState<string>();
  const isOnEcalli = isEcalliWriteOrRead(firstWorker?.exitArg);

  useEffect(() => {
    setNewStorage(storage);
  }, [storage]);

  const onSubmit = async () => {
    setError("");

    try {
      dispatch(setStorage({ storage: newStorage, isUserProvided: true }));
      await dispatch(setAllWorkersStorage({ storage: newStorage || null })).unwrap();
      try {
        if (isOnEcalli) {
          await dispatch(handleHostCall({})).unwrap();
        }

        dispatch(setHasHostCallOpen(false));
      } catch (e) {
        if (e instanceof Error || isSerializedError(e)) {
          setError(e.message);
        }
      }
    } catch (e) {
      if (e instanceof Error || isSerializedError(e)) {
        setError(e.message);
      }
    }
  };

  return (
    <Dialog
      open={hasHostCallOpen}
      onOpenChange={(val) => {
        if (!val) {
          dispatch(setHasHostCallOpen(false));
        }
      }}
    >
      <DialogContent className="min-w-[80vw] h-full sm:h-[75vh] p-0" hideClose={isOnEcalli}>
        <div className="flex flex-col">
          <DialogHeader className="py-3 px-4 bg-title text-title-foreground rounded-t-lg border-b">
            <DialogTitle>Define ecalli data</DialogTitle>
          </DialogHeader>
          <div className="flex items-center my-4">
            <Button variant="ghost" onClick={() => dispatch(setHasHostCallOpen(false))}>
              <ChevronLeft className="text-brand-dark dark:text-brand" />
            </Button>
            Settings
          </div>

          <Separator />

          <div className="mt-6 px-6">
            <span className="text-md text-foreground font-bold mb-2 flex">
              Storage{" "}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <InfoIcon className="ml-2 text-brand-dark dark:text-brand" height="18px" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Please provide JSON storage or confirm empty</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </span>
            <div className="pt-1 mt-2 h-full sm:h-[370px] overflow-y-auto">
              <TrieInput onChange={(v) => setNewStorage(v)} initialRows={storage} />
            </div>
          </div>
          {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
        </div>
        <div className="flex mr-6  ml-auto items-end pb-5">
          <Button type="submit" onClick={onSubmit} className="w-[150px]">
            Confirm
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
