import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAppDispatch, useAppSelector } from "@/store/hooks.ts";
import { handleHostCall, setAllWorkersStorage } from "@/store/workers/workersSlice";
import { TrieInput } from "./trie-input";
import { Button } from "../ui/button";
import { setHasHostCallOpen, setStorage } from "@/store/debugger/debuggerSlice";
import { useEffect, useState } from "react";
import { DebuggerEcalliStorage } from "@/types/pvm";
import { isSerializedError } from "@/store/utils";

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
      dispatch(setStorage({ storage: newStorage, isUserProvided: false }));
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
      <DialogContent className="min-w-[80vw] min-h-[70vh] max-h-[70vh]" hideClose={isOnEcalli}>
        <div className="flex flex-col">
          <DialogHeader>
            <DialogTitle className="mb-4">Define ecalli data</DialogTitle>
          </DialogHeader>

          <div className="mt-6">
            <span className="block text-md text-black font-bold mb-2">Storage value</span>
            <span>Please provide JSON storage or confirm empty</span>
            <div className="border-gray-100 border-2 rounded-lg pt-1 mt-2 h-[45vh] overflow-y-auto">
              <TrieInput onChange={(v) => setNewStorage(v)} initialRows={storage} />
            </div>
          </div>
          {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
        </div>
        <div className="flex mt-2 ml-auto">
          <Button type="submit" onClick={onSubmit}>
            Confirm
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
