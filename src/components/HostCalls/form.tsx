import { Button } from "@/components/ui/button";
import { Textarea } from "../ui/textarea";
import { CheckCircle } from "lucide-react";
import { hash, bytes } from "@typeberry/jam-host-calls";
import { Storage } from "@/packages/web-worker/types";
import { useEffect, useState } from "react";
import { logger } from "@/utils/loggerService";
import { setHasHostCallOpen, setIsDebugFinished, setStorage } from "@/store/debugger/debuggerSlice";
import { handleHostCall, setAllWorkersStorage, stepAllWorkers } from "@/store/workers/workersSlice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";

const parseJSONToStorage = (value: { [key: string]: string }) => {
  const parsedValue: Storage = new Map();

  Object.entries(value).forEach(([key, value]) => {
    parsedValue.set(
      hash.hashBytes(bytes.BytesBlob.blobFromString(key)).toString(),
      bytes.BytesBlob.blobFromString(value),
    );
  });

  return parsedValue;
};

export const HostCallsForm = () => {
  const { storage } = useAppSelector((state) => state.debugger);
  const dispatch = useAppDispatch();
  const [inputValue, setInputValue] = useState<string>();

  useEffect(() => {
    setInputValue(storage ? JSON.stringify(Object.fromEntries(storage)) : "");
  }, [storage]);

  const onSubmit = async () => {
    try {
      const jsonValue = inputValue ? (JSON.parse(inputValue) as { [key: string]: string }) : {};
      const parsedValue = parseJSONToStorage(jsonValue);
      dispatch(setStorage(parsedValue));
      await dispatch(setAllWorkersStorage()).unwrap();
      dispatch(setHasHostCallOpen(false));
      await dispatch(handleHostCall()).unwrap();

      // dispatch(setIsDebugFinished(false));
      // await dispatch(stepAllWorkers()).unwrap();
    } catch (error) {
      logger.error("Wrong JSON", { error });
    }
  };

  return (
    <div className="py-4 ">
      <span className="block text-lg text-black font-bold mb-2">Storage Value</span>
      <span className="mb-3 block">Lorem ipsum</span>
      <Textarea
        id="storage"
        autoFocus
        className="col-span-3"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
      />
      {storage !== null && (
        <span>
          <CheckCircle color="green" /> Storage provided
        </span>
      )}
      <Button type="submit" onClick={onSubmit}>
        Save changes
      </Button>
    </div>
  );
};
