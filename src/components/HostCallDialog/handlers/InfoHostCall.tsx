import { useState, useEffect, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { HostCallHandler, HostCallHandlerProps } from "./types";
import { jam_host_calls, block, state, bytes, numbers } from "@typeberry/lib";
import { HostCallContext } from "./hostCallUtils";
import { HostCallActionButtons } from "./HostCallActionButtons";
import { DEFAULT_REGS } from "@/types/pvm";

const { Info } = jam_host_calls.general;
const { ServiceAccountInfo } = state;
const { tryAsU32, tryAsU64 } = numbers;
const { tryAsServiceId, tryAsTimeSlot, tryAsServiceGas } = block;
type AccountsInfo = jam_host_calls.general.AccountsInfo;
type CodeHash = block.CodeHash;

// Default values for service account info
const DEFAULT_CODE_HASH = "0x" + "00".repeat(32);
const DEFAULT_BALANCE = "1000000000"; // 1 billion
const DEFAULT_ACCUMULATE_MIN_GAS = "10000";
const DEFAULT_ON_TRANSFER_MIN_GAS = "10000";
const DEFAULT_STORAGE_BYTES = "0";
const DEFAULT_GRATIS_STORAGE = "0";
const DEFAULT_STORAGE_COUNT = "0";
const DEFAULT_CREATED = "0";
const DEFAULT_LAST_ACCUMULATION = "0";
const DEFAULT_PARENT_SERVICE = "0";

// eslint-disable-next-line react-refresh/only-export-components
const InfoHostCallComponent: React.FC<HostCallHandlerProps> = ({ currentState, isLoading, onResume }) => {
  const regs = useMemo(() => currentState.regs ?? DEFAULT_REGS, [currentState.regs]);
  const requestedServiceId = regs[7];

  const [error, setError] = useState<string | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);

  // Form state
  const [codeHash, setCodeHash] = useState(DEFAULT_CODE_HASH);
  const [balance, setBalance] = useState(DEFAULT_BALANCE);
  const [accumulateMinGas, setAccumulateMinGas] = useState(DEFAULT_ACCUMULATE_MIN_GAS);
  const [onTransferMinGas, setOnTransferMinGas] = useState(DEFAULT_ON_TRANSFER_MIN_GAS);
  const [storageBytes, setStorageBytes] = useState(DEFAULT_STORAGE_BYTES);
  const [gratisStorage, setGratisStorage] = useState(DEFAULT_GRATIS_STORAGE);
  const [storageCount, setStorageCount] = useState(DEFAULT_STORAGE_COUNT);
  const [created, setCreated] = useState(DEFAULT_CREATED);
  const [lastAccumulation, setLastAccumulation] = useState(DEFAULT_LAST_ACCUMULATION);
  const [parentService, setParentService] = useState(DEFAULT_PARENT_SERVICE);

  // Reset form when dialog opens
  useEffect(() => {
    setError(null);
    setIsExecuting(false);
  }, []);

  const handleResume = async (mode: "step" | "block" | "run") => {
    setError(null);
    setIsExecuting(true);

    try {
      // Parse form values
      const codeHashBytes = bytes.BytesBlob.parseBlob(codeHash).raw;
      if (codeHashBytes.length !== 32) {
        throw new Error("Code hash must be exactly 32 bytes");
      }

      const serviceInfo = ServiceAccountInfo.create({
        codeHash: bytes.Bytes.fromBlob(codeHashBytes, 32) as CodeHash,
        balance: tryAsU64(BigInt(balance)),
        accumulateMinGas: tryAsServiceGas(BigInt(accumulateMinGas)),
        onTransferMinGas: tryAsServiceGas(BigInt(onTransferMinGas)),
        storageUtilisationBytes: tryAsU64(BigInt(storageBytes)),
        gratisStorage: tryAsU64(BigInt(gratisStorage)),
        storageUtilisationCount: tryAsU32(Number(storageCount)),
        created: tryAsTimeSlot(Number(created)),
        lastAccumulation: tryAsTimeSlot(Number(lastAccumulation)),
        parentService: tryAsServiceId(Number(parentService)),
      });

      const accounts: AccountsInfo = {
        getServiceInfo: () => serviceInfo,
      };

      const ctx = new HostCallContext(regs, currentState.gas);

      const currentServiceId = block.tryAsServiceId(0);
      const info = new Info(currentServiceId, accounts);
      await info.execute(ctx.mockGas, ctx.hostCallRegisters, ctx.hostCallMemory);

      const { modifiedRegs, finalGas, memoryEdits } = ctx.getResult();

      onResume(mode, modifiedRegs, finalGas, memoryEdits);
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : "Failed to execute info");
      setIsExecuting(false);
    }
  };

  return (
    <>
      <div className="space-y-4 overflow-y-auto flex-1 p-2">
        {/* Requested Service ID */}
        <div className="space-y-1">
          <label className="text-sm font-medium">Requested Service ID</label>
          <div className="p-2 bg-muted rounded-md font-mono text-sm">
            {requestedServiceId === 0xffffffffffffffffn ? "current" : requestedServiceId.toString()}
          </div>
        </div>

        <div className="text-sm font-medium border-b pb-2">Service Account Info</div>

        {/* Two column layout for form fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Code Hash */}
          <div className="space-y-1 md:col-span-2">
            <label className="text-xs font-medium text-muted-foreground">Code Hash (32 bytes hex)</label>
            <Input
              className="font-mono text-sm h-8"
              placeholder="0x..."
              value={codeHash}
              onChange={(e) => setCodeHash(e.target.value)}
              disabled={isLoading || isExecuting}
            />
          </div>

          {/* Balance */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Balance (a_b)</label>
            <Input
              className="font-mono text-sm h-8"
              type="number"
              value={balance}
              onChange={(e) => setBalance(e.target.value)}
              disabled={isLoading || isExecuting}
            />
          </div>

          {/* Accumulate Min Gas */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Accumulate Min Gas (a_g)</label>
            <Input
              className="font-mono text-sm h-8"
              type="number"
              value={accumulateMinGas}
              onChange={(e) => setAccumulateMinGas(e.target.value)}
              disabled={isLoading || isExecuting}
            />
          </div>

          {/* On Transfer Min Gas */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">On Transfer Min Gas (a_m)</label>
            <Input
              className="font-mono text-sm h-8"
              type="number"
              value={onTransferMinGas}
              onChange={(e) => setOnTransferMinGas(e.target.value)}
              disabled={isLoading || isExecuting}
            />
          </div>

          {/* Storage Bytes */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Storage Bytes (a_o)</label>
            <Input
              className="font-mono text-sm h-8"
              type="number"
              value={storageBytes}
              onChange={(e) => setStorageBytes(e.target.value)}
              disabled={isLoading || isExecuting}
            />
          </div>

          {/* Storage Count */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Storage Item Count (a_i)</label>
            <Input
              className="font-mono text-sm h-8"
              type="number"
              value={storageCount}
              onChange={(e) => setStorageCount(e.target.value)}
              disabled={isLoading || isExecuting}
            />
          </div>

          {/* Gratis Storage */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Gratis Storage (a_f)</label>
            <Input
              className="font-mono text-sm h-8"
              type="number"
              value={gratisStorage}
              onChange={(e) => setGratisStorage(e.target.value)}
              disabled={isLoading || isExecuting}
            />
          </div>

          {/* Created */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Created Timeslot (a_r)</label>
            <Input
              className="font-mono text-sm h-8"
              type="number"
              value={created}
              onChange={(e) => setCreated(e.target.value)}
              disabled={isLoading || isExecuting}
            />
          </div>

          {/* Last Accumulation */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Last Accumulation (a_a)</label>
            <Input
              className="font-mono text-sm h-8"
              type="number"
              value={lastAccumulation}
              onChange={(e) => setLastAccumulation(e.target.value)}
              disabled={isLoading || isExecuting}
            />
          </div>

          {/* Parent Service */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Parent Service (a_p)</label>
            <Input
              className="font-mono text-sm h-8"
              type="number"
              value={parentService}
              onChange={(e) => setParentService(e.target.value)}
              disabled={isLoading || isExecuting}
            />
          </div>
        </div>

        {/* Error */}
        {error && <div className="p-3 bg-destructive/10 text-destructive rounded-md text-sm">{error}</div>}
      </div>
      <HostCallActionButtons onResume={handleResume} disabled={isLoading || isExecuting} />
    </>
  );
};

export const InfoHostCall: HostCallHandler = {
  index: 5, // info host call index
  name: "info",
  hasCustomUI: true,
  Component: InfoHostCallComponent,
};
