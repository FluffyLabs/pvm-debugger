import { useState, useEffect, useMemo, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { HostCallHandler, HostCallHandlerProps } from "./types";
import * as jam_host_calls from "@typeberry/lib/jam-host-calls";
import * as bytes from "@typeberry/lib/bytes";
import * as block from "@typeberry/lib/block";
import * as numbers from "@typeberry/lib/numbers";
import { HostCallContext, hexToAscii } from "./hostCallUtils";
import { storageManager } from "./storageManager";
import { HostCallActionButtons } from "./HostCallActionButtons";
import { DEFAULT_REGS } from "@/types/pvm";

const { Read } = jam_host_calls.general;
const { BytesBlob } = bytes;
type AccountsRead = jam_host_calls.general.AccountsRead;

// eslint-disable-next-line react-refresh/only-export-components
const ReadHostCallComponent: React.FC<HostCallHandlerProps> = ({
  currentState,
  isLoading,
  readMemory,
  onResume,
  onRestart,
  serviceId,
}) => {
  const regs = useMemo(() => currentState.regs ?? DEFAULT_REGS, [currentState.regs]);

  const requestedServiceId = jam_host_calls.getServiceId(numbers.tryAsU64(regs[7]));
  const resolvedServiceId = useMemo(() => block.tryAsServiceId(serviceId ?? 0), [serviceId]);

  // State for when we need user input
  const [requestedKeyHex, setRequestedKeyHex] = useState<string | null>(null);
  const [valueHex, setValueHex] = useState("");
  const [hasValue, setHasValue] = useState(false);
  const [needsUserInput, setNeedsUserInput] = useState(false);
  const [isExecuting, setIsExecuting] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasExecuted = useRef(false);

  // On mount, execute the host call to discover what key is being requested
  useEffect(() => {
    if (hasExecuted.current) return;
    hasExecuted.current = true;

    const execute = async () => {
      setIsExecuting(true);
      try {
        let capturedKeyHex: string | null = null;
        let hadCachedValue = false;

        const accounts: AccountsRead = {
          read: (_serviceId, rawKey) => {
            capturedKeyHex = rawKey.toString();
            const value = storageManager.read(rawKey);
            if (value) {
              hadCachedValue = true;
              return BytesBlob.blobFrom(value);
            }
            return null;
          },
        };

        const ctx = new HostCallContext(regs, currentState.gas);

        // Preload key memory from actual PVM
        // Read host call: regs[8] = key pointer, regs[9] = key length
        const keyPointer = Number(regs[8] ?? 0n);
        const keyLength = Number(regs[9] ?? 0n);
        if (keyLength > 0) {
          const keyData = await readMemory(keyPointer, keyLength);
          ctx.preloadMemory(keyPointer, keyData);
        }

        const read = new Read(resolvedServiceId, accounts);
        await read.execute(ctx.mockGas, ctx.hostCallRegisters, ctx.hostCallMemory);

        setRequestedKeyHex(capturedKeyHex);

        if (hadCachedValue) {
          // We had the value cached, execution completed successfully - auto-resume
          const { modifiedRegs, finalGas, memoryEdits } = ctx.getResult();
          onResume("step", modifiedRegs, finalGas, memoryEdits);
        } else {
          // We need user to provide the value
          setNeedsUserInput(true);
          setIsExecuting(false);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to execute read");
        setIsExecuting(false);
      }
    };

    execute();
  }, [regs, currentState.gas, serviceId, readMemory, onResume, resolvedServiceId]);

  const handleResume = async (mode: "step" | "block" | "run") => {
    if (!requestedKeyHex) return;

    setError(null);
    setIsExecuting(true);

    try {
      // Store the user-provided value (or null if hasValue is false)
      const keyBlob = BytesBlob.parseBlob(requestedKeyHex);
      if (hasValue && valueHex.trim()) {
        const valueBytes = BytesBlob.parseBlob(valueHex).raw;
        storageManager.write(keyBlob, valueBytes);
      } else {
        // Explicitly store null to indicate "not found"
        storageManager.write(keyBlob, null);
      }

      // Re-execute with the new value in storage
      const accounts: AccountsRead = {
        read: (_serviceId, rawKey) => {
          const value = storageManager.read(rawKey);
          return value ? BytesBlob.blobFrom(value) : null;
        },
      };

      const ctx = new HostCallContext(regs, currentState.gas);

      // Preload key memory from actual PVM
      const keyPointer = Number(regs[8] ?? 0n);
      const keyLength = Number(regs[9] ?? 0n);
      if (keyLength > 0) {
        const keyData = await readMemory(keyPointer, keyLength);
        ctx.preloadMemory(keyPointer, keyData);
      }

      const read = new Read(resolvedServiceId, accounts);
      await read.execute(ctx.mockGas, ctx.hostCallRegisters, ctx.hostCallMemory);

      const { modifiedRegs, finalGas, memoryEdits } = ctx.getResult();

      onResume(mode, modifiedRegs, finalGas, memoryEdits);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to execute read");
      setIsExecuting(false);
    }
  };

  // Show loading while executing
  if (isExecuting && !needsUserInput) {
    return <div className="p-4 text-sm text-muted-foreground">Executing read host call...</div>;
  }

  // Show error if any
  if (error && !needsUserInput) {
    return (
      <div className="p-4">
        <div className="p-3 bg-destructive/10 text-destructive rounded-md text-sm">{error}</div>
      </div>
    );
  }

  // Show form for user to provide value
  return (
    <>
      <div className="space-y-4 overflow-y-auto flex-1 p-2">
        {/* Service ID */}
        <div className="space-y-1">
          <label className="text-sm font-medium">Service ID</label>
          <div className="p-2 bg-muted rounded-md font-mono text-sm">
            {requestedServiceId === null ? "current" : requestedServiceId.toString()}
          </div>
        </div>

        {/* Key being requested */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Requested Key (hex-encoded)</label>
          <div className="p-2 bg-muted rounded-md font-mono text-sm break-all">{requestedKeyHex || "(unknown)"}</div>
          {requestedKeyHex && (
            <>
              <div className="p-2 bg-muted/50 rounded-md font-mono text-sm break-all text-muted-foreground">
                ASCII: {hexToAscii(requestedKeyHex)}
              </div>
              <div className="text-xs text-muted-foreground">
                Length: {requestedKeyHex.replace(/^0x/i, "").length / 2} bytes
              </div>
            </>
          )}
        </div>

        {/* Value exists toggle */}
        <div className="flex items-center gap-3">
          <Switch checked={hasValue} onCheckedChange={setHasValue} disabled={isLoading || isExecuting} />
          <label className="text-sm font-medium">{hasValue ? "Key has a value" : "Key not found (None)"}</label>
        </div>

        {/* Value input */}
        {hasValue && (
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Value (hex-encoded) <span className="text-yellow-600">- please provide</span>
            </label>
            <Input
              className="font-mono"
              placeholder="0x..."
              value={valueHex}
              onChange={(e) => setValueHex(e.target.value)}
              disabled={isLoading || isExecuting}
            />
            {valueHex && (
              <div className="text-xs text-muted-foreground">
                Length: {valueHex.replace(/^0x/i, "").length / 2} bytes
              </div>
            )}
          </div>
        )}

        {/* Error */}
        {error && <div className="p-3 bg-destructive/10 text-destructive rounded-md text-sm">{error}</div>}
      </div>
      <HostCallActionButtons onResume={handleResume} onRestart={onRestart} disabled={isLoading || isExecuting} />
    </>
  );
};

export const ReadHostCall: HostCallHandler = {
  index: 3, // read host call index
  name: "read",
  hasCustomUI: true,
  Component: ReadHostCallComponent,
};
