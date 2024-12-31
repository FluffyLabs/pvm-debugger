import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useAppDispatch, useAppSelector } from "@/store/hooks.ts";
import { handleHostCall, setAllWorkersStorage } from "@/store/workers/workersSlice";
import { TrieInput } from "./trie-input";
import { Button } from "../ui/button";
import { setHasHostCallOpen, setStorage } from "@/store/debugger/debuggerSlice";
import { useEffect, useState } from "react";
import { CurrentInstruction, DebuggerEcalliStorage } from "@/types/pvm";
import { ArgumentType } from "@typeberry/pvm-debugger-adapter";
import { isSerializedError } from "@/store/utils";

const isEcalliWriteOrRead = (currentInstruction: CurrentInstruction) => {
  return (
    currentInstruction &&
    "args" in currentInstruction &&
    currentInstruction.args.type === ArgumentType.ONE_IMMEDIATE &&
    (currentInstruction.args.immediateDecoder.getSigned() === 2 ||
      currentInstruction.args.immediateDecoder.getSigned() === 3)
  );
};
export const HostCalls = () => {
  const { storage, hasHostCallOpen, programPreviewResult } = useAppSelector((state) => state.debugger);
  const firstWorker = useAppSelector((state) => state.workers?.[0]);
  const currentInstruction = firstWorker?.currentInstruction;

  const dispatch = useAppDispatch();
  const [newStorage, setNewStorage] = useState<DebuggerEcalliStorage | null>();
  const [error, setError] = useState<string>();
  const previousInstruction =
    programPreviewResult[
      programPreviewResult.findIndex(
        (instruction) => instruction.instructionCode === currentInstruction?.instructionCode,
      ) - 1
    ];

  const isOnEcalli = previousInstruction && isEcalliWriteOrRead(previousInstruction);

  useEffect(() => {
    setNewStorage(storage);
  }, [storage]);

  const onSubmit = async () => {
    setError("");

    try {
      dispatch(setStorage(newStorage || []));
      await dispatch(setAllWorkersStorage()).unwrap();

      try {
        if (isOnEcalli) {
          await dispatch(handleHostCall()).unwrap();
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
      <DialogContent className="min-w-[80vw] min-h-[70vh]" hideClose={isOnEcalli}>
        <div className="flex flex-col">
          <DialogHeader>
            <DialogTitle className="mb-4">Storage</DialogTitle>
            <DialogDescription>Please provide JSON storage or confirm empty</DialogDescription>
          </DialogHeader>
          <div className="border-gray-500 border-2 rounded-lg h-full pt-1">
            <TrieInput onChange={(v) => setNewStorage(v)} initialRows={storage} />
          </div>
          {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
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
