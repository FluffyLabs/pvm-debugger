import { useCallback, useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { valueToNumeralSystem } from "@/components/Instructions/utils";
import { DEFAULT_GAS, DEFAULT_REGS, ExpectedState, RegistersArray } from "@/types/pvm";
import { NumeralSystem } from "@/context/NumeralSystem";
import { MemoryEditor } from "./MemoryEditor";
import { HostCallActionButtons } from "./handlers/HostCallActionButtons";
import { HostCallEntry } from "@/lib/hostCallTrace";

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
  traceEntry?: HostCallEntry | null;
}

/**
 * Serialize a HostCallEntry to JSON, handling Map and Uint8Array types
 */
function serializeTraceEntry(entry: HostCallEntry): string {
  const replacer = (_key: string, value: unknown) => {
    if (value instanceof Map) {
      const obj: Record<string, unknown> = {};
      for (const [k, v] of value) {
        obj[String(k)] = typeof v === "bigint" ? `0x${v.toString(16)}` : v;
      }
      return obj;
    }
    if (value instanceof Uint8Array) {
      return (
        "0x" +
        Array.from(value)
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("")
      );
    }
    if (typeof value === "bigint") {
      return `0x${value.toString(16)}`;
    }
    return value;
  };
  return JSON.stringify(entry, replacer, 2);
}

export const DefaultHostCallContent: React.FC<DefaultHostCallContentProps> = ({
  currentState,
  isLoading,
  numeralSystem,
  readMemory,
  onRegsChange,
  onResume,
  onGasChange,
  onMemoryChange,
  traceEntry,
}) => {
  // Local state for editable values
  const [regs, setRegs] = useState<bigint[]>([...DEFAULT_REGS]);
  const [gas, setGas] = useState<bigint>(0n);

  // Original values to track modifications
  const [originalRegs, setOriginalRegs] = useState<bigint[]>([...DEFAULT_REGS]);
  const [originalGas, setOriginalGas] = useState<bigint>(0n);

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

  // Check if a value has been modified from original
  const isGasModified = gas !== originalGas;
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

  return (
    <>
      <div className="space-y-4 flex-1 overflow-y-auto p-2">
        {traceEntry ? (
          // When trace entry is present: two-pane layout with trace on the right
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Left pane: Registers and Memory stacked vertically */}
            <div className="space-y-4">
              {gasAndRegisters}
              {memoryEditor}
            </div>

            {/* Right pane: Trace Entry */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Trace Entry (JSON)</label>
              <pre className="p-3 bg-muted rounded-md text-xs font-mono overflow-auto max-h-[60vh]">
                {serializeTraceEntry(traceEntry)}
              </pre>
            </div>
          </div>
        ) : (
          // Default layout: two-column with registers left, memory right (2x width)
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-1">{gasAndRegisters}</div>
            <div className="md:col-span-2">{memoryEditor}</div>
          </div>
        )}
      </div>
      <HostCallActionButtons onResume={onResume} disabled={isLoading} />
    </>
  );
};
