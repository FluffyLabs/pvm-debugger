import { DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CheckCircle, InfoIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setServiceId, setStepsToPerform } from "@/store/debugger/debuggerSlice";
import { Button } from "../ui/button";
import { NumeralSystemContext } from "@/context/NumeralSystemContext";
import { valueToNumeralSystem } from "../Instructions/utils";
import { useContext, useState } from "react";
import { setAllWorkersServiceId } from "@/store/workers/workersSlice";
import { isSerializedError } from "@/store/utils";
import { logger } from "@/utils/loggerService";
import { ToggleDarkMode } from "@/packages/ui-kit/DarkMode/ToggleDarkMode";
import { Separator } from "../ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip";

function stringToNumber<T>(value: string, cb: (x: string) => T): T {
  try {
    return cb(value);
  } catch (_e) {
    return cb("0");
  }
}

export const DebuggerSettingsContent = ({ openStorage }: { openStorage: () => void }) => {
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

  const commonClass = "w-[160px]";

  return (
    <>
      <DialogHeader className="py-3 px-6 bg-title text-title-foreground rounded-t-lg border-b">
        <DialogTitle className="text-base">Settings</DialogTitle>
      </DialogHeader>
      <DialogDescription asChild>
        <div className="text-left px-4 text-secondary-foreground h-full mb-6">
          <div className="p-4 mt-4 flex justify-between items-center">
            <span className="block text-xs font-bold">Mode</span>
            <ToggleDarkMode className={commonClass} />
          </div>

          <Separator />

          <div className="p-4 mt-2 flex justify-between items-center mb-4">
            <span className="block text-xs font-bold">
              Service id{" "}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <InfoIcon className="ml-2 text-brand-dark dark:text-brand" height="18px" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Provide storage service id </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </span>
            <Input
              className={commonClass}
              onChange={(e) => {
                const value = e.target?.value;
                const parsedValue = stringToNumber(value, Number);
                onServiceIdChange(parsedValue);
              }}
              value={valueToNumeralSystem(debuggerState.serviceId ?? 0, numeralSystem)}
            />
          </div>

          <div className="p-4 flex justify-between items-center mb-4">
            <span className="block text-xs font-bold">
              Number of batched steps{" "}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <InfoIcon className="ml-2 text-brand-dark dark:text-brand" height="18px" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>
                      To speed up execution PVMs can run multiple steps internally after clicking "Run". This may lead
                      to inaccurate stops in case the execution diverges between them.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </span>
            <Input
              className={commonClass}
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
          </div>
          <div className="p-4 flex justify-between items-center mb-2">
            <span className="block text-xs font-bold">
              Storage Value{" "}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <InfoIcon className="ml-2 text-brand-dark dark:text-brand" height="18px" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>
                      Set storage for read & write host calls. Confirm empty, if you want to process. Storage can be
                      modified by running program.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </span>

            <div className="flex">
              <Button variant="outlineBrand" onClick={() => openStorage()} className={commonClass}>
                Set storage
              </Button>

              {debuggerState.storage !== null && (
                <span className="flex items-center ml-3">
                  <CheckCircle color="green" className="mr-2" /> Storage provided
                </span>
              )}
            </div>
          </div>

          {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
        </div>
      </DialogDescription>
    </>
  );
};
