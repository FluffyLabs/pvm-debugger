import { useCallback, useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { valueToNumeralSystem } from "@/components/Instructions/utils";
import { DEFAULT_REGS, ExpectedState, RegistersArray } from "@/types/pvm";
import { NumeralSystem } from "@/context/NumeralSystem";
import { MemoryEditor } from "./MemoryEditor";
import { HostCallActionButtons } from "./handlers/HostCallActionButtons";

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
}) => {
  // Local state for editable values
  const [regs, setRegs] = useState<bigint[]>([...DEFAULT_REGS]);
  const [gas, setGas] = useState<bigint>(0n);

  // Initialize local state when currentState changes
  useEffect(() => {
    if (currentState) {
      // Copy current registers
      const newRegs = currentState.regs ? [...currentState.regs] : [...DEFAULT_REGS];
      setRegs(newRegs);
      onRegsChange(newRegs);

      // Set gas to current gas - 10 (as per requirement)
      const currentGas = currentState.gas ?? 10000n;
      const newGas = currentGas > 10n ? currentGas - 10n : 0n;
      setGas(newGas);
      onGasChange(newGas);
    }
  }, [currentState, onRegsChange, onGasChange]);

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

  return (
    <>
      <div className="space-y-4 flex-1 overflow-y-auto p-2">
        {/* Two-column layout: 1fr for gas/registers, 2fr for memory */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Column 1: Gas and Registers */}
          <div className="space-y-4 md:col-span-1">
            {/* Gas */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Gas</label>
              <Input
                className="font-mono"
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
                {(regs as RegistersArray).map((regValue, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <span className="w-6 text-xs font-mono">
                      ω<sub>{index}</sub>
                    </span>
                    <Input
                      className="font-mono text-sm h-7 flex-1"
                      value={valueToNumeralSystem(regValue, numeralSystem)}
                      onChange={(e) => handleRegisterChange(index, e.target.value)}
                      onKeyUp={(e) => e.key === "Enter" && e.currentTarget.blur()}
                      disabled={isLoading}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Column 2: Memory Editor (2x width) */}
          <div className="space-y-2 md:col-span-2">
            <MemoryEditor readMemory={readMemory} disabled={isLoading} onMemoryChange={handleMemoryChange} />
          </div>
        </div>
      </div>
      <HostCallActionButtons onResume={onResume} disabled={isLoading} />
    </>
  );
};
