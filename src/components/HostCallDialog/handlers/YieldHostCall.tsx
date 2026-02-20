import { useState, useEffect, useMemo, useRef } from "react";
import { HostCallHandler, HostCallHandlerProps } from "./types";
import * as jam_host_calls from "@typeberry/lib/jam-host-calls";
import * as block from "@typeberry/lib/block";
import * as utils from "@typeberry/lib/utils";
import * as hash from "@typeberry/lib/hash";
import { HostCallContext, OK } from "./hostCallUtils";
import { HostCallActionButtons } from "./HostCallActionButtons";
import { DEFAULT_REGS } from "@/types/pvm";

const { Yield } = jam_host_calls.accumulate;
const { Result } = utils;
type PartialState = jam_host_calls.PartialState;
type OpaqueHash = hash.OpaqueHash;

interface YieldData {
  hash: string;
}

// eslint-disable-next-line react-refresh/only-export-components
const YieldHostCallComponent: React.FC<HostCallHandlerProps> = ({
  currentState,
  isLoading,
  readMemory,
  onResume,
  onRestart,
  serviceId,
}) => {
  const regs = useMemo(() => currentState.regs ?? DEFAULT_REGS, [currentState.regs]);
  const resolvedServiceId = useMemo(() => block.tryAsServiceId(serviceId ?? 0), [serviceId]);

  const [yieldData, setYieldData] = useState<YieldData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isExecuting, setIsExecuting] = useState(true);
  const hasExecuted = useRef(false);

  // Execute on mount to capture yield data
  useEffect(() => {
    if (hasExecuted.current) return;
    hasExecuted.current = true;

    const execute = async () => {
      setIsExecuting(true);
      try {
        let capturedData: YieldData | null = null;

        const partialState: PartialState = {
          yield: (yieldHash: OpaqueHash) => {
            capturedData = {
              hash: "0x" + Array.from(yieldHash.raw, (b: number) => b.toString(16).padStart(2, "0")).join(""),
            };
          },
          // Stub other methods
          transfer: () => Result.ok(OK),
          checkPreimageStatus: () => null,
          requestPreimage: () => Result.ok(OK),
          forgetPreimage: () => Result.ok(OK),
          eject: () => Result.ok(OK),
          newService: () => Result.ok(resolvedServiceId),
          upgradeService: () => {},
          updateValidatorsData: () => Result.ok(OK),
          checkpoint: () => {},
          updateAuthorizationQueue: () => Result.ok(OK),
          updatePrivilegedServices: () => Result.ok(OK),
          providePreimage: () => Result.ok(OK),
        };

        const ctx = new HostCallContext(regs, currentState.gas);

        // Preload hash memory from actual PVM
        // Yield: regs[7] = hash pointer (32 bytes)
        const hashPointer = Number(regs[7] ?? 0n);
        const HASH_SIZE = 32;
        if (hashPointer > 0) {
          const hashData = await readMemory(hashPointer, HASH_SIZE);
          ctx.preloadMemory(hashPointer, hashData);
        }

        const yieldCall = new Yield(resolvedServiceId, partialState);
        await yieldCall.execute(ctx.mockGas, ctx.hostCallRegisters, ctx.hostCallMemory);

        setYieldData(capturedData);
        setIsExecuting(false);
      } catch (e) {
        console.error(e);
        setError(e instanceof Error ? e.message : "Failed to execute yield");
        setIsExecuting(false);
      }
    };

    execute();
  }, [regs, currentState.gas, readMemory, resolvedServiceId]);

  const handleResume = async (mode: "step" | "block" | "run") => {
    setError(null);
    setIsExecuting(true);

    try {
      const partialState: PartialState = {
        yield: () => {},
        transfer: () => Result.ok(OK),
        checkPreimageStatus: () => null,
        requestPreimage: () => Result.ok(OK),
        forgetPreimage: () => Result.ok(OK),
        eject: () => Result.ok(OK),
        newService: () => Result.ok(resolvedServiceId),
        upgradeService: () => {},
        updateValidatorsData: () => Result.ok(OK),
        checkpoint: () => {},
        updateAuthorizationQueue: () => Result.ok(OK),
        updatePrivilegedServices: () => Result.ok(OK),
        providePreimage: () => Result.ok(OK),
      };

      const ctx = new HostCallContext(regs, currentState.gas);

      const hashPointer = Number(regs[7] ?? 0n);
      const HASH_SIZE = 32;
      if (hashPointer > 0) {
        const hashData = await readMemory(hashPointer, HASH_SIZE);
        ctx.preloadMemory(hashPointer, hashData);
      }

      const yieldCall = new Yield(resolvedServiceId, partialState);
      await yieldCall.execute(ctx.mockGas, ctx.hostCallRegisters, ctx.hostCallMemory);

      const { modifiedRegs, finalGas, memoryEdits } = ctx.getResult();

      onResume(mode, modifiedRegs, finalGas, memoryEdits);
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : "Failed to execute yield");
      setIsExecuting(false);
    }
  };

  if (isExecuting && !yieldData) {
    return <div className="p-4 text-sm text-muted-foreground">Executing yield host call...</div>;
  }

  return (
    <>
      <div className="space-y-4 overflow-y-auto flex-1 p-2">
        <div className="text-sm font-medium border-b pb-2">Yield Data</div>

        {yieldData && (
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Hash (32 bytes)</label>
              <div className="p-2 bg-muted rounded-md font-mono text-sm break-all">{yieldData.hash}</div>
            </div>
          </div>
        )}

        {error && <div className="p-3 bg-destructive/10 text-destructive rounded-md text-sm">{error}</div>}
      </div>
      <HostCallActionButtons onResume={handleResume} onRestart={onRestart} disabled={isLoading || isExecuting} />
    </>
  );
};

export const YieldHostCall: HostCallHandler = {
  index: 25, // yield host call index
  name: "yield",
  hasCustomUI: true,
  Component: YieldHostCallComponent,
};
