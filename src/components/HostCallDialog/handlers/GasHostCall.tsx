import { useState, useEffect, useMemo, useRef } from "react";
import { HostCallHandler, HostCallHandlerProps } from "./types";
import { jam_host_calls, block } from "@typeberry/lib";
import { HostCallContext } from "./hostCallUtils";
import { HostCallActionButtons } from "./HostCallActionButtons";
import { DEFAULT_REGS } from "@/types/pvm";

const { GasHostCall: Gas } = jam_host_calls.general;

interface GasResult {
  gasRemaining: string;
  modifiedRegs: bigint[];
  finalGas: bigint;
}

// eslint-disable-next-line react-refresh/only-export-components
const GasHostCallComponent: React.FC<HostCallHandlerProps> = ({ currentState, isLoading, onResume, serviceId }) => {
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
        const ctx = new HostCallContext(regs, currentState.gas);

        // Gas host call doesn't use memory, only registers
        const currentServiceId = block.tryAsServiceId(serviceId ?? 0);
        const gas = new Gas(currentServiceId);
        await gas.execute(ctx.mockGas, ctx.hostCallRegisters);

        const { modifiedRegs, finalGas } = ctx.getResult();

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
  }, [regs, currentState.gas, serviceId]);

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
