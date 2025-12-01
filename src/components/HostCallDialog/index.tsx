import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setHasHostCallOpen, setPendingHostCallIndex } from "@/store/debugger/debuggerSlice";
import { resumeAfterHostCall, readMemoryRange, HostCallResumeMode } from "@/store/workers/workersSlice";
import { NumeralSystemContext } from "@/context/NumeralSystemContext";
import { getHostCallHandler } from "./handlers";
import { DefaultHostCallContent, MemoryEdit } from "./DefaultHostCallContent";
import { DEFAULT_GAS, DEFAULT_REGS } from "@/types/pvm";

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
  const [useGenericUI, setUseGenericUI] = useState(false);

  // State for default UI - lifted up so footer can access it
  const [pendingRegs, setPendingRegs] = useState<bigint[] | null>(null);
  const [pendingGas, setPendingGas] = useState<bigint | null>(null);
  const [pendingMemory, setPendingMemory] = useState<MemoryEdit | null>(null);

  // Reset state when dialog opens
  useEffect(() => {
    if (hasHostCallOpen) {
      setIsLoading(false);
      setUseGenericUI(false);
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
    async (mode: HostCallResumeMode, regs?: bigint[], gas?: bigint, memoryEdits?: MemoryEdit[]) => {
      setIsLoading(true);
      try {
        // Use provided values or fall back to pending/current state
        const finalRegs = regs ?? pendingRegs ?? currentState.regs ?? DEFAULT_REGS;
        const currentGas = currentState.gas ?? DEFAULT_GAS;
        const finalGas = gas ?? pendingGas ?? (currentGas > 10n ? currentGas - 10n : 0n);

        // Combine memory edits from host calls with pending memory from default UI
        const finalMemoryEdits: MemoryEdit[] = [];
        if (memoryEdits && memoryEdits.length > 0) {
          finalMemoryEdits.push(...memoryEdits);
        }
        if (pendingMemory) {
          finalMemoryEdits.push(pendingMemory);
        }

        await dispatch(
          resumeAfterHostCall({
            regs: finalRegs as bigint[],
            gas: finalGas,
            mode,
            memoryEdits: finalMemoryEdits.length > 0 ? finalMemoryEdits : undefined,
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
          {specialHandler?.hasCustomUI && (
            <button
              className="ml-auto text-xs text-muted-foreground hover:text-foreground underline"
              onClick={() => setUseGenericUI(!useGenericUI)}
              disabled={isLoading}
            >
              {useGenericUI ? "Use custom UI" : "Use generic UI"}
            </button>
          )}
        </div>

        {/* Scrollable content area */}
        {specialHandler?.hasCustomUI && !useGenericUI ? (
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
            onResume={handleResume}
            onRegsChange={setPendingRegs}
            onGasChange={setPendingGas}
            onMemoryChange={setPendingMemory}
          />
        )}
      </DialogContent>
    </Dialog>
  );
};
