import { useState, useEffect, useMemo, useRef } from "react";
import { HostCallHandler, HostCallHandlerProps } from "./types";
import { jam_host_calls, pvm_host_calls, block, utils, hash } from "@typeberry/lib";
import { MockMemory, MockGasCounter, regsToBytes, bytesToRegs, OK } from "./hostCallUtils";
import { HostCallActionButtons } from "./HostCallActionButtons";
import { DEFAULT_GAS, DEFAULT_REGS } from "@/types/pvm";

const { Yield } = jam_host_calls.accumulate;
const { HostCallRegisters, HostCallMemory } = pvm_host_calls;
const { Result } = utils;
type PartialState = jam_host_calls.PartialState;
type OpaqueHash = hash.OpaqueHash;

interface YieldData {
  hash: string;
}

// eslint-disable-next-line react-refresh/only-export-components
const YieldHostCallComponent: React.FC<HostCallHandlerProps> = ({ currentState, isLoading, readMemory, onResume }) => {
  const regs = useMemo(() => currentState.regs ?? DEFAULT_REGS, [currentState.regs]);

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
          newService: () => Result.ok(block.tryAsServiceId(0)),
          upgradeService: () => {},
          updateValidatorsData: () => Result.ok(OK),
          checkpoint: () => {},
          updateAuthorizationQueue: () => Result.ok(OK),
          updatePrivilegedServices: () => Result.ok(OK),
          providePreimage: () => Result.ok(OK),
        };

        const mockMemory = new MockMemory();

        // Preload hash memory from actual PVM
        // Yield: regs[7] = hash pointer (32 bytes)
        const hashPointer = Number(regs[7] ?? 0n);
        const HASH_SIZE = 32;
        if (hashPointer > 0) {
          const hashData = await readMemory(hashPointer, HASH_SIZE);
          mockMemory.preload(hashPointer, hashData);
        }

        const regBytes = regsToBytes(regs);
        const mockGas = new MockGasCounter(currentState.gas ?? DEFAULT_GAS);

        const hostCallMemory = new HostCallMemory(mockMemory);
        const hostCallRegisters = new HostCallRegisters(regBytes);

        const currentServiceId = block.tryAsServiceId(0);
        const yieldCall = new Yield(currentServiceId, partialState);
        await yieldCall.execute(mockGas, hostCallRegisters, hostCallMemory);

        setYieldData(capturedData);
        setIsExecuting(false);
      } catch (e) {
        console.error(e);
        setError(e instanceof Error ? e.message : "Failed to execute yield");
        setIsExecuting(false);
      }
    };

    execute();
  }, [regs, currentState.gas, readMemory]);

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
        newService: () => Result.ok(block.tryAsServiceId(0)),
        upgradeService: () => {},
        updateValidatorsData: () => Result.ok(OK),
        checkpoint: () => {},
        updateAuthorizationQueue: () => Result.ok(OK),
        updatePrivilegedServices: () => Result.ok(OK),
        providePreimage: () => Result.ok(OK),
      };

      const mockMemory = new MockMemory();

      const hashPointer = Number(regs[7] ?? 0n);
      const HASH_SIZE = 32;
      if (hashPointer > 0) {
        const hashData = await readMemory(hashPointer, HASH_SIZE);
        mockMemory.preload(hashPointer, hashData);
      }

      const regBytes = regsToBytes(regs);
      const mockGas = new MockGasCounter(currentState.gas ?? DEFAULT_GAS);

      const hostCallMemory = new HostCallMemory(mockMemory);
      const hostCallRegisters = new HostCallRegisters(regBytes);

      const currentServiceId = block.tryAsServiceId(0);
      const yieldCall = new Yield(currentServiceId, partialState);
      await yieldCall.execute(mockGas, hostCallRegisters, hostCallMemory);

      const modifiedRegs = bytesToRegs(hostCallRegisters.getEncoded());
      const finalGas = BigInt(mockGas.get());
      const memoryEdits = mockMemory.writes;

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
      <HostCallActionButtons onResume={handleResume} disabled={isLoading || isExecuting} />
    </>
  );
};

export const YieldHostCall: HostCallHandler = {
  index: 25, // yield host call index
  name: "yield",
  hasCustomUI: true,
  Component: YieldHostCallComponent,
};
