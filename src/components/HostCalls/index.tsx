import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAppDispatch, useAppSelector } from "@/store/hooks.ts";
import { CurrentInstruction } from "@/types/pvm";
import { Textarea } from "../ui/textarea";
import { useEffect, useState } from "react";
import { logger } from "@/utils/loggerService";
import { hash, bytes } from "@typeberry/jam-host-calls";
import { Storage } from "@/packages/web-worker/types";
import { isInstructionError, isOneImmediateArgs } from "@/types/type-guards";
import { setStorage } from "@/store/debugger/debuggerSlice";
import { CheckCircle } from "lucide-react";

const parseJSONToStorage = (value: { [key: string]: string }) => {
  const parsedValue: Storage = new Map();
  Object.entries(value).forEach(([key, value]) => {
    parsedValue.set(hash.hashString(key), bytes.BytesBlob.blobFromString(value));
  });

  return parsedValue;
};

export const HosCalls = ({
  currentInstructionEnriched,
}: {
  currentInstructionEnriched: CurrentInstruction | undefined;
}) => {
  const { storage } = useAppSelector((state) => state.debugger);
  const dispatch = useAppDispatch();
  const [inputValue, setInputValue] = useState<string>();

  useEffect(() => {
    setInputValue(storage ? JSON.stringify(Object.fromEntries(storage)) : "");
  }, [storage]);

  if (
    !currentInstructionEnriched ||
    isInstructionError(currentInstructionEnriched) ||
    !isOneImmediateArgs(currentInstructionEnriched.args)
  ) {
    return;
  }
  const ecalliIndex = currentInstructionEnriched.args.immediateDecoder.getUnsigned();
  const isOpen = storage === null && (ecalliIndex === 2 || ecalliIndex === 3);

  const onSubmit = () => {
    try {
      const jsonValue = inputValue ? (JSON.parse(inputValue) as { [key: string]: string }) : {};
      const parsedValue = parseJSONToStorage(jsonValue);
      dispatch(setStorage(parsedValue));
    } catch (error) {
      logger.error("Wrong JSON", { error });
    }
  };

  return (
    <Dialog open={isOpen}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Storage</DialogTitle>
          <DialogDescription>
            Debugger encountered ecalli. No storage detected. Please provide JSON storage or confirm empty
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <span>Type</span>
            <span>
              {currentInstructionEnriched.name}&nbsp;{currentInstructionEnriched.args.immediateDecoder.getUnsigned()}
            </span>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <span>Storage Value</span>
            <Textarea
              id="storage"
              autoFocus
              className="col-span-3"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
            />
          </div>
          {storage !== null && (
            <span>
              <CheckCircle color="green" /> Storage provided
            </span>
          )}
        </div>
        <DialogFooter>
          <Button type="submit" onClick={onSubmit}>
            Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
