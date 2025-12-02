import { useState, useEffect, useMemo, useRef } from "react";
import { HostCallHandler, HostCallHandlerProps } from "./types";
import { jam_host_calls, block, utils } from "@typeberry/lib";
import { HostCallContext, hexToAscii, bytesToHex } from "./hostCallUtils";
import { storageManager } from "./storageManager";
import { HostCallActionButtons } from "./HostCallActionButtons";
import { DEFAULT_REGS } from "@/types/pvm";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

const { Write, HostCallResult } = jam_host_calls.general;
const { Result } = utils;
type AccountsWrite = jam_host_calls.general.AccountsWrite;

// Error options for write host call
const ERROR_OPTIONS = [
  { value: "success", label: "Success - Write succeeds", result: null },
  { value: "FULL", label: "FULL - Storage full / insufficient balance", result: HostCallResult.FULL },
] as const;

// Map HostCallResult values to their names
const HOST_CALL_RESULT_NAMES: Record<string, string> = {
  [HostCallResult.NONE.toString()]: "NONE",
  [HostCallResult.WHAT.toString()]: "WHAT",
  [HostCallResult.OOB.toString()]: "OOB",
  [HostCallResult.WHO.toString()]: "WHO",
  [HostCallResult.FULL.toString()]: "FULL",
  [HostCallResult.CORE.toString()]: "CORE",
  [HostCallResult.CASH.toString()]: "CASH",
  [HostCallResult.LOW.toString()]: "LOW",
  [HostCallResult.HUH.toString()]: "HUH",
};

function formatHostCallResult(value: bigint): string {
  const name = HOST_CALL_RESULT_NAMES[value.toString()];
  const hex = "0x" + value.toString(16);
  return name ? `${name} (${hex})` : hex;
}

function formatExpectedResult(selectedError: string, previousLength: number | null): string {
  if (selectedError === "success") {
    return previousLength !== null
      ? `${previousLength} (0x${previousLength.toString(16)})`
      : "NONE (0xffffffffffffffff)";
  }
  const option = ERROR_OPTIONS.find((opt) => opt.value === selectedError);
  return option ? formatHostCallResult(option.result!) : "unknown";
}

interface WriteResult {
  serviceId: string;
  key: string;
  keyLength: number;
  value: string | null;
  valueLength: number;
  isDelete: boolean;
  previousLength: number | null;
  modifiedRegs: bigint[];
  finalGas: bigint;
  memoryEdits: Array<{ address: number; data: Uint8Array }>;
}

// eslint-disable-next-line react-refresh/only-export-components
const WriteHostCallComponent: React.FC<HostCallHandlerProps> = ({ currentState, isLoading, readMemory, onResume }) => {
  const regs = useMemo(() => currentState.regs ?? DEFAULT_REGS, [currentState.regs]);

  const serviceId = regs[7];
  const [displayData, setDisplayData] = useState<Omit<WriteResult, "modifiedRegs" | "finalGas" | "memoryEdits"> | null>(
    null,
  );
  const [selectedError, setSelectedError] = useState<string>("success");
  const [error, setError] = useState<string | null>(null);
  const [isExecuting, setIsExecuting] = useState(true);
  const hasExecuted = useRef(false);

  // Execute on mount to get the result, but don't auto-resume
  useEffect(() => {
    if (hasExecuted.current) return;
    hasExecuted.current = true;

    const execute = async () => {
      setIsExecuting(true);
      try {
        let capturedPreviousLength: number | null = null;

        const accounts: AccountsWrite = {
          write: (rawKey, data) => {
            const previousLength = storageManager.write(rawKey, data ? data.raw : null);
            capturedPreviousLength = previousLength;
            return Result.ok(previousLength);
          },
        };

        const ctx = new HostCallContext(regs, currentState.gas);

        // Preload key memory from actual PVM
        const keyPointer = Number(regs[7] ?? 0n);
        const keyLength = Number(regs[8] ?? 0n);
        let keyHex = "";
        if (keyLength > 0) {
          const keyData = await readMemory(keyPointer, keyLength);
          ctx.preloadMemory(keyPointer, keyData);
          keyHex = bytesToHex(keyData);
        }

        // Preload value memory from actual PVM
        const valuePointer = regs[9] ?? 0n;
        const valueLength = Number(regs[10] ?? 0n);
        // Check if value pointer is not "infinity" (max u64 indicates deletion)
        const MAX_U64 = 0xffffffffffffffffn;
        const isDelete = valuePointer >= MAX_U64;
        let valueHex: string | null = null;
        if (!isDelete && valueLength > 0) {
          const valueData = await readMemory(Number(valuePointer), valueLength);
          ctx.preloadMemory(Number(valuePointer), valueData);
          valueHex = bytesToHex(valueData);
        }

        const currentServiceId = block.tryAsServiceId(Number(serviceId));
        const write = new Write(currentServiceId, accounts);
        await write.execute(ctx.mockGas, ctx.hostCallRegisters, ctx.hostCallMemory);

        // Store data for display
        setDisplayData({
          serviceId: serviceId?.toString() ?? "0",
          key: keyHex,
          keyLength,
          value: valueHex,
          valueLength,
          isDelete,
          previousLength: capturedPreviousLength,
        });
        setIsExecuting(false);
      } catch (e) {
        console.error(e);
        const msg = e !== null && typeof e === "object" && "message" in e ? e.message : "";
        setError(e instanceof Error ? e.message : `Failed to execute write: ${msg}`);
        setIsExecuting(false);
      }
    };

    execute();
  }, [regs, currentState.gas, serviceId, readMemory]);

  const handleResume = async (mode: "step" | "block" | "run") => {
    if (!displayData) return;

    setError(null);
    setIsExecuting(true);

    try {
      const selectedOption = ERROR_OPTIONS.find((opt) => opt.value === selectedError);
      const shouldFail = selectedOption?.result !== null;

      const accounts: AccountsWrite = {
        write: (rawKey, data) => {
          if (shouldFail) {
            return Result.error("full" as const, () => "Storage full");
          }
          const previousLength = storageManager.write(rawKey, data ? data.raw : null);
          return Result.ok(previousLength);
        },
      };

      const ctx = new HostCallContext(regs, currentState.gas);

      // Preload key memory from actual PVM
      const keyPointer = Number(regs[7] ?? 0n);
      const keyLength = Number(regs[8] ?? 0n);
      if (keyLength > 0) {
        const keyData = await readMemory(keyPointer, keyLength);
        ctx.preloadMemory(keyPointer, keyData);
      }

      // Preload value memory from actual PVM
      const valuePointer = regs[9] ?? 0n;
      const valueLength = Number(regs[10] ?? 0n);
      const MAX_U64 = 0xffffffffffffffffn;
      const isDelete = valuePointer >= MAX_U64;
      if (!isDelete && valueLength > 0) {
        const valueData = await readMemory(Number(valuePointer), valueLength);
        ctx.preloadMemory(Number(valuePointer), valueData);
      }

      const currentServiceId = block.tryAsServiceId(Number(serviceId));
      const write = new Write(currentServiceId, accounts);
      await write.execute(ctx.mockGas, ctx.hostCallRegisters, ctx.hostCallMemory);

      const { modifiedRegs, finalGas, memoryEdits } = ctx.getResult();

      onResume(mode, modifiedRegs, finalGas, memoryEdits);
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : "Failed to execute write");
      setIsExecuting(false);
    }
  };

  if (isExecuting) {
    return <div className="p-4 text-sm text-muted-foreground">Executing write host call...</div>;
  }

  if (error) {
    return (
      <div className="p-4">
        <div className="p-3 bg-destructive/10 text-destructive rounded-md text-sm">{error}</div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4 overflow-y-auto flex-1 p-2">
        <div className="text-sm font-medium border-b pb-2">Write Host Call</div>

        {displayData && (
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Service ID</label>
              <div className="p-2 bg-muted rounded-md font-mono text-sm">{displayData.serviceId}</div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Key ({displayData.keyLength} bytes)</label>
              <div className="p-2 bg-muted rounded-md font-mono text-sm break-all">{displayData.key || "(empty)"}</div>
              {displayData.keyLength > 0 && displayData.keyLength <= 64 && (
                <div className="p-2 bg-muted/50 rounded-md font-mono text-sm break-all text-muted-foreground">
                  ASCII: {hexToAscii(displayData.key)}
                </div>
              )}
            </div>

            {displayData.isDelete ? (
              <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 rounded-md text-sm">
                Delete operation (value pointer = max u64)
              </div>
            ) : (
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">
                  Value ({displayData.valueLength} bytes)
                </label>
                <div className="p-2 bg-muted rounded-md font-mono text-sm break-all max-h-32 overflow-y-auto">
                  {displayData.value || "(empty)"}
                </div>
                {displayData.value && displayData.valueLength <= 64 && (
                  <div className="p-2 bg-muted/50 rounded-md font-mono text-sm break-all text-muted-foreground">
                    ASCII: {hexToAscii(displayData.value)}
                  </div>
                )}
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Previous Value Length</label>
              <div className="p-2 bg-muted rounded-md font-mono text-sm">
                {displayData.previousLength !== null ? `${displayData.previousLength} bytes` : "Key did not exist"}
              </div>
            </div>

            {/* Write result selection */}
            <div className="space-y-2 pt-2 border-t">
              <Label className="text-sm font-medium">Write Result</Label>
              <RadioGroup value={selectedError} onValueChange={setSelectedError}>
                {ERROR_OPTIONS.map((option) => (
                  <div key={option.value} className="flex items-center space-x-2">
                    <RadioGroupItem value={option.value} id={option.value} />
                    <Label htmlFor={option.value} className="font-normal cursor-pointer">
                      {option.label}
                    </Label>
                  </div>
                ))}
              </RadioGroup>

              {/* Show expected result */}
              <div className="space-y-1 pt-2">
                <label className="text-xs font-medium text-muted-foreground">Expected Result (ω₇)</label>
                <div className="p-2 bg-muted rounded-md font-mono text-sm">
                  {formatExpectedResult(selectedError, displayData.previousLength)}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      <HostCallActionButtons onResume={handleResume} disabled={isLoading || isExecuting} />
    </>
  );
};

export const WriteHostCall: HostCallHandler = {
  index: 4, // write host call index
  name: "write",
  hasCustomUI: true,
  Component: WriteHostCallComponent,
};
