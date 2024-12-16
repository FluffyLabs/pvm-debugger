import { Button } from "@/components/ui/button";
import { Textarea } from "../ui/textarea";
import { CheckCircle } from "lucide-react";
import { hash, bytes } from "@typeberry/jam-host-calls";
import { Storage } from "@/packages/web-worker/types";
import { useEffect, useState } from "react";
import { logger } from "@/utils/loggerService";
import { setHasHostCallOpen, setStorage } from "@/store/debugger/debuggerSlice";
import { setAllWorkersStorage } from "@/store/workers/workersSlice";
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

export const HostCallsForm = (props: { onAfterSubmit?: () => void }) => {
  const { storage } = useAppSelector((state) => state.debugger);
  const dispatch = useAppDispatch();
  const [inputValue, setInputValue] = useState<string>();

  useEffect(() => {
    setInputValue(storage ? JSON.stringify(Object.fromEntries(storage.entries())) : "");
  }, [storage]);

  const onSubmit = async () => {
    try {
      const jsonValue = inputValue ? (JSON.parse(inputValue) as { [key: string]: string }) : {};
      const parsedValue = parseJSONToStorage(jsonValue);
      dispatch(setStorage(parsedValue));
      await dispatch(setAllWorkersStorage()).unwrap();
      dispatch(setHasHostCallOpen(false));
      props.onAfterSubmit?.();

      // dispatch(setIsDebugFinished(false));
      // await dispatch(stepAllWorkers()).unwrap();
    } catch (error) {
      logger.error("Wrong JSON", { error });
    }
  };

  return (
    <div className="py-4 ">
      <span className="block text-lg text-black font-bold mb-2">Storage Value</span>
      <span className="mb-3 block">
        Set storage for read & write host calls. Confirm empty, if you want to process. Storage can be modified by
        running program.
      </span>
      <Textarea
        id="storage"
        autoFocus
        className="col-span-3"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
      />
      <div className="flex mt-2">
        <Button type="submit" onClick={onSubmit}>
          Confirm
        </Button>
        {storage !== null && (
          <span className="flex items-center ml-3">
            <CheckCircle color="green" className="mr-2" /> Storage provided
          </span>
        )}
      </div>
    </div>
  );
};
