import { useState, useEffect, useMemo, useRef } from "react";
import { HostCallHandler, HostCallHandlerProps } from "./types";
import { jam_host_calls, pvm_host_calls, block, utils } from "@typeberry/lib";
import { MockMemory, MockGasCounter, regsToBytes, bytesToRegs } from "./hostCallUtils";
import { storageManager } from "./storageManager";
import { HostCallActionButtons } from "./HostCallActionButtons";
import { DEFAULT_GAS, DEFAULT_REGS } from "@/types/pvm";

const { Write } = jam_host_calls.general;
const { HostCallRegisters, HostCallMemory } = pvm_host_calls;
const { Result } = utils;
type AccountsWrite = jam_host_calls.general.AccountsWrite;

// Helper to decode hex to ASCII (replaces non-printable chars with dots)
function hexToAscii(hex: string): string {
  const clean = hex.replace(/^0x/i, "");
  let result = "";
  for (let i = 0; i < clean.length; i += 2) {
    const byte = parseInt(clean.slice(i, i + 2), 16);
    result += byte >= 32 && byte <= 126 ? String.fromCharCode(byte) : ".";
  }
  return result;
}

// Helper to convert Uint8Array to hex string
function bytesToHex(bytes: Uint8Array): string {
  return (
    "0x" +
    Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
  );
}

interface WriteResult {
  serviceId: string;
  key: string;
  keyLength: number;
  value: string | null;
  valueLength: number;
  isDelete: boolean;
  previousLength: number | null;
  modifiedRegs: bigint[];
  finalGas: bigint;
  memoryEdits: Array<{ address: number; data: Uint8Array }>;
}

// eslint-disable-next-line react-refresh/only-export-components
const WriteHostCallComponent: React.FC<HostCallHandlerProps> = ({ currentState, isLoading, readMemory, onResume }) => {
  const regs = useMemo(() => currentState.regs ?? DEFAULT_REGS, [currentState.regs]);

  const serviceId = regs[7];
  const [result, setResult] = useState<WriteResult | null>(null);
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
        let capturedPreviousLength: number | null = null;

        const accounts: AccountsWrite = {
          write: (rawKey, data) => {
            const previousLength = storageManager.write(rawKey, data ? data.raw : null);
            capturedPreviousLength = previousLength;
            return Result.ok(previousLength);
          },
        };

        const mockMemory = new MockMemory();

        // Preload key memory from actual PVM
        // Write host call: regs[8] = key pointer, regs[9] = key length
        const keyPointer = Number(regs[8] ?? 0n);
        const keyLength = Number(regs[9] ?? 0n);
        let keyHex = "";
        if (keyLength > 0) {
          const keyData = await readMemory(keyPointer, keyLength);
          mockMemory.preload(keyPointer, keyData);
          keyHex = bytesToHex(keyData);
        }

        // Preload value memory from actual PVM
        // Write host call: regs[10] = value pointer (can be max u64 for deletion), regs[11] = value length
        const valuePointer = regs[10] ?? 0n;
        const valueLength = Number(regs[11] ?? 0n);
        // Check if value pointer is not "infinity" (max u64 indicates deletion)
        const MAX_U64 = 0xffffffffffffffffn;
        const isDelete = valuePointer >= MAX_U64;
        let valueHex: string | null = null;
        if (!isDelete && valueLength > 0) {
          const valueData = await readMemory(Number(valuePointer), valueLength);
          mockMemory.preload(Number(valuePointer), valueData);
          valueHex = bytesToHex(valueData);
        }

        const regBytes = regsToBytes(regs);
        const mockGas = new MockGasCounter(currentState.gas ?? DEFAULT_GAS);

        const hostCallMemory = new HostCallMemory(mockMemory);
        const hostCallRegisters = new HostCallRegisters(regBytes);

        const currentServiceId = block.tryAsServiceId(Number(serviceId));
        const write = new Write(currentServiceId, accounts);
        await write.execute(mockGas, hostCallRegisters, hostCallMemory);

        const modifiedRegs = bytesToRegs(hostCallRegisters.getEncoded());
        const finalGas = BigInt(mockGas.get());
        const memoryEdits = mockMemory.writes;

        // Store result for display, wait for user confirmation
        setResult({
          serviceId: serviceId?.toString() ?? "0",
          key: keyHex,
          keyLength,
          value: valueHex,
          valueLength,
          isDelete,
          previousLength: capturedPreviousLength,
          modifiedRegs,
          finalGas,
          memoryEdits,
        });
        setIsExecuting(false);
      } catch (e) {
        console.error(e);
        const msg = e !== null && typeof e === "object" && "message" in e ? e.message : "";
        setError(e instanceof Error ? e.message : `Failed to execute write: ${msg}`);
        setIsExecuting(false);
      }
    };

    execute();
  }, [regs, currentState.gas, serviceId, readMemory]);

  const handleResume = (mode: "step" | "block" | "run") => {
    if (!result) return;
    onResume(mode, result.modifiedRegs, result.finalGas, result.memoryEdits);
  };

  if (isExecuting) {
    return <div className="p-4 text-sm text-muted-foreground">Executing write host call...</div>;
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
        <div className="text-sm font-medium border-b pb-2">Write Host Call Result</div>

        {result && (
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Service ID</label>
              <div className="p-2 bg-muted rounded-md font-mono text-sm">{result.serviceId}</div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Key ({result.keyLength} bytes)</label>
              <div className="p-2 bg-muted rounded-md font-mono text-sm break-all">{result.key || "(empty)"}</div>
              {result.keyLength > 0 && result.keyLength <= 64 && (
                <div className="p-2 bg-muted/50 rounded-md font-mono text-sm break-all text-muted-foreground">
                  ASCII: {hexToAscii(result.key)}
                </div>
              )}
            </div>

            {result.isDelete ? (
              <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 rounded-md text-sm">
                Delete operation (value pointer = max u64)
              </div>
            ) : (
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Value ({result.valueLength} bytes)</label>
                <div className="p-2 bg-muted rounded-md font-mono text-sm break-all max-h-32 overflow-y-auto">
                  {result.value || "(empty)"}
                </div>
                {result.value && result.valueLength <= 64 && (
                  <div className="p-2 bg-muted/50 rounded-md font-mono text-sm break-all text-muted-foreground">
                    ASCII: {hexToAscii(result.value)}
                  </div>
                )}
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Previous Value Length</label>
              <div className="p-2 bg-muted rounded-md font-mono text-sm">
                {result.previousLength !== null ? `${result.previousLength} bytes` : "Key did not exist"}
              </div>
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

export const WriteHostCall: HostCallHandler = {
  index: 4, // write host call index
  name: "write",
  hasCustomUI: true,
  Component: WriteHostCallComponent,
};
