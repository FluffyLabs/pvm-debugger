import { DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAppDispatch, useAppSelector } from "@/store/hooks.ts";
import { handleHostCall, setAllWorkersStorage } from "@/store/workers/workersSlice";
import { TrieInput } from "./trie-input";
import { Button } from "../ui/button";
import { setStorage } from "@/store/debugger/debuggerSlice";
import { useEffect, useState } from "react";
import { DebuggerEcalliStorage } from "@/types/pvm";
import { isSerializedError } from "@/store/utils";
import { ChevronLeft, InfoIcon } from "lucide-react";
import { Separator } from "../ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";

const isEcalliWriteOrRead = (exitArg?: number) => {
  return exitArg === 2 || exitArg === 3;
};

export const HostCallsContent = ({ onSetStorage }: { onSetStorage: () => void }) => {
  const dispatch = useAppDispatch();
  const { storage } = useAppSelector((state) => state.debugger);
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

        onSetStorage();
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
    <>
      <div className="flex flex-col flex-1 overflow-y-hidden">
        <DialogHeader className="py-3 px-6 bg-title text-title-foreground rounded-t-lg border-b">
          <DialogTitle className="text-base">Define ecalli data</DialogTitle>
        </DialogHeader>
        {!isOnEcalli && (
          <>
            <div className="flex items-center my-4">
              <Button className="p-1 mx-3" variant="ghost" onClick={() => onSetStorage()}>
                <ChevronLeft className="text-brand-dark dark:text-brand" />
              </Button>
              Settings
            </div>

            <Separator />
          </>
        )}

        <div className="mt-6 px-6 overflow-y-auto">
          <span className="text-md text-foreground font-bold mb-2 flex">
            Storage{" "}
            <Tooltip>
              <TooltipTrigger>
                <InfoIcon className="ml-2 text-brand-dark dark:text-brand" height="18px" />
              </TooltipTrigger>
              <TooltipContent>
                <p>Please provide JSON storage or confirm empty</p>
              </TooltipContent>
            </Tooltip>
          </span>
          <div className="pt-1 mt-2">
            <TrieInput onChange={(v) => setNewStorage(v)} initialRows={storage} />
          </div>
        </div>
        {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
      </div>
      <div className="flex px-6 justify-end pb-5">
        <Button type="submit" onClick={onSubmit} className="w-[150px]">
          Confirm
        </Button>
      </div>
    </>
  );
};
