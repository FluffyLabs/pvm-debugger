import { useState, useEffect, useMemo, useRef } from "react";
import { HostCallHandler, HostCallHandlerProps } from "./types";
import { jam_host_calls, pvm_host_calls, block, utils } from "@typeberry/lib";
import { MockMemory, MockGasCounter, regsToBytes, bytesToRegs } from "./hostCallUtils";
import { storageManager } from "./storageManager";
import { DEFAULT_REGS } from "@/types/pvm";

const { Write } = jam_host_calls.general;
const { HostCallRegisters, HostCallMemory } = pvm_host_calls;
const { Result } = utils;
type AccountsWrite = jam_host_calls.general.AccountsWrite;

// eslint-disable-next-line react-refresh/only-export-components
const WriteHostCallComponent: React.FC<HostCallHandlerProps> = ({ currentState, onResume }) => {
  const regs = useMemo(() => currentState.regs ?? DEFAULT_REGS, [currentState.regs]);

  const serviceId = regs[7];
  const [error, setError] = useState<string | null>(null);
  const hasExecuted = useRef(false);

  // Auto-execute on mount - no UI needed for write
  useEffect(() => {
    if (hasExecuted.current) return;
    hasExecuted.current = true;

    const execute = async () => {
      try {
        const accounts: AccountsWrite = {
          write: (rawKey, data) => {
            const previousLength = storageManager.write(rawKey, data ? data.raw : null);
            return Result.ok(previousLength);
          },
        };

        const mockMemory = new MockMemory();
        const regBytes = regsToBytes(regs);
        const mockGas = new MockGasCounter(currentState.gas ?? 100000n);

        const hostCallMemory = new HostCallMemory(mockMemory);
        const hostCallRegisters = new HostCallRegisters(regBytes);

        const currentServiceId = block.tryAsServiceId(Number(serviceId));
        const write = new Write(currentServiceId, accounts);
        await write.execute(mockGas, hostCallRegisters, hostCallMemory);

        const modifiedRegs = bytesToRegs(hostCallRegisters.getEncoded());
        const finalGas = BigInt(mockGas.get());
        const memoryEdits = mockMemory.writes;

        // Auto-resume - continue execution
        onResume("step", modifiedRegs, finalGas, memoryEdits);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to execute write");
      }
    };

    execute();
  }, [regs, currentState.gas, serviceId, onResume]);

  if (error) {
    return (
      <div className="p-4">
        <div className="p-3 bg-destructive/10 text-destructive rounded-md text-sm">{error}</div>
      </div>
    );
  }

  return <div className="p-4 text-sm text-muted-foreground">Executing write host call...</div>;
};

export const WriteHostCall: HostCallHandler = {
  index: 4, // write host call index
  name: "write",
  hasCustomUI: true,
  Component: WriteHostCallComponent,
};
