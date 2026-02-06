import { useCallback, useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { valueToNumeralSystem } from "@/components/Instructions/utils";
import { DEFAULT_GAS, DEFAULT_REGS, ExpectedState, RegistersArray } from "@/types/pvm";
import { NumeralSystem } from "@/context/NumeralSystem";
import { MemoryEditor } from "./MemoryEditor";
import { HostCallActionButtons } from "./handlers/HostCallActionButtons";
import { HostCallEntry } from "@/lib/host-call-trace";

// Re-export for convenience
export type { MemoryEdit } from "@/store/workers/workersSlice";
import type { HostCallResumeMode, MemoryEdit } from "@/store/workers/workersSlice";

function stringToNumber<T>(value: string, cb: (x: string) => T): T {
  try {
    return cb(value);
  } catch {
    return cb("0");
  }
}

interface DefaultHostCallContentProps {
  currentState: ExpectedState;
  isLoading: boolean;
  numeralSystem: NumeralSystem;
  readMemory: (startAddress: number, length: number) => Promise<Uint8Array>;
  onRegsChange: (regs: bigint[]) => void;
  onGasChange: (gas: bigint) => void;
  onMemoryChange: (memory: MemoryEdit | null) => void;
  onResume: (mode: HostCallResumeMode, regs?: bigint[], gas?: bigint) => void;
  onRestart?: () => void;
  traceEntry?: HostCallEntry | null;
  hostCallId?: number;
}

// Log level styles (matches LogHostCall.tsx)
const LOG_LEVEL_STYLES: Record<number, string> = {
  0: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300", // ERROR
  1: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300", // WARNING
  2: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300", // INFO
  3: "bg-gray-100 text-gray-800 dark:bg-gray-800/50 dark:text-gray-300", // DEBUG
  4: "bg-gray-100 text-gray-600 dark:bg-gray-800/30 dark:text-gray-400", // NIT
};

const LOG_LEVEL_NAMES: Record<number, string> = {
  0: "ERROR",
  1: "WARNING",
  2: "INFO",
  3: "DEBUG",
  4: "NIT",
};

const decoder = new TextDecoder("utf8");

export const DefaultHostCallContent: React.FC<DefaultHostCallContentProps> = ({
  currentState,
  isLoading,
  numeralSystem,
  readMemory,
  onRegsChange,
  onResume,
  onRestart,
  onGasChange,
  onMemoryChange,
  traceEntry,
  hostCallId,
}) => {
  // Local state for editable values
  const [regs, setRegs] = useState<bigint[]>([...DEFAULT_REGS]);
  const [gas, setGas] = useState<bigint>(0n);

  // Original values to track modifications
  const [originalRegs, setOriginalRegs] = useState<bigint[]>([...DEFAULT_REGS]);
  const [originalGas, setOriginalGas] = useState<bigint>(0n);

  // Log message state (for log host call)
  const [logTarget, setLogTarget] = useState<string>("");
  const [logMessage, setLogMessage] = useState<string>("");
  const [logLevel, setLogLevel] = useState<number>(2);
  const [isLoadingLog, setIsLoadingLog] = useState(false);

  // Initialize local state when currentState changes
  useEffect(() => {
    if (currentState) {
      // Copy current registers as original values
      const originalRegsFromState = currentState.regs ? [...currentState.regs] : [...DEFAULT_REGS];
      setOriginalRegs([...originalRegsFromState]);

      // Apply trace entry modifications if available
      const newRegs = [...originalRegsFromState];
      if (traceEntry) {
        for (const rw of traceEntry.registerWrites) {
          newRegs[rw.index] = rw.value;
        }
      }
      setRegs(newRegs);
      onRegsChange(newRegs);

      // Set gas - original is current gas - 10
      const currentGas = currentState.gas ?? DEFAULT_GAS;
      const originalGasValue = currentGas > 10n ? currentGas - 10n : 0n;
      setOriginalGas(originalGasValue);

      // Apply trace entry gas if available
      const newGas = traceEntry?.gasAfter ?? originalGasValue;
      setGas(newGas);
      onGasChange(newGas);
    }
  }, [currentState, traceEntry, onRegsChange, onGasChange]);

  // Load log message when this is a log host call (index 100)
  useEffect(() => {
    if (hostCallId !== 100 || !currentState?.regs) {
      setLogTarget("");
      setLogMessage("");
      return;
    }

    const loadLogMessage = async () => {
      setIsLoadingLog(true);
      try {
        const currentRegs = currentState.regs ?? DEFAULT_REGS;
        const level = Number(currentRegs[7] ?? 0n);
        const targetStart = Number(currentRegs[8] ?? 0n);
        const targetLength = Number(currentRegs[9] ?? 0n);
        const msgStart = Number(currentRegs[10] ?? 0n);
        const msgLength = Number(currentRegs[11] ?? 0n);

        setLogLevel(level);

        // Read target string from memory
        if (targetStart !== 0 && targetLength > 0) {
          const targetBytes = await readMemory(targetStart, targetLength);
          setLogTarget(decoder.decode(targetBytes));
        } else {
          setLogTarget("");
        }

        // Read message string from memory
        if (msgLength > 0) {
          const msgBytes = await readMemory(msgStart, msgLength);
          setLogMessage(decoder.decode(msgBytes));
        } else {
          setLogMessage("");
        }
      } catch (e) {
        console.error("Failed to read log message:", e);
      } finally {
        setIsLoadingLog(false);
      }
    };

    loadLogMessage();
  }, [hostCallId, currentState?.regs, readMemory]);

  // Check if a value has been modified from original
  // Gas is considered modified if trace provides gasAfter OR user changed it
  const isGasModified = traceEntry?.gasAfter != null || gas !== originalGas;
  const isRegisterModified = (index: number) => regs[index] !== originalRegs[index];

  const handleRegisterChange = (index: number, value: string) => {
    const newValue = stringToNumber(value, BigInt);
    setRegs((prev) => {
      const newRegs = [...prev];
      newRegs[index] = newValue;
      onRegsChange(newRegs);
      return newRegs;
    });
  };

  const handleGasChange = (value: string) => {
    const newValue = stringToNumber(value, BigInt);
    setGas(newValue);
    onGasChange(newValue);
  };

  const handleMemoryChange = useCallback(
    (address: number, data: Uint8Array) => {
      onMemoryChange({ address, data });
    },
    [onMemoryChange],
  );

  // Extract memory writes from trace entry
  const pendingMemoryWrites = traceEntry?.memoryWrites.map((mw) => ({
    address: mw.address,
    data: mw.data,
  }));

  // Get initial address and length from first memory write in trace
  const firstMemWrite = traceEntry?.memoryWrites[0];
  const initialMemoryAddress = firstMemWrite?.address;
  const initialMemoryLength = firstMemWrite ? Math.max(256, firstMemWrite.data.length) : undefined;

  // Reusable components for gas and registers
  const gasAndRegisters = (
    <div className="space-y-4">
      {/* Gas */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Gas</label>
        <Input
          className={`font-mono ${isGasModified ? "border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20" : ""}`}
          value={valueToNumeralSystem(gas, numeralSystem)}
          onChange={(e) => handleGasChange(e.target.value)}
          onKeyUp={(e) => e.key === "Enter" && e.currentTarget.blur()}
          disabled={isLoading}
        />
      </div>

      {/* Registers */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Registers</label>
        <div className="space-y-1">
          {(regs as RegistersArray).map((regValue, index) => {
            const isModified = isRegisterModified(index);
            return (
              <div key={index} className="flex items-center gap-2">
                <span
                  className={`w-6 text-xs font-mono ${isModified ? "text-yellow-600 dark:text-yellow-400 font-bold" : ""}`}
                >
                  ω<sub>{index}</sub>
                </span>
                <Input
                  className={`font-mono text-sm h-7 flex-1 ${isModified ? "border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20" : ""}`}
                  value={valueToNumeralSystem(regValue, numeralSystem)}
                  onChange={(e) => handleRegisterChange(index, e.target.value)}
                  onKeyUp={(e) => e.key === "Enter" && e.currentTarget.blur()}
                  disabled={isLoading}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  const memoryEditor = (
    <div className="space-y-2">
      <MemoryEditor
        readMemory={readMemory}
        disabled={isLoading}
        onMemoryChange={handleMemoryChange}
        pendingWrites={pendingMemoryWrites}
        initialAddress={initialMemoryAddress}
        initialLength={initialMemoryLength}
      />
    </div>
  );

  // Log message display component
  const logMessageDisplay = hostCallId === 100 && (
    <div className="p-3 bg-muted rounded-md space-y-2">
      <div className="flex items-center gap-2">
        <span className="font-medium text-sm">Log:</span>
        <span className={`px-2 py-0.5 rounded text-xs font-mono ${LOG_LEVEL_STYLES[logLevel] ?? LOG_LEVEL_STYLES[2]}`}>
          {LOG_LEVEL_NAMES[logLevel] ?? `UNKNOWN(${logLevel})`}
        </span>
        {logTarget && <span className="text-xs text-muted-foreground">[{logTarget}]</span>}
      </div>
      {isLoadingLog ? (
        <div className="text-sm text-muted-foreground">Loading message...</div>
      ) : (
        <div className="p-2 bg-background rounded font-mono text-sm whitespace-pre-wrap break-all">
          {logMessage || <span className="text-muted-foreground">(empty)</span>}
        </div>
      )}
    </div>
  );

  return (
    <>
      <div className="space-y-4 flex-1 overflow-y-auto p-2">
        {/* Log message for log host call */}
        {logMessageDisplay}

        {/* Two-column layout: registers left, memory right (always) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-1">{gasAndRegisters}</div>
          <div className="md:col-span-2">{memoryEditor}</div>
        </div>
      </div>
      <HostCallActionButtons onResume={onResume} onRestart={onRestart} disabled={isLoading} />
    </>
  );
};
