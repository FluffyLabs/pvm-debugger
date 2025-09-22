import { DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setServiceId, setSpiArgs, setUiRefreshRate, UiRefreshMode } from "@/store/debugger/debuggerSlice";
import { NumeralSystemContext } from "@/context/NumeralSystemContext";
import { valueToNumeralSystem } from "../Instructions/utils";
import { useContext, useState } from "react";
import { setAllWorkersServiceId } from "@/store/workers/workersSlice";
import { isSerializedError } from "@/store/utils";
import { logger } from "@/utils/loggerService";
import { ToggleDarkMode } from "@/packages/ui-kit/DarkMode/ToggleDarkMode";
import { Separator } from "../ui/separator";
import { WithHelp } from "../WithHelp/WithHelp";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

function stringToNumber<T>(value: string, cb: (x: string) => T): T {
  try {
    return cb(value);
  } catch {
    return cb("0");
  }
}

export const DebuggerSettingsContent = () => {
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
              <WithHelp help="JAM Service Id of executing code">Service ID</WithHelp>
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
              <WithHelp help="How frequently the UI should be refreshed.">UI refresh rate</WithHelp>
            </span>
            <div className="flex flex-col gap-2">
              <Select
                value={debuggerState.uiRefreshRate.mode}
                onValueChange={(mode: UiRefreshMode) => {
                  dispatch(
                    setUiRefreshRate({
                      ...debuggerState.uiRefreshRate,
                      mode,
                    }),
                  );
                }}
              >
                <SelectTrigger className={commonClass}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="instructions">After N instructions</SelectItem>
                  <SelectItem value="block">After block</SelectItem>
                </SelectContent>
              </Select>
              {debuggerState.uiRefreshRate.mode === "instructions" && (
                <Input
                  className={commonClass}
                  type="number"
                  step={1}
                  min={1}
                  max={1000}
                  placeholder="Number of instructions"
                  onChange={(ev) => {
                    dispatch(
                      setUiRefreshRate({
                        ...debuggerState.uiRefreshRate,
                        instructionCount: parseInt(ev.target.value) || 1,
                      }),
                    );
                  }}
                  value={debuggerState.uiRefreshRate.instructionCount}
                />
              )}
            </div>
          </div>
          <div className="p-4 flex justify-between items-center mb-2">
            <span className="block text-xs font-bold">
              <WithHelp
                help={`Configure storage for read & write host calls.
                 Confirm empty, if you want to process.
                 Storage can be modified by the program execution.`}
              >
                Host Calls Trace
              </WithHelp>
            </span>
          </div>

          <div className="p-4 mt-2 flex justify-between items-center mb-4">
            <span className="block text-xs font-bold">
              <WithHelp help="Hex-encoded JAM SPI arguments written to the heap">JAM SPI arguments</WithHelp>
            </span>
            <Input
              className={commonClass}
              placeholder="0x-prefixed, encoded operands"
              onChange={(e) => {
                const value = e.target?.value;
                dispatch(setSpiArgs(value));
              }}
              value={debuggerState.spiArgs ?? ""}
            />
          </div>

          {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
        </div>
      </DialogDescription>
    </>
  );
};
