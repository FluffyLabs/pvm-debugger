import { useState, useEffect, useMemo, useRef } from "react";
import { HostCallHandler, HostCallHandlerProps } from "./types";
import { jam_host_calls, pvm_host_calls, block } from "@typeberry/lib";
import { MockGasCounter, regsToBytes, bytesToRegs } from "./hostCallUtils";
import { HostCallActionButtons } from "./HostCallActionButtons";
import { DEFAULT_GAS, DEFAULT_REGS } from "@/types/pvm";

const { GasHostCall: Gas } = jam_host_calls.general;
const { HostCallRegisters } = pvm_host_calls;

interface GasResult {
  gasRemaining: string;
  modifiedRegs: bigint[];
  finalGas: bigint;
}

// eslint-disable-next-line react-refresh/only-export-components
const GasHostCallComponent: React.FC<HostCallHandlerProps> = ({ currentState, isLoading, onResume }) => {
  const regs = useMemo(() => currentState.regs ?? DEFAULT_REGS, [currentState.regs]);

  const [result, setResult] = useState<GasResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isExecuting, setIsExecuting] = useState(true);
  const hasExecuted = useRef(false);

  // Execute on mount to get the result, but don't auto-resume
  useEffect(() => {
    if (hasExecuted.current) return;
    hasExecuted.current = true;

    const execute = async () => {
      setIsExecuting(true);
      try {
        const regBytes = regsToBytes(regs);
        const mockGas = new MockGasCounter(currentState.gas ?? DEFAULT_GAS);

        const hostCallRegisters = new HostCallRegisters(regBytes);

        // Gas host call doesn't use memory, only registers
        const currentServiceId = block.tryAsServiceId(0);
        const gas = new Gas(currentServiceId);
        await gas.execute(mockGas, hostCallRegisters);

        const modifiedRegs = bytesToRegs(hostCallRegisters.getEncoded());
        const finalGas = BigInt(mockGas.get());

        // Store result for display, wait for user confirmation
        setResult({
          gasRemaining: finalGas.toString(),
          modifiedRegs,
          finalGas,
        });
        setIsExecuting(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to execute gas");
        setIsExecuting(false);
      }
    };

    execute();
  }, [regs, currentState.gas]);

  const handleResume = (mode: "step" | "block" | "run") => {
    if (!result) return;
    onResume(mode, result.modifiedRegs, result.finalGas, []);
  };

  if (isExecuting) {
    return <div className="p-4 text-sm text-muted-foreground">Executing gas host call...</div>;
  }

  if (error) {
    return (
      <div className="p-4">
        <div className="p-3 bg-destructive/10 text-destructive rounded-md text-sm">{error}</div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4 overflow-y-auto flex-1 p-2">
        <div className="text-sm font-medium border-b pb-2">Gas Host Call Result</div>

        {result && (
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Gas Remaining</label>
              <div className="p-2 bg-muted rounded-md font-mono text-sm">{result.gasRemaining}</div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Result (written to ω₇)</label>
              <div className="p-2 bg-muted rounded-md font-mono text-sm">{result.modifiedRegs[7]?.toString()}</div>
            </div>
          </div>
        )}
      </div>
      <HostCallActionButtons onResume={handleResume} disabled={isLoading || isExecuting} />
    </>
  );
};

export const GasHostCall: HostCallHandler = {
  index: 0, // gas host call index
  name: "gas",
  hasCustomUI: true,
  Component: GasHostCallComponent,
};
