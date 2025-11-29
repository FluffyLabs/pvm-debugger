import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Play, StepForward, SkipForward } from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setHasHostCallOpen, setPendingHostCallIndex } from "@/store/debugger/debuggerSlice";
import { resumeAfterHostCall, readMemoryRange, HostCallResumeMode } from "@/store/workers/workersSlice";
import { NumeralSystemContext } from "@/context/NumeralSystemContext";
import { getHostCallHandler } from "./handlers";
import { DefaultHostCallContent, MemoryEdit } from "./DefaultHostCallContent";

const HOST_CALL_NAMES: Record<number, string> = {
  0: "gas",
  1: "fetch",
  2: "lookup",
  3: "read",
  4: "write",
  5: "info",
  6: "historical_lookup",
  7: "export",
  8: "machine",
  9: "peek",
  10: "poke",
  11: "pages",
  12: "invoke",
  13: "expunge",
  14: "bless",
  15: "assign",
  16: "designate",
  17: "checkpoint",
  18: "new",
  19: "upgrade",
  20: "transfer",
  21: "eject",
  22: "query",
  23: "solicit",
  24: "forget",
  25: "yield",
  26: "provide",
  100: "log",
};

function getHostCallName(index: number | null): string {
  if (index === null) return "Unknown";
  return HOST_CALL_NAMES[index] ?? `unknown(${index})`;
}

export const HostCallDialog = () => {
  const dispatch = useAppDispatch();
  const { numeralSystem } = useContext(NumeralSystemContext);

  const hasHostCallOpen = useAppSelector((state) => state.debugger.hasHostCallOpen);
  const pendingHostCallIndex = useAppSelector((state) => state.debugger.pendingHostCallIndex);
  const workers = useAppSelector((state) => state.workers);

  const firstWorker = workers[0];
  const currentState = useMemo(() => firstWorker?.currentState ?? {}, [firstWorker?.currentState]);

  const [isLoading, setIsLoading] = useState(false);

  // State for default UI - lifted up so footer can access it
  const [pendingRegs, setPendingRegs] = useState<bigint[] | null>(null);
  const [pendingGas, setPendingGas] = useState<bigint | null>(null);
  const [pendingMemory, setPendingMemory] = useState<MemoryEdit | null>(null);

  // Reset state when dialog opens
  useEffect(() => {
    if (hasHostCallOpen) {
      setIsLoading(false);
      setPendingRegs(null);
      setPendingGas(null);
      setPendingMemory(null);
    }
  }, [hasHostCallOpen]);

  const handleClose = useCallback(() => {
    dispatch(setHasHostCallOpen(false));
    dispatch(setPendingHostCallIndex(null));
  }, [dispatch]);

  const handleResume = useCallback(
    async (mode: HostCallResumeMode, regs?: bigint[], gas?: bigint, memory?: MemoryEdit) => {
      setIsLoading(true);
      try {
        // Use provided values or fall back to pending/current state
        const finalRegs = regs ??
          pendingRegs ??
          currentState.regs ?? [0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n];
        const currentGas = currentState.gas ?? 10000n;
        const finalGas = gas ?? pendingGas ?? (currentGas > 10n ? currentGas - 10n : 0n);
        const finalMemory = memory ?? pendingMemory ?? undefined;

        await dispatch(
          resumeAfterHostCall({
            regs: finalRegs as bigint[],
            gas: finalGas,
            mode,
            memory: finalMemory,
          }),
        ).unwrap();
      } catch (e) {
        console.error("Failed to resume after host call:", e);
        setIsLoading(false);
      }
    },
    [dispatch, currentState, pendingRegs, pendingGas, pendingMemory],
  );

  const readMemory = useCallback(
    async (startAddress: number, length: number): Promise<Uint8Array> => {
      const result = await dispatch(readMemoryRange({ startAddress, length })).unwrap();
      return result;
    },
    [dispatch],
  );

  // Check for special handler
  const specialHandler = pendingHostCallIndex !== null ? getHostCallHandler(pendingHostCallIndex) : undefined;

  const hostCallName = getHostCallName(pendingHostCallIndex);

  return (
    <Dialog open={hasHostCallOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-[75vw] max-h-[90vh] flex flex-col" hideClose={isLoading}>
        <DialogHeader>
          <DialogTitle>Host Call</DialogTitle>
          <DialogDescription>
            {specialHandler?.hasCustomUI
              ? `PVM execution reached a ${hostCallName} host call.`
              : "PVM execution reached a host call. Edit registers and gas, then continue execution."}
          </DialogDescription>
        </DialogHeader>

        {/* Host Call Index */}
        <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
          <span className="font-medium">Host Call:</span>
          <code className="px-2 py-1 bg-background rounded text-sm font-mono">{hostCallName}</code>
          <span className="text-muted-foreground text-sm">(index: {pendingHostCallIndex ?? "?"})</span>
        </div>

        {/* Scrollable content area */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {specialHandler?.hasCustomUI ? (
            <specialHandler.Component
              currentState={currentState}
              isLoading={isLoading}
              readMemory={readMemory}
              onResume={handleResume}
              onClose={handleClose}
            />
          ) : (
            <DefaultHostCallContent
              currentState={currentState}
              isLoading={isLoading}
              numeralSystem={numeralSystem}
              readMemory={readMemory}
              onRegsChange={setPendingRegs}
              onGasChange={setPendingGas}
              onMemoryChange={setPendingMemory}
            />
          )}
        </div>

        {/* Footer with buttons - only for default UI */}
        {!specialHandler?.hasCustomUI && (
          <DialogFooter>
            <Button variant="secondary" onClick={() => handleResume("run")} disabled={isLoading}>
              <Play className="w-3.5 mr-1.5" />
              Run
            </Button>
            <Button variant="secondary" onClick={() => handleResume("step")} disabled={isLoading}>
              <StepForward className="w-3.5 mr-1.5" />
              Step
            </Button>
            <Button variant="secondary" onClick={() => handleResume("block")} disabled={isLoading}>
              <SkipForward className="w-3.5 mr-1.5" />
              Block
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
};
