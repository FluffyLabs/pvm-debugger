import type { Orchestrator } from "@pvmdbg/orchestrator";
import { getHostCallName } from "@pvmdbg/trace";
import type { HostCallInfo } from "@pvmdbg/types";
import { useCallback, useEffect, useRef, useState } from "react";
import type { UsePendingChanges } from "../../hooks/usePendingChanges";
import type { UseStorageTable } from "../../hooks/useStorageTable";
import type { HostCallEffects } from "../../lib/fetch-utils";
import { formatRegValue, NONE } from "../../lib/fetch-utils";
import { FetchHostCall } from "./hostcalls/FetchHostCall";
import { GasHostCall } from "./hostcalls/GasHostCall";
import { GenericHostCall } from "./hostcalls/GenericHostCall";
import { HOST_CALL_REGISTER_META } from "./hostcalls/host-call-registers";
import { LogHostCall } from "./hostcalls/LogHostCall";
import { StorageHostCall } from "./hostcalls/StorageHostCall";

export type { HostCallEffects } from "../../lib/fetch-utils";

/** Host call indices that support NONE toggle. */
const NONE_SUPPORTED = new Set([1, 2, 3, 5]); // fetch, lookup, read, info

interface HostCallTabProps {
  activeHostCall: HostCallInfo | null;
  orchestrator: Orchestrator | null;
  storageTable: UseStorageTable;
  pendingChanges: UsePendingChanges;
}

/** Sidebar showing badge, input registers, output preview, and memory write count. */
function Sidebar({
  info,
  outputValue,
  memoryWriteCount,
}: {
  info: HostCallInfo;
  outputValue: bigint | null;
  memoryWriteCount: number;
}) {
  const meta = HOST_CALL_REGISTER_META[info.hostCallIndex];
  const regs = info.currentState.registers;

  return (
    <div
      data-testid="host-call-sidebar"
      className="w-48 shrink-0 flex flex-col gap-2 border-r border-border px-3 py-2 overflow-y-auto"
    >
      {/* Header (badge + index) — preserves host-call-header testid for older E2E tests */}
      <div data-testid="host-call-header" className="flex flex-col gap-1">
        <span className="inline-block self-start rounded bg-accent px-1.5 py-0.5 text-[10px] font-semibold text-accent-foreground">
          {getHostCallName(info.hostCallIndex)}
        </span>
        <span className="font-mono text-[10px] text-muted-foreground">
          index {info.hostCallIndex} · PVM: {info.pvmId}
        </span>
      </div>

      {/* Input registers */}
      {meta && meta.inputs.length > 0 && (
        <div className="flex flex-col gap-0.5 text-xs font-mono">
          {meta.inputs.map((reg) => (
            <div key={reg.index} className="flex items-baseline gap-1">
              <span className="text-muted-foreground shrink-0">
                {reg.label}:
              </span>
              <span className="text-foreground truncate">
                {formatRegValue(regs[reg.index] ?? 0n, reg.format)}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Output preview */}
      {meta && outputValue !== null && (
        <div
          data-testid="output-preview"
          className="text-xs font-mono border-t border-border pt-1"
        >
          <span className="text-muted-foreground">ω₇ ← </span>
          <span className="text-foreground">
            {outputValue.toString()}
            {outputValue !== NONE && (
              <span className="text-muted-foreground ml-1">
                (0x{outputValue.toString(16)})
              </span>
            )}
          </span>
        </div>
      )}

      {/* Memory write count */}
      {memoryWriteCount > 0 && (
        <div
          data-testid="memory-write-count"
          className="text-xs text-muted-foreground"
        >
          + {memoryWriteCount} memory write(s)
        </div>
      )}
    </div>
  );
}

/** Sticky bottom bar. */
function StickyBar({
  noneSupported,
  noneChecked,
  onNoneToggle,
  userModified,
  hasProposal,
  onUseTraceData,
  error,
}: {
  noneSupported: boolean;
  noneChecked: boolean;
  onNoneToggle: (checked: boolean) => void;
  userModified: boolean;
  hasProposal: boolean;
  onUseTraceData: () => void;
  error: string | null;
}) {
  return (
    <div
      data-testid="host-call-sticky-bar"
      className="shrink-0 flex items-center gap-3 border-t border-border px-3 py-1.5 bg-muted/30"
    >
      {/* NONE toggle */}
      {noneSupported && (
        <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer select-none">
          <input
            data-testid="none-toggle"
            type="checkbox"
            checked={noneChecked}
            onChange={(e) => onNoneToggle(e.target.checked)}
            className="cursor-pointer"
          />
          NONE
        </label>
      )}

      {/* Use Trace Data button — only when trace data actually exists */}
      {userModified && hasProposal && (
        <button
          type="button"
          data-testid="use-trace-data"
          onClick={onUseTraceData}
          className="cursor-pointer rounded-full px-2.5 py-0.5 text-xs font-medium bg-amber-500/20 text-amber-300 hover:bg-amber-500/30"
        >
          Use Trace Data
        </button>
      )}

      <div className="flex-1" />

      {/* Status */}
      {error ? (
        <span data-testid="host-call-error" className="text-xs text-red-400">
          {error}
        </span>
      ) : (
        <span
          data-testid="auto-applied-text"
          className="text-xs text-muted-foreground"
        >
          Changes auto-applied
        </span>
      )}
    </div>
  );
}

function ContextualView({
  info,
  orchestrator,
  storageTable,
  onEffectsReady,
  traceVersion,
}: {
  info: HostCallInfo;
  orchestrator: Orchestrator | null;
  storageTable: UseStorageTable;
  onEffectsReady: (effects: HostCallEffects) => void;
  traceVersion: number;
}) {
  switch (info.hostCallIndex) {
    case 0:
      return <GasHostCall info={info} onEffectsReady={onEffectsReady} />;
    case 1:
      return (
        <FetchHostCall
          info={info}
          onEffectsReady={onEffectsReady}
          traceVersion={traceVersion}
        />
      );
    case 2:
      return (
        <GenericHostCall
          info={info}
          onEffectsReady={onEffectsReady}
          traceVersion={traceVersion}
        />
      );
    case 3:
    case 4:
      return (
        <StorageHostCall
          info={info}
          storageTable={storageTable}
          orchestrator={orchestrator}
          onEffectsReady={onEffectsReady}
          traceVersion={traceVersion}
        />
      );
    case 100:
      return <LogHostCall info={info} orchestrator={orchestrator} />;
    default:
      return (
        <GenericHostCall
          info={info}
          onEffectsReady={onEffectsReady}
          traceVersion={traceVersion}
        />
      );
  }
}

export function HostCallTab({
  activeHostCall,
  orchestrator,
  storageTable,
  pendingChanges,
}: HostCallTabProps) {
  const [noneChecked, setNoneChecked] = useState(false);
  const [userModified, setUserModified] = useState(false);
  const [traceVersion, setTraceVersion] = useState(0);
  const [lastEffects, setLastEffects] = useState<HostCallEffects | null>(null);
  const [error, setError] = useState<string | null>(null);
  const initialEffectsApplied = useRef(false);
  const appliedMemAddrsRef = useRef<Set<number>>(new Set());
  const prevHostCallRef = useRef<HostCallInfo | null>(null);

  // Reset state when active host call changes
  if (activeHostCall !== prevHostCallRef.current) {
    prevHostCallRef.current = activeHostCall;
    setNoneChecked(false);
    setUserModified(false);
    initialEffectsApplied.current = false;
    appliedMemAddrsRef.current = new Set();
    setLastEffects(null);
    setError(null);
  }

  const applyEffects = useCallback(
    (effects: HostCallEffects) => {
      // Apply register writes
      for (const [idx, val] of effects.registerWrites) {
        pendingChanges.setRegister(idx, val);
      }

      // Clean up stale memory writes
      const newAddrs = new Set(effects.memoryWrites.map((mw) => mw.address));
      for (const addr of appliedMemAddrsRef.current) {
        if (!newAddrs.has(addr)) {
          pendingChanges.removeMemoryWrite(addr);
        }
      }

      // Apply new memory writes
      for (const mw of effects.memoryWrites) {
        pendingChanges.writeMemory(mw.address, mw.data);
      }
      appliedMemAddrsRef.current = newAddrs;

      // Apply gas
      if (effects.gasAfter !== undefined) {
        pendingChanges.setGas(effects.gasAfter);
        if (orchestrator) {
          for (const pvmId of orchestrator.getPvmIds()) {
            orchestrator.setGas(pvmId, effects.gasAfter).catch(() => {});
          }
        }
      }
    },
    [pendingChanges, orchestrator],
  );

  const onEffectsReady = useCallback(
    (effects: HostCallEffects) => {
      setLastEffects(effects);
      setError(null);

      if (!initialEffectsApplied.current) {
        initialEffectsApplied.current = true;
      } else {
        setUserModified(true);
      }

      applyEffects(effects);
    },
    [applyEffects],
  );

  const handleNoneToggle = useCallback(
    (checked: boolean) => {
      setNoneChecked(checked);
      setUserModified(true);
      if (checked) {
        // NONE: ω₇ = 2^64-1, no memory writes, clean up previously applied mem writes
        for (const addr of appliedMemAddrsRef.current) {
          pendingChanges.removeMemoryWrite(addr);
        }
        appliedMemAddrsRef.current = new Set();
        pendingChanges.setRegister(7, NONE);
        setLastEffects({
          registerWrites: new Map([[7, NONE]]),
          memoryWrites: [],
        });
      }
    },
    [pendingChanges],
  );

  const handleUseTraceData = useCallback(() => {
    setTraceVersion((v) => v + 1);
    setUserModified(false);
    setNoneChecked(false);
    initialEffectsApplied.current = false;
  }, []);

  // For LogHostCall which doesn't report effects, use proposal directly
  useEffect(() => {
    if (!activeHostCall || activeHostCall.hostCallIndex !== 100) return;
    const proposal = activeHostCall.resumeProposal;
    if (proposal) {
      const effects: HostCallEffects = {
        registerWrites: new Map(proposal.registerWrites),
        memoryWrites: proposal.memoryWrites.map((mw) => ({
          address: mw.address,
          data: new Uint8Array(mw.data),
        })),
        gasAfter: proposal.gasAfter,
      };
      onEffectsReady(effects);
    }
  }, [activeHostCall, onEffectsReady]);

  if (!activeHostCall) {
    return (
      <div data-testid="host-call-tab" className="flex flex-col gap-2">
        <p
          data-testid="host-call-empty"
          className="text-xs text-muted-foreground italic"
        >
          No host call is currently active.
        </p>
      </div>
    );
  }

  const noneSupported = NONE_SUPPORTED.has(activeHostCall.hostCallIndex);
  const outputValue = noneChecked
    ? NONE
    : (lastEffects?.registerWrites.get(7) ?? null);
  const memoryWriteCount = noneChecked
    ? 0
    : (lastEffects?.memoryWrites.length ?? 0);

  // If NONE is checked, skip the handler editor
  const showHandler = !noneChecked;

  return (
    <div
      data-testid="host-call-tab"
      className="flex flex-col h-full min-h-0 -mx-3 -my-2"
    >
      <div className="flex flex-1 min-h-0">
        <Sidebar
          info={activeHostCall}
          outputValue={outputValue}
          memoryWriteCount={memoryWriteCount}
        />
        <div
          data-testid="host-call-content"
          className="flex-1 overflow-auto px-3 py-2"
        >
          {showHandler && (
            <ContextualView
              info={activeHostCall}
              orchestrator={orchestrator}
              storageTable={storageTable}
              onEffectsReady={onEffectsReady}
              traceVersion={traceVersion}
            />
          )}
          {noneChecked && (
            <p className="text-xs text-muted-foreground italic">
              NONE mode: returning ω₇ = 2⁶⁴−1 with no memory writes.
            </p>
          )}
          <p
            data-testid="host-call-hint"
            className="mt-2 text-[10px] text-muted-foreground"
          >
            Use Step, Run, or Next to continue execution.
          </p>
        </div>
      </div>
      <StickyBar
        noneSupported={noneSupported}
        noneChecked={noneChecked}
        onNoneToggle={handleNoneToggle}
        userModified={userModified}
        hasProposal={!!activeHostCall.resumeProposal}
        onUseTraceData={handleUseTraceData}
        error={error}
      />
    </div>
  );
}
