import { useCallback, useRef, useEffect, useMemo } from "react";
import type { MachineStateSnapshot, PvmLifecycle, HostCallInfo } from "@pvmdbg/types";
import type { Orchestrator } from "@pvmdbg/orchestrator";
import { StatusHeader } from "./StatusHeader";
import { RegisterRow, type RegisterDivergence } from "./RegisterRow";
import { PendingChanges } from "./PendingChanges";

interface RegistersPanelProps {
  snapshot: MachineStateSnapshot | null;
  lifecycle: PvmLifecycle | null;
  orchestrator: Orchestrator | null;
  selectedPvmId: string | null;
  snapshots: Map<string, { snapshot: MachineStateSnapshot; lifecycle: PvmLifecycle }>;
  hostCallInfo: Map<string, HostCallInfo>;
}

const REGISTER_COUNT = 13;
const DEFAULT_REGISTERS = Array.from({ length: REGISTER_COUNT }, () => 0n);

export function RegistersPanel({ snapshot, lifecycle, orchestrator, selectedPvmId, snapshots, hostCallInfo }: RegistersPanelProps) {
  const registers = snapshot?.registers ?? DEFAULT_REGISTERS;

  // Editing is allowed only when paused with ok status
  const editable = lifecycle === "paused" && snapshot?.status === "ok" && orchestrator !== null;

  // --- Change tracking: compare against previous snapshot ---
  const prevSnapshotRef = useRef<MachineStateSnapshot | null>(null);
  const prevPvmIdRef = useRef<string | null>(null);

  // Reset comparison state synchronously during render when PVM changes.
  // This MUST happen before the useMemo calls below, otherwise switching
  // PVMs would compare the new PVM's snapshot against the old PVM's last
  // snapshot, producing spurious deltas for one frame.
  if (selectedPvmId !== prevPvmIdRef.current) {
    prevSnapshotRef.current = null;
    prevPvmIdRef.current = selectedPvmId;
  }

  // Compute changed indices by comparing current vs previous snapshot
  const changedRegisters = useMemo(() => {
    const prev = prevSnapshotRef.current;
    if (!prev || !snapshot) return new Set<number>();
    const changed = new Set<number>();
    for (let i = 0; i < REGISTER_COUNT; i++) {
      if ((snapshot.registers[i] ?? 0n) !== (prev.registers[i] ?? 0n)) {
        changed.add(i);
      }
    }
    return changed;
  }, [snapshot]);

  const pcChanged = useMemo(() => {
    const prev = prevSnapshotRef.current;
    if (!prev || !snapshot) return false;
    return snapshot.pc !== prev.pc;
  }, [snapshot]);

  const gasChanged = useMemo(() => {
    const prev = prevSnapshotRef.current;
    if (!prev || !snapshot) return false;
    return snapshot.gas !== prev.gas;
  }, [snapshot]);

  // After computing diffs, save current as previous for next comparison
  useEffect(() => {
    if (snapshot) {
      prevSnapshotRef.current = snapshot;
    }
  }, [snapshot]);

  // --- Multi-PVM divergence ---
  const divergenceMap = useMemo(() => {
    const result = new Map<number, RegisterDivergence[]>();
    if (!selectedPvmId || !snapshot || snapshots.size <= 1) return result;

    for (const [pvmId, entry] of snapshots) {
      if (pvmId === selectedPvmId) continue;
      const otherRegs = entry.snapshot.registers;
      for (let i = 0; i < REGISTER_COUNT; i++) {
        if ((otherRegs[i] ?? 0n) !== (registers[i] ?? 0n)) {
          let list = result.get(i);
          if (!list) {
            list = [];
            result.set(i, list);
          }
          list.push({ pvmId, value: otherRegs[i] ?? 0n });
        }
      }
    }
    return result;
  }, [selectedPvmId, snapshot, snapshots, registers]);

  // --- Pending host-call proposal ---
  const pendingProposal = useMemo(() => {
    if (hostCallInfo.size === 0) return null;
    // Prefer selected PVM's host call, fall back to first available
    const info = (selectedPvmId ? hostCallInfo.get(selectedPvmId) : undefined) ?? hostCallInfo.values().next().value;
    return info?.resumeProposal ?? null;
  }, [hostCallInfo, selectedPvmId]);

  const commitRegister = useCallback(
    (index: number, value: bigint) => {
      if (!orchestrator) return;
      const pvmIds = orchestrator.getPvmIds();
      for (const pvmId of pvmIds) {
        orchestrator.setRegisters(pvmId, new Map([[index, value]])).catch((err) => {
          console.error(`Failed to set register ${index} on ${pvmId}:`, err);
        });
      }
    },
    [orchestrator],
  );

  const commitPc = useCallback(
    (pc: number) => {
      if (!orchestrator) return;
      const pvmIds = orchestrator.getPvmIds();
      for (const pvmId of pvmIds) {
        orchestrator.setPc(pvmId, pc).catch((err) => {
          console.error(`Failed to set PC on ${pvmId}:`, err);
        });
      }
    },
    [orchestrator],
  );

  const commitGas = useCallback(
    (gas: bigint) => {
      if (!orchestrator) return;
      const pvmIds = orchestrator.getPvmIds();
      for (const pvmId of pvmIds) {
        orchestrator.setGas(pvmId, gas).catch((err) => {
          console.error(`Failed to set gas on ${pvmId}:`, err);
        });
      }
    },
    [orchestrator],
  );

  return (
    <div data-testid="registers-panel" className="flex flex-col h-full overflow-hidden">
      <div className="px-2 py-1 text-sm font-semibold text-foreground border-b border-border shrink-0">
        Registers
      </div>
      {snapshot && lifecycle ? (
        <StatusHeader
          snapshot={snapshot}
          lifecycle={lifecycle}
          editable={editable}
          pcChanged={pcChanged}
          gasChanged={gasChanged}
          onPcCommit={commitPc}
          onGasCommit={commitGas}
        />
      ) : (
        <div className="px-2 py-1.5 text-xs text-muted-foreground border-b border-border">
          No PVM loaded
        </div>
      )}
      {pendingProposal && <PendingChanges proposal={pendingProposal} />}
      <div data-testid="registers-scroll" className="flex-1 overflow-auto">
        {registers.map((value, i) => (
          <RegisterRow
            key={i}
            index={i}
            value={value}
            editable={editable}
            changed={changedRegisters.has(i)}
            divergences={divergenceMap.get(i)}
            onCommit={commitRegister}
          />
        ))}
      </div>
    </div>
  );
}
