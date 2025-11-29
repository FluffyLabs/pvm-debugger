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
const WriteHostCallComponent: React.FC<HostCallHandlerProps> = ({ currentState, readMemory, onResume }) => {
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

        // Preload key memory from actual PVM
        // Write host call: regs[8] = key pointer, regs[9] = key length
        const keyPointer = Number(regs[8] ?? 0n);
        const keyLength = Number(regs[9] ?? 0n);
        if (keyLength > 0) {
          const keyData = await readMemory(keyPointer, keyLength);
          mockMemory.preload(keyPointer, keyData);
        }

        // Preload value memory from actual PVM
        // Write host call: regs[10] = value pointer (can be max u64 for deletion), regs[11] = value length
        const valuePointer = regs[10] ?? 0n;
        const valueLength = Number(regs[11] ?? 0n);
        // Check if value pointer is not "infinity" (max u64 indicates deletion)
        const MAX_U64 = 0xffffffffffffffffn;
        if (valuePointer < MAX_U64 && valueLength > 0) {
          const valueData = await readMemory(Number(valuePointer), valueLength);
          mockMemory.preload(Number(valuePointer), valueData);
        }

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
  }, [regs, currentState.gas, serviceId, readMemory, onResume]);

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
