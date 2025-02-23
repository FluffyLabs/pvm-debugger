import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { CheckCircle, Settings } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setHasHostCallOpen, setServiceId, setStepsToPerform } from "@/store/debugger/debuggerSlice";
import { Button } from "../ui/button";
import { NumeralSystemContext } from "@/context/NumeralSystemContext";
import { valueToNumeralSystem } from "../Instructions/utils";
import { useContext, useState } from "react";
import { setAllWorkersServiceId } from "@/store/workers/workersSlice";
import { isSerializedError } from "@/store/utils";
import { logger } from "@/utils/loggerService";
import { ToggleDarkMode } from "@/packages/ui-kit/DarkMode/ToggleDarkMode";

function stringToNumber<T>(value: string, cb: (x: string) => T): T {
  try {
    return cb(value);
  } catch (_e) {
    return cb("0");
  }
}

export const DebuggerSettings = ({ withLabel }: { withLabel?: boolean }) => {
  const debuggerState = useAppSelector((state) => state.debugger);
  const dispatch = useAppDispatch();
  const { numeralSystem } = useContext(NumeralSystemContext);
  const [error, setError] = useState<string>();

  const onServiceIdChange = async (newServiceId: number) => {
    setError("");
    try {
      dispatch(setServiceId(newServiceId));
      await dispatch(setAllWorkersServiceId()).unwrap();
    } catch (e) {
      if (e instanceof Error || isSerializedError(e)) {
        setError(e.message);
        logger.error(e.toString(), { error: e, hideToast: true });
      }
    }
  };

  return (
    <Dialog>
      <DialogTrigger>
        <div className="mt-2">
          {withLabel ? <span className="mr-2 text-white">Settings</span> : <Settings className="text-gray-700" />}
        </div>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            <span className="text-xl">Debugger Settings</span>
          </DialogTitle>
          <DialogDescription asChild>
            <div>
              <div className="mt-3">
                <span className="block text-lg text-black font-bold mb-2">Toggle dark Mode</span>
                <ToggleDarkMode />
              </div>

              <div className="mt-3">
                <span className="block text-lg text-black font-bold mb-2">Service id</span>
                <span className="mb-3 block">Provide storage service id</span>
                <Input
                  onChange={(e) => {
                    const value = e.target?.value;
                    const parsedValue = stringToNumber(value, Number);
                    onServiceIdChange(parsedValue);
                  }}
                  value={valueToNumeralSystem(debuggerState.serviceId ?? 0, numeralSystem)}
                />
              </div>

              <div className="py-4">
                <span className="block text-lg text-black font-bold mb-2">Number of batched steps</span>
                <span className="mb-3 block">
                  To speed up execution PVMs can run multiple steps internally after clicking "Run". This may lead to
                  inaccurate stops in case the execution diverges between them.
                </span>
                <Input
                  type="number"
                  step={1}
                  min={1}
                  max={1000}
                  placeholder="Batched steps"
                  onChange={(ev) => {
                    dispatch(setStepsToPerform(parseInt(ev.target.value)));
                  }}
                  value={debuggerState.stepsToPerform}
                />
                <div className="py-4">
                  <span className="block text-lg text-black font-bold mb-2">Storage Value</span>

                  <span className="mb-3 block">
                    Set storage for read & write host calls. Confirm empty, if you want to process. Storage can be
                    modified by running program.
                  </span>

                  <div className="flex">
                    <Button onClick={() => dispatch(setHasHostCallOpen(true))}>Set storage</Button>

                    {debuggerState.storage !== null && (
                      <span className="flex items-center ml-3">
                        <CheckCircle color="green" className="mr-2" /> Storage provided
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
            </div>
          </DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
};
