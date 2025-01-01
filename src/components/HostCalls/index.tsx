import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAppDispatch, useAppSelector } from "@/store/hooks.ts";
import { handleHostCall, setAllWorkersServiceId, setAllWorkersStorage } from "@/store/workers/workersSlice";
import { TrieInput } from "./trie-input";
import { Button } from "../ui/button";
import { setHasHostCallOpen, setServiceId, setStorage } from "@/store/debugger/debuggerSlice";
import { useContext, useEffect, useState } from "react";
import { CurrentInstruction, DebuggerEcalliStorage } from "@/types/pvm";
import { ArgumentType } from "@typeberry/pvm-debugger-adapter";
import { isSerializedError } from "@/store/utils";
import { Input } from "../ui/input";
import { NumeralSystemContext } from "@/context/NumeralSystemContext";
import { NumeralSystem } from "@/context/NumeralSystem";
import { valueToNumeralSystem } from "../Instructions/utils";

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
  const dispatch = useAppDispatch();
  const { numeralSystem } = useContext(NumeralSystemContext);
  const { storage, hasHostCallOpen, programPreviewResult, serviceId } = useAppSelector((state) => state.debugger);
  const firstWorker = useAppSelector((state) => state.workers?.[0]);
  const currentInstruction = firstWorker?.currentInstruction;

  const [newServiceId, setNewServiceId] = useState<number | null>();
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
    setNewServiceId(serviceId);
  }, [serviceId, storage]);

  const onSubmit = async () => {
    setError("");

    try {
      dispatch(setStorage(newStorage || []));
      dispatch(setServiceId(newServiceId));
      await dispatch(setAllWorkersStorage()).unwrap();
      await dispatch(setAllWorkersServiceId()).unwrap();

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
      <DialogContent className="min-w-[80vw] min-h-[70vh] max-h-[70vh]" hideClose={isOnEcalli}>
        <div className="flex flex-col">
          <DialogHeader>
            <DialogTitle className="mb-4">Define ecalli data</DialogTitle>
          </DialogHeader>
          <div className="mt-3">
            <span className="block text-md text-black font-bold mb-2">Service id</span>
            <span className="mb-3 block">Provide storage service id</span>
            <Input
              onChange={(e) => {
                const value = e.target?.value;
                const valueInDecimal = numeralSystem === NumeralSystem.HEXADECIMAL ? `${parseInt(value, 16)}` : value;
                const newValue =
                  valueInDecimal && !Number.isNaN(parseInt(valueInDecimal)) ? parseInt(valueInDecimal) : 0;

                setNewServiceId(newValue);
              }}
              value={valueToNumeralSystem(newServiceId ?? 0, numeralSystem)}
            />
          </div>
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
