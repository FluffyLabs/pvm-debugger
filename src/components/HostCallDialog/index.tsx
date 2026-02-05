import { useCallback, useContext, useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { resumeAfterHostCall, readMemoryRange, HostCallResumeMode } from "@/store/workers/workersSlice";
import { NumeralSystemContext } from "@/context/NumeralSystemContext";
import { getHostCallHandler } from "./handlers";
import { DefaultHostCallContent, MemoryEdit } from "./DefaultHostCallContent";
import { DEFAULT_GAS, DEFAULT_REGS, ExpectedState } from "@/types/pvm";
import { AlertTriangle } from "lucide-react";
import { serializeHostCallEntry } from "@/lib/hostCallTrace";
import { useDebuggerActions } from "@/hooks/useDebuggerActions";

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
  const { restartProgram } = useDebuggerActions();

  const configuredServiceId = useAppSelector((state) => state.debugger.serviceId);
  const pendingHostCall = useAppSelector((state) => state.debugger.pendingHostCall);
  const initialState = useAppSelector((state) => state.debugger.initialState);
  const workers = useAppSelector((state) => state.workers);

  const firstWorker = workers[0];
  const currentState: ExpectedState | undefined = firstWorker?.currentState;
  const regs = (currentState?.regs ?? DEFAULT_REGS) as bigint[];
  const traceEntry = pendingHostCall?.entry ?? null;
  const mismatches = pendingHostCall?.mismatches ?? [];

  const [isLoading, setIsLoading] = useState(false);
  const [useGenericUI, setUseGenericUI] = useState(false);
  const [showTraceEntry, setShowTraceEntry] = useState(true);

  // State for default UI - lifted up so footer can access it
  const [pendingRegs, setPendingRegs] = useState<bigint[]>(regs);
  const [pendingGas, setPendingGas] = useState<bigint>(currentState?.gas ?? 0n);
  const [pendingMemoryEdits, setPendingMemoryEdits] = useState<MemoryEdit[]>([]);

  useEffect(() => {
    if (traceEntry === null) {
      return;
    }

    // set pending registers
    setPendingRegs((regs) => {
      const newRegs = [...regs];
      for (const rw of traceEntry.registerWrites) {
        newRegs[rw.index] = rw.value;
      }
      return newRegs;
    });

    // set pending gas
    if (traceEntry.gasAfter !== null) {
      setPendingGas(traceEntry.gasAfter);
    }

    // set pending memory writes
    const memEdits: MemoryEdit[] = traceEntry.memoryWrites.map((mw) => ({
      address: mw.address,
      data: mw.data,
    }));
    setPendingMemoryEdits(memEdits);
  }, [traceEntry]);

  const handleResume = useCallback(
    async (mode: HostCallResumeMode) => {
      setIsLoading(true);
      try {
        // Use provided values or fall back to pending/current state
        const finalRegs = pendingRegs ?? currentState.regs ?? DEFAULT_REGS;
        const currentGas = currentState.gas ?? DEFAULT_GAS;
        const finalGas = pendingGas ?? (currentGas > 10n ? currentGas - 10n : 0n);

        await dispatch(
          resumeAfterHostCall({
            regs: finalRegs,
            gas: finalGas,
            mode,
            memoryEdits: pendingMemoryEdits.length > 0 ? [...pendingMemoryEdits] : undefined,
          }),
        ).unwrap();
      } catch (e) {
        console.error("Failed to resume after host call:", e);
      } finally {
        setIsLoading(false);
      }
    },
    [dispatch, currentState, pendingRegs, pendingGas, pendingMemoryEdits],
  );

  const handleManualMemoryChange = useCallback((memoryEdit: MemoryEdit | null) => {
    if (!memoryEdit) {
      return;
    }
    setPendingMemoryEdits((prev) => {
      const existingIndex = prev.findIndex((entry) => entry.address === memoryEdit.address);
      if (existingIndex >= 0) {
        const next = [...prev];
        next[existingIndex] = memoryEdit;
        return next;
      }
      return [...prev, memoryEdit];
    });
  }, []);

  const readMemory = useCallback(
    async (startAddress: number, length: number): Promise<Uint8Array> => {
      const result = await dispatch(readMemoryRange({ startAddress, length })).unwrap();
      return result;
    },
    [dispatch],
  );

  // Check for special handler
  const hostCallId = pendingHostCall?.hostCallId ?? 10_000;
  const specialHandler = getHostCallHandler(hostCallId);
  const hostCallName = getHostCallName(hostCallId);

  return (
    <Dialog open={pendingHostCall !== null}>
      <DialogContent
        className="max-w-[75vw] max-h-[90vh] flex flex-col"
        hideClose
        onEscapeKeyDown={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Host Call</DialogTitle>
          <DialogDescription>
            {specialHandler?.hasCustomUI
              ? `PVM execution reached a ${hostCallName} host call.`
              : "PVM execution reached a host call. Edit registers and gas, then continue execution."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
          <span className="font-medium">Host Call:</span>
          <code className="px-2 py-1 bg-background rounded text-sm font-mono">{hostCallName}</code>
          <span className="text-muted-foreground text-sm">(index: {hostCallId})</span>
          {traceEntry && (
            <button
              className="text-xs text-green-600 dark:text-green-400 ml-2 hover:underline"
              onClick={() => setShowTraceEntry(!showTraceEntry)}
              disabled={isLoading}
            >
              {showTraceEntry ? "hide trace" : "(display trace entry)"}
            </button>
          )}
          {specialHandler?.hasCustomUI && !traceEntry && (
            <button
              className="ml-auto text-xs text-muted-foreground hover:text-foreground underline"
              onClick={() => setUseGenericUI(!useGenericUI)}
              disabled={isLoading}
            >
              {useGenericUI ? "Use custom UI" : "Use generic UI"}
            </button>
          )}
        </div>

        {mismatches.length > 0 && (
          <div className="flex items-start gap-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-300 dark:border-yellow-700 rounded-md text-sm">
            <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-yellow-800 dark:text-yellow-200">State mismatch with trace file</p>
              <ul className="mt-1 text-yellow-700 dark:text-yellow-300 text-xs">
                {mismatches.map((m, i) => (
                  <li key={i}>
                    {m.details ?? m.field}: expected {m.expected}, got {m.actual}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {traceEntry && showTraceEntry && (
          <div className="space-y-1">
            <pre className="p-3 bg-muted rounded-md text-xs font-mono overflow-auto max-h-32">
              {serializeHostCallEntry(traceEntry)}
            </pre>
          </div>
        )}

        {/* When trace entry is available, always use generic UI to show trace data */}
        {specialHandler?.hasCustomUI && !useGenericUI && !traceEntry ? (
          <specialHandler.Component
            currentState={currentState}
            isLoading={isLoading}
            serviceId={configuredServiceId ?? null}
            readMemory={readMemory}
            onResume={handleResume}
            onRestart={() => restartProgram(initialState)}
          />
        ) : (
          <DefaultHostCallContent
            currentState={currentState}
            isLoading={isLoading}
            numeralSystem={numeralSystem}
            readMemory={readMemory}
            onResume={handleResume}
            onRestart={() => restartProgram(initialState)}
            onRegsChange={setPendingRegs}
            onGasChange={setPendingGas}
            onMemoryChange={handleManualMemoryChange}
            traceEntry={traceEntry}
            hostCallId={hostCallId}
          />
        )}
      </DialogContent>
    </Dialog>
  );
};
