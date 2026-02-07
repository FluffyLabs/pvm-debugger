import { DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  setServiceId,
  setSpiArgs,
  setUiRefreshRate,
  UiRefreshMode,
  selectHostCallsTrace,
} from "@/store/debugger/debuggerSlice";
import { NumeralSystemContext } from "@/context/NumeralSystemContext";
import { valueToNumeralSystem } from "../Instructions/utils";
import { useContext, useState } from "react";
import { isSerializedError } from "@/store/utils";
import { logger } from "@/utils/loggerService";
import { ToggleDarkMode } from "@/packages/ui-kit/DarkMode/ToggleDarkMode";
import { Separator } from "../ui/separator";
import { WithHelp } from "../WithHelp/WithHelp";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { bytes } from "@typeberry/lib";
import { Button } from "@/components/ui/button";
import { SpiConfigDialog } from "./SpiConfigDialog";
import { TraceConfigDialog } from "./TraceConfigDialog";
import { CheckCircle2, FileText } from "lucide-react";

function stringToNumber<T>(value: string, cb: (x: string) => T): T {
  try {
    return cb(value);
  } catch {
    return cb("0");
  }
}

export const DebuggerSettingsContent = () => {
  const debuggerState = useAppSelector((state) => state.debugger);
  const hostCallsTrace = useAppSelector(selectHostCallsTrace);
  const dispatch = useAppDispatch();
  const spiArgs = bytes.BytesBlob.blobFrom(debuggerState.spiArgs?.slice(0) ?? new Uint8Array());
  const { numeralSystem } = useContext(NumeralSystemContext);
  const [error, setError] = useState<string>();
  const [textSpi, setTextSpi] = useState(spiArgs.toString());
  const isSpiError = textSpi !== spiArgs.toString();
  const [isSpiConfigDialogOpen, setIsSpiConfigDialogOpen] = useState(false);
  const [isTraceConfigDialogOpen, setIsTraceConfigDialogOpen] = useState(false);

  const hasTrace = hostCallsTrace !== null;
  const traceHostCallCount = hostCallsTrace?.parsed?.hostCalls.length ?? 0;
  const handleTextSpi = (newVal: string) => {
    setTextSpi(newVal);
    try {
      const parsed = bytes.BytesBlob.parseBlob(newVal);
      dispatch(setSpiArgs(parsed.raw));
    } catch {
      // Ignore parse errors - user may be typing
    }
  };

  const onServiceIdChange = async (newServiceId: number) => {
    setError("");
    try {
      dispatch(setServiceId(newServiceId));
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
              data-testid="service-id-input"
              onChange={(e) => {
                const value = e.target?.value;
                const parsedValue = stringToNumber(value, Number);
                onServiceIdChange(parsedValue);
              }}
              value={valueToNumeralSystem(debuggerState.serviceId ?? 0, numeralSystem)}
            />
          </div>

          <div className="p-4 flex justify-between items-start mb-4">
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
                  <SelectItem value="instructions">{debuggerState.uiRefreshRate.instructionCount} steps</SelectItem>
                  <SelectItem value="block">Each block</SelectItem>
                </SelectContent>
              </Select>
              <Input
                className={commonClass}
                disabled={debuggerState.uiRefreshRate.mode !== "instructions"}
                type="number"
                step={1}
                min={1}
                max={10000}
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
            </div>
          </div>
          <div className="p-4 mt-2 flex justify-between items-center mb-4">
            <span className="block text-xs font-bold">
              <WithHelp help="Hex-encoded JAM SPI arguments written to the heap">JAM SPI arguments</WithHelp>
            </span>
            <div className="flex flex-col gap-2 flex-end">
              <Input
                className={cn(commonClass, { "border-red": isSpiError })}
                data-testid="spi-args-input-settings"
                placeholder="0x-prefixed, encoded operands"
                onChange={(e) => {
                  const value = e.target?.value;
                  handleTextSpi(value);
                }}
                value={textSpi}
              />
              <Button
                variant="outline"
                size="sm"
                data-testid="configure-spi-button"
                onClick={() => setIsSpiConfigDialogOpen(true)}
              >
                Configure
              </Button>
            </div>
          </div>
          <div className="p-4 flex justify-between items-center mb-2">
            <span className="block text-xs font-bold">
              <WithHelp
                help={`Configure Ecalli trace for auto-filling host call responses.
                  When a trace is loaded, host calls can be auto-continued with pre-recorded data.`}
              >
                Host Calls Trace
              </WithHelp>
            </span>
            <div className="flex flex-col items-center gap-2">
              {hasTrace && (
                <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                  <CheckCircle2 className="w-3 h-3" />
                  {traceHostCallCount} host call{traceHostCallCount !== 1 ? "s" : ""}
                </span>
              )}
              <Button
                variant="outline"
                size="sm"
                data-testid="configure-trace-button"
                onClick={() => setIsTraceConfigDialogOpen(true)}
              >
                <FileText className="w-4 h-4 mr-1" />
                Configure
              </Button>
            </div>
          </div>

          {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
        </div>
      </DialogDescription>

      <SpiConfigDialog
        open={isSpiConfigDialogOpen}
        onOpenChange={setIsSpiConfigDialogOpen}
        onApply={async (encodedArgs, _pc, serviceId) => {
          dispatch(setSpiArgs(encodedArgs));
          setTextSpi(bytes.BytesBlob.blobFrom(encodedArgs).toString());

          // Update service ID if it changed
          try {
            dispatch(setServiceId(serviceId));
          } catch (e) {
            if (e instanceof Error || isSerializedError(e)) {
              setError(e.message);
              logger.error(e.toString(), { error: e, hideToast: true });
            }
          }
        }}
      />

      <TraceConfigDialog open={isTraceConfigDialogOpen} onOpenChange={setIsTraceConfigDialogOpen} />
    </>
  );
};
