import { useState, useEffect, useMemo, useRef } from "react";
import { HostCallHandler, HostCallHandlerProps } from "./types";
import { jam_host_calls, block, utils, bytes } from "@typeberry/lib";
import { HostCallContext, hexToAscii, OK } from "./hostCallUtils";
import { HostCallActionButtons } from "./HostCallActionButtons";
import { DEFAULT_REGS } from "@/types/pvm";

const { Transfer } = jam_host_calls.accumulate;
const { Result } = utils;
type PartialState = jam_host_calls.PartialState;

interface TransferData {
  destination: string;
  amount: string;
  gas: string;
  memo: string;
}

// eslint-disable-next-line react-refresh/only-export-components
const TransferHostCallComponent: React.FC<HostCallHandlerProps> = ({
  currentState,
  isLoading,
  readMemory,
  onResume,
  onRestart,
  serviceId,
}) => {
  const regs = useMemo(() => currentState.regs ?? DEFAULT_REGS, [currentState.regs]);
  const resolvedServiceId = useMemo(() => block.tryAsServiceId(serviceId ?? 0), [serviceId]);

  const [transferData, setTransferData] = useState<TransferData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isExecuting, setIsExecuting] = useState(true);
  const hasExecuted = useRef(false);

  // Execute on mount to capture transfer data
  useEffect(() => {
    if (hasExecuted.current) return;
    hasExecuted.current = true;

    const execute = async () => {
      setIsExecuting(true);
      try {
        let capturedData: TransferData | null = null;

        const partialState: PartialState = {
          transfer: (destination, amount, gas, memo) => {
            capturedData = {
              destination: destination === null ? "current" : destination.toString(),
              amount: amount.toString(),
              gas: gas.toString(),
              memo: bytes.BytesBlob.blobFrom(memo.raw).toString(),
            };
            return Result.ok(OK);
          },
          // Stub other methods
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
          yield: () => {},
          providePreimage: () => Result.ok(OK),
        };

        const ctx = new HostCallContext(regs, currentState.gas);

        // Preload memo memory from actual PVM
        // Transfer: regs[7] = destination, regs[8] = amount, regs[9] = gas, regs[10] = memo pointer
        const memoPointer = Number(regs[10] ?? 0n);
        const MEMO_SIZE = 128; // TRANSFER_MEMO_BYTES
        if (memoPointer > 0) {
          const memoData = await readMemory(memoPointer, MEMO_SIZE);
          ctx.preloadMemory(memoPointer, memoData);
        }

        const transfer = new Transfer(resolvedServiceId, partialState);
        await transfer.execute(ctx.mockGas, ctx.hostCallRegisters, ctx.hostCallMemory);

        setTransferData(capturedData);
        setIsExecuting(false);
      } catch (e) {
        console.error(e);
        setError(e instanceof Error ? e.message : "Failed to execute transfer");
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
        yield: () => {},
        providePreimage: () => Result.ok(OK),
      };

      const ctx = new HostCallContext(regs, currentState.gas);

      const memoPointer = Number(regs[10] ?? 0n);
      const MEMO_SIZE = 128;
      if (memoPointer > 0) {
        const memoData = await readMemory(memoPointer, MEMO_SIZE);
        ctx.preloadMemory(memoPointer, memoData);
      }

      const transfer = new Transfer(resolvedServiceId, partialState);
      await transfer.execute(ctx.mockGas, ctx.hostCallRegisters, ctx.hostCallMemory);

      const { modifiedRegs, finalGas, memoryEdits } = ctx.getResult();

      onResume(mode, modifiedRegs, finalGas, memoryEdits);
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : "Failed to execute transfer");
      setIsExecuting(false);
    }
  };

  if (isExecuting && !transferData) {
    return <div className="p-4 text-sm text-muted-foreground">Executing transfer host call...</div>;
  }

  return (
    <>
      <div className="space-y-4 overflow-y-auto flex-1 p-2">
        <div className="text-sm font-medium border-b pb-2">Transfer Data</div>

        {transferData && (
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Destination Service</label>
              <div className="p-2 bg-muted rounded-md font-mono text-sm">{transferData.destination}</div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Amount</label>
              <div className="p-2 bg-muted rounded-md font-mono text-sm">{transferData.amount}</div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Gas</label>
              <div className="p-2 bg-muted rounded-md font-mono text-sm">{transferData.gas}</div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Memo (hex)</label>
              <div className="p-2 bg-muted rounded-md font-mono text-sm break-all">{transferData.memo}</div>
              <div className="p-2 bg-muted/50 rounded-md font-mono text-sm break-all text-muted-foreground">
                ASCII: {hexToAscii(transferData.memo)}
              </div>
            </div>
          </div>
        )}

        {error && <div className="p-3 bg-destructive/10 text-destructive rounded-md text-sm">{error}</div>}
      </div>
      <HostCallActionButtons onResume={handleResume} onRestart={onRestart} disabled={isLoading || isExecuting} />
    </>
  );
};

export const TransferHostCall: HostCallHandler = {
  index: 20, // transfer host call index
  name: "transfer",
  hasCustomUI: true,
  Component: TransferHostCallComponent,
};
