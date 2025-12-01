import { useState, useEffect, useMemo, useRef } from "react";
import { HostCallHandler, HostCallHandlerProps } from "./types";
import { jam_host_calls, pvm_host_calls, block, utils } from "@typeberry/lib";
import { MockMemory, MockGasCounter, regsToBytes, bytesToRegs, OK } from "./hostCallUtils";
import { HostCallActionButtons } from "./HostCallActionButtons";
import { DEFAULT_GAS, DEFAULT_REGS } from "@/types/pvm";

const { Provide } = jam_host_calls.accumulate;
const { HostCallRegisters, HostCallMemory } = pvm_host_calls;
const { Result } = utils;
type PartialState = jam_host_calls.PartialState;

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

interface ProvideData {
  service: string;
  preimage: string;
  preimageLength: number;
}

// eslint-disable-next-line react-refresh/only-export-components
const ProvideHostCallComponent: React.FC<HostCallHandlerProps> = ({
  currentState,
  isLoading,
  readMemory,
  onResume,
}) => {
  const regs = useMemo(() => currentState.regs ?? DEFAULT_REGS, [currentState.regs]);

  const [provideData, setProvideData] = useState<ProvideData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isExecuting, setIsExecuting] = useState(true);
  const hasExecuted = useRef(false);

  // Execute on mount to capture provide data
  useEffect(() => {
    if (hasExecuted.current) return;
    hasExecuted.current = true;

    const execute = async () => {
      setIsExecuting(true);
      try {
        let capturedData: ProvideData | null = null;

        const partialState: PartialState = {
          providePreimage: (service, preimage) => {
            capturedData = {
              service: service === null ? "current" : service.toString(),
              preimage: preimage.toString(),
              preimageLength: preimage.length,
            };
            return Result.ok(OK);
          },
          // Stub other methods
          transfer: () => Result.ok(OK),
          checkPreimageStatus: () => null,
          requestPreimage: () => Result.ok(OK),
          forgetPreimage: () => Result.ok(OK),
          eject: () => Result.ok(OK),
          newService: () => Result.ok(block.tryAsServiceId(0)),
          upgradeService: () => {},
          updateValidatorsData: () => Result.ok(OK),
          checkpoint: () => {},
          updateAuthorizationQueue: () => Result.ok(OK),
          updatePrivilegedServices: () => Result.ok(OK),
          yield: () => {},
        };

        const mockMemory = new MockMemory();

        // Preload preimage memory from actual PVM
        // Provide: regs[7] = service ID, regs[8] = preimage pointer, regs[9] = preimage length
        const preimagePointer = Number(regs[8] ?? 0n);
        const preimageLength = Number(regs[9] ?? 0n);
        if (preimagePointer > 0 && preimageLength > 0) {
          const preimageData = await readMemory(preimagePointer, preimageLength);
          mockMemory.preload(preimagePointer, preimageData);
        }

        const regBytes = regsToBytes(regs);
        const mockGas = new MockGasCounter(currentState.gas ?? DEFAULT_GAS);

        const hostCallMemory = new HostCallMemory(mockMemory);
        const hostCallRegisters = new HostCallRegisters(regBytes);

        const currentServiceId = block.tryAsServiceId(0);
        const provide = new Provide(currentServiceId, partialState);
        await provide.execute(mockGas, hostCallRegisters, hostCallMemory);

        setProvideData(capturedData);
        setIsExecuting(false);
      } catch (e) {
        console.error(e);
        setError(e instanceof Error ? e.message : "Failed to execute provide");
        setIsExecuting(false);
      }
    };

    execute();
  }, [regs, currentState.gas, readMemory]);

  const handleResume = async (mode: "step" | "block" | "run") => {
    setError(null);
    setIsExecuting(true);

    try {
      const partialState: PartialState = {
        providePreimage: () => Result.ok(OK),
        transfer: () => Result.ok(OK),
        checkPreimageStatus: () => null,
        requestPreimage: () => Result.ok(OK),
        forgetPreimage: () => Result.ok(OK),
        eject: () => Result.ok(OK),
        newService: () => Result.ok(block.tryAsServiceId(0)),
        upgradeService: () => {},
        updateValidatorsData: () => Result.ok(OK),
        checkpoint: () => {},
        updateAuthorizationQueue: () => Result.ok(OK),
        updatePrivilegedServices: () => Result.ok(OK),
        yield: () => {},
      };

      const mockMemory = new MockMemory();

      const preimagePointer = Number(regs[8] ?? 0n);
      const preimageLength = Number(regs[9] ?? 0n);
      if (preimagePointer > 0 && preimageLength > 0) {
        const preimageData = await readMemory(preimagePointer, preimageLength);
        mockMemory.preload(preimagePointer, preimageData);
      }

      const regBytes = regsToBytes(regs);
      const mockGas = new MockGasCounter(currentState.gas ?? DEFAULT_GAS);

      const hostCallMemory = new HostCallMemory(mockMemory);
      const hostCallRegisters = new HostCallRegisters(regBytes);

      const currentServiceId = block.tryAsServiceId(0);
      const provide = new Provide(currentServiceId, partialState);
      await provide.execute(mockGas, hostCallRegisters, hostCallMemory);

      const modifiedRegs = bytesToRegs(hostCallRegisters.getEncoded());
      const finalGas = BigInt(mockGas.get());
      const memoryEdits = mockMemory.writes;

      onResume(mode, modifiedRegs, finalGas, memoryEdits);
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : "Failed to execute provide");
      setIsExecuting(false);
    }
  };

  if (isExecuting && !provideData) {
    return <div className="p-4 text-sm text-muted-foreground">Executing provide host call...</div>;
  }

  return (
    <>
      <div className="space-y-4 overflow-y-auto flex-1 p-2">
        <div className="text-sm font-medium border-b pb-2">Provide Preimage Data</div>

        {provideData && (
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Target Service</label>
              <div className="p-2 bg-muted rounded-md font-mono text-sm">{provideData.service}</div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">
                Preimage ({provideData.preimageLength} bytes, hex)
              </label>
              <div className="p-2 bg-muted rounded-md font-mono text-sm break-all max-h-32 overflow-y-auto">
                {provideData.preimage}
              </div>
              {provideData.preimageLength <= 256 && (
                <div className="p-2 bg-muted/50 rounded-md font-mono text-sm break-all text-muted-foreground">
                  ASCII: {hexToAscii(provideData.preimage)}
                </div>
              )}
            </div>
          </div>
        )}

        {error && <div className="p-3 bg-destructive/10 text-destructive rounded-md text-sm">{error}</div>}
      </div>
      <HostCallActionButtons onResume={handleResume} disabled={isLoading || isExecuting} />
    </>
  );
};

export const ProvideHostCall: HostCallHandler = {
  index: 26, // provide host call index
  name: "provide",
  hasCustomUI: true,
  Component: ProvideHostCallComponent,
};
