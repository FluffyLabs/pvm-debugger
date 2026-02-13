import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { HostCallHandler, HostCallHandlerProps } from "./types";
import { jam_host_calls, pvm_host_calls, bytes, block } from "@typeberry/lib";
import { MockMemory, MockGasCounter, regsToBytes, bytesToRegs } from "./hostCallUtils";
import { HostCallActionButtons } from "./HostCallActionButtons";
import { DEFAULT_GAS, DEFAULT_REGS } from "@/types/pvm";

const { Fetch, FetchKind } = jam_host_calls.general;
const { HostCallRegisters, HostCallMemory } = pvm_host_calls;
const { BytesBlob } = bytes;
type IFetchExternalities = jam_host_calls.general.IFetchExternalities;

// Helper to convert hex string to Uint8Array
function hexToBytes(hex: string): Uint8Array {
  return bytes.BytesBlob.parseBlob(hex).raw;
}

const DEFAULT_CONSTANTS =
  "0x0a00000000000000010000000000000064000000000000000200200000000c000000809698000000000080f0fa020000000000ca9a3b00000000002d3101000000000800100008000300180000000300080006005000040080000500060000fa0000017cd20000093d0004000000000c00000204000000c0000080000000000c00000a000000";

// Map FetchKind to human-readable info
const FETCH_KIND_INFO: Record<number, { name: string; description: string; needsInput: boolean }> = {
  [FetchKind.Constants]: { name: "Constants", description: "Encoded constants info", needsInput: true },
  [FetchKind.Entropy]: { name: "Entropy", description: "Randomness entropy value", needsInput: true },
  [FetchKind.AuthorizerTrace]: { name: "Authorizer Trace", description: "Authorizer trace data", needsInput: true },
  [FetchKind.OtherWorkItemExtrinsics]: {
    name: "Other Work Item Extrinsics",
    description: "Extrinsics from another work item",
    needsInput: true,
  },
  [FetchKind.MyExtrinsics]: {
    name: "My Extrinsics",
    description: "Extrinsics from current work item",
    needsInput: true,
  },
  [FetchKind.OtherWorkItemImports]: {
    name: "Other Work Item Imports",
    description: "Import segments from another work item",
    needsInput: true,
  },
  [FetchKind.MyImports]: {
    name: "My Imports",
    description: "Import segments from current work item",
    needsInput: true,
  },
  [FetchKind.WorkPackage]: {
    name: "Work Package",
    description: "Encoding of the entire work package",
    needsInput: true,
  },
  [FetchKind.Authorizer]: {
    name: "Authorizer",
    description: "Authorizer (code hash and parametrization)",
    needsInput: true,
  },
  [FetchKind.AuthorizationToken]: {
    name: "Authorization Token",
    description: "Authorization token data",
    needsInput: true,
  },
  [FetchKind.RefineContext]: { name: "Refine Context", description: "Refine context data", needsInput: true },
  [FetchKind.AllWorkItems]: { name: "All Work Items", description: "Encoding of all work items", needsInput: true },
  [FetchKind.OneWorkItem]: { name: "One Work Item", description: "Encoding of a single work item", needsInput: true },
  [FetchKind.WorkItemPayload]: { name: "Work Item Payload", description: "Payload of a work item", needsInput: true },
  [FetchKind.AllTransfersAndOperands]: {
    name: "All Transfers and Operands",
    description: "All accumulation operands and transfers",
    needsInput: true,
  },
  [FetchKind.OneTransferOrOperand]: {
    name: "One Transfer or Operand",
    description: "One selected operand or transfer",
    needsInput: true,
  },
};

// eslint-disable-next-line react-refresh/only-export-components
const FetchHostCallComponent: React.FC<HostCallHandlerProps> = ({
  currentState,
  isLoading,
  onResume,
  onRestart,
  serviceId,
}) => {
  const regs = currentState.regs ?? DEFAULT_REGS;
  const fetchKind = Number(regs[10] ?? 0n);
  const fetchInfo = FETCH_KIND_INFO[fetchKind] || {
    name: `Unknown (${fetchKind})`,
    description: "Unknown fetch kind",
    needsInput: true,
  };

  const [hexInput, setHexInput] = useState(DEFAULT_CONSTANTS);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Reset input when dialog opens
    setHexInput(DEFAULT_CONSTANTS);
    setError(null);
  }, [fetchKind]);

  const handleResume = async (mode: "step" | "block" | "run") => {
    setError(null);

    try {
      // Parse hex input
      const dataBytes = hexInput.trim() ? hexToBytes(hexInput) : new Uint8Array(0);
      const dataBlob = BytesBlob.blobFrom(dataBytes);

      // Create mock externalities that returns user-provided data
      const externalities: IFetchExternalities = {
        constants: () => (fetchKind === FetchKind.Constants ? dataBlob : BytesBlob.empty()),
        entropy: () => (fetchKind === FetchKind.Entropy ? dataBlob : null),
        authorizerTrace: () => (fetchKind === FetchKind.AuthorizerTrace ? dataBlob : null),
        workItemExtrinsic: () =>
          fetchKind === FetchKind.OtherWorkItemExtrinsics || fetchKind === FetchKind.MyExtrinsics ? dataBlob : null,
        workItemImport: () =>
          fetchKind === FetchKind.OtherWorkItemImports || fetchKind === FetchKind.MyImports ? dataBlob : null,
        workPackage: () => (fetchKind === FetchKind.WorkPackage ? dataBlob : null),
        authorizer: () => (fetchKind === FetchKind.Authorizer ? dataBlob : null),
        authorizationToken: () => (fetchKind === FetchKind.AuthorizationToken ? dataBlob : null),
        refineContext: () => (fetchKind === FetchKind.RefineContext ? dataBlob : null),
        allWorkItems: () => (fetchKind === FetchKind.AllWorkItems ? dataBlob : null),
        oneWorkItem: () => (fetchKind === FetchKind.OneWorkItem ? dataBlob : null),
        workItemPayload: () => (fetchKind === FetchKind.WorkItemPayload ? dataBlob : null),
        allOperands: () => null, // deprecated
        allTransfersAndOperands: () => (fetchKind === FetchKind.AllTransfersAndOperands ? dataBlob : null),
        oneOperand: () => null, // deprecated
        oneTransferOrOperand: () => (fetchKind === FetchKind.OneTransferOrOperand ? dataBlob : null),
        allTransfers: () => null, // deprecated
        oneTransfer: () => null, // deprecated
      };

      // Create mock memory and registers
      const mockMemory = new MockMemory();
      const regBytes = regsToBytes(regs);
      const mockGas = new MockGasCounter(currentState.gas ?? DEFAULT_GAS);

      // Wrap in PVM host call wrappers
      const hostCallMemory = new HostCallMemory(mockMemory);
      const hostCallRegisters = new HostCallRegisters(regBytes);

      // Create and execute Fetch host call
      const currentServiceId = block.tryAsServiceId(serviceId ?? 0);
      const fetch = new Fetch(currentServiceId, externalities);
      await fetch.execute(mockGas, hostCallRegisters, hostCallMemory);

      // Extract modified registers
      const modifiedRegs = bytesToRegs(hostCallRegisters.getEncoded());

      // Extract gas as bigint
      const finalGas = BigInt(mockGas.get());

      // Collect memory writes
      const memoryEdits = mockMemory.writes;

      // Resume with modified state
      onResume(mode, modifiedRegs, finalGas, memoryEdits);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to execute fetch");
    }
  };

  return (
    <>
      <div className="space-y-4 overflow-y-auto flex-1 p-2">
        {/* Fetch Kind */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm">Fetch Kind:</span>
            <span className="px-2 py-1 rounded text-xs font-mono bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
              {fetchInfo.name}
            </span>
          </div>
          <div className="p-3 bg-muted rounded-md text-sm">{fetchInfo.description}</div>
        </div>

        {/* Data Input */}
        {fetchInfo.needsInput && (
          <div className="space-y-2">
            <label className="text-sm font-medium">Data (hex-encoded)</label>
            <Input
              className="font-mono"
              placeholder="0x1234..."
              value={hexInput}
              onChange={(e) => setHexInput(e.target.value)}
              disabled={isLoading}
            />
            {hexInput && (
              <div className="text-xs text-muted-foreground">
                Length: {hexInput.replace(/^0x/i, "").replace(/\s/g, "").length / 2} bytes
              </div>
            )}
          </div>
        )}

        {/* Error */}
        {error && <div className="p-3 bg-destructive/10 text-destructive rounded-md text-sm">{error}</div>}

        {/* Register details */}
        <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t">
          <div className="font-medium mb-2">Register Details:</div>
          <div>ω₁₀ (fetch kind): {fetchKind}</div>
          <div>ω₇ (output): {regs[7]?.toString()}</div>
          <div>ω₈ (offset): {regs[8]?.toString()}</div>
          <div>ω₉ (length): {regs[9]?.toString()}</div>
          <div>ω₁₁: {regs[11]?.toString()}</div>
        </div>
      </div>
      <HostCallActionButtons onResume={handleResume} onRestart={onRestart} disabled={isLoading} />
    </>
  );
};

export const FetchHostCall: HostCallHandler = {
  index: 1, // fetch host call index
  name: "fetch",
  hasCustomUI: true,
  Component: FetchHostCallComponent,
};
