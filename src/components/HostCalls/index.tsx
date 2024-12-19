import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAppDispatch, useAppSelector } from "@/store/hooks.ts";
import { setAllWorkersStorage } from "@/store/workers/workersSlice";
import { TrieInput } from "./trie-input";
import { Button } from "../ui/button";
import { setHasHostCallOpen, setStorage } from "@/store/debugger/debuggerSlice";
import { useEffect, useState } from "react";
import { logger } from "@/utils/loggerService";
import { Storage } from "@/packages/web-worker/types";

export const HostCalls = () => {
  const { storage, hasHostCallOpen } = useAppSelector((state) => state.debugger);
  const dispatch = useAppDispatch();
  const [newStorage, setNewStorage] = useState<Storage | null>();

  useEffect(() => {
    setNewStorage(storage);
  }, [storage]);

  const onSubmit = async () => {
    try {
      dispatch(setStorage(newStorage));
      await dispatch(setAllWorkersStorage()).unwrap();
      dispatch(setHasHostCallOpen(false));
      // only for in run mode
      // dispatch(handleHostCall())
    } catch (error) {
      logger.error("Wrong JSON", { error });
    }
  };

  return (
    <Dialog open={hasHostCallOpen}>
      <DialogContent className="min-w-[70vw] min-h-[70vh]">
        <div className="flex flex-col">
          <DialogHeader>
            <DialogTitle className="mb-4">Storage</DialogTitle>
            {/* <DialogDescription>Please provide JSON storage or confirm empty</DialogDescription> */}
          </DialogHeader>
          <div className="border-gray-500 border-2 rounded-lg h-full">
            <TrieInput onChange={(v) => setNewStorage(v)} />
          </div>
          <div className="flex mt-2 ml-auto">
            <Button type="submit" onClick={onSubmit}>
              Confirm
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
