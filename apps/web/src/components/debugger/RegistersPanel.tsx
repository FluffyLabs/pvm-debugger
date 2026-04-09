import type { Orchestrator } from "@pvmdbg/orchestrator";
import type { MachineStateSnapshot, PvmLifecycle } from "@pvmdbg/types";
import { useCallback, useEffect, useMemo, useRef } from "react";
import type { UsePendingChanges } from "../../hooks/usePendingChanges";
import { PendingChanges } from "./PendingChanges";
import { type RegisterDivergence, RegisterRow } from "./RegisterRow";
import { StatusHeader } from "./StatusHeader";

/** Pre-computed stable keys for the 13 PVM registers to avoid array-index keys. */
const REGISTER_KEYS = Array.from({ length: 13 }, (_, i) => `reg-${i}`);

interface RegistersPanelProps {
  snapshot: MachineStateSnapshot | null;
  lifecycle: PvmLifecycle | null;
  orchestrator: Orchestrator | null;
  selectedPvmId: string | null;
  snapshots: Map<
    string,
    { snapshot: MachineStateSnapshot; lifecycle: PvmLifecycle }
  >;
  pendingChanges: UsePendingChanges;
}

const REGISTER_COUNT = 13;
const DEFAULT_REGISTERS = Array.from({ length: REGISTER_COUNT }, () => 0n);

export function RegistersPanel({
  snapshot,
  lifecycle,
  orchestrator,
  selectedPvmId,
  snapshots,
  pendingChanges,
}: RegistersPanelProps) {
  const registers = snapshot?.registers ?? DEFAULT_REGISTERS;

  // Editing is allowed when paused (including host-call pause) with non-terminal status
  const editable =
    (lifecycle === "paused" || lifecycle === "paused_host_call") &&
    (snapshot?.status === "ok" || snapshot?.status === "host") &&
    orchestrator !== null;

  const isHostCallPaused = lifecycle === "paused_host_call";

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

  const commitRegister = useCallback(
    (index: number, value: bigint) => {
      if (!orchestrator) return;

      // During host-call pause, also update pending changes
      if (isHostCallPaused) {
        pendingChanges.setRegister(index, value);
      }

      const pvmIds = orchestrator.getPvmIds();
      for (const pvmId of pvmIds) {
        orchestrator
          .setRegisters(pvmId, new Map([[index, value]]))
          .catch((err) => {
            console.error(`Failed to set register ${index} on ${pvmId}:`, err);
          });
      }
    },
    [orchestrator, isHostCallPaused, pendingChanges],
  );

  const commitPc = useCallback(
    (pc: number) => {
      if (!orchestrator) return;
      // PC editing goes directly to orchestrator (no pending changes field for PC)
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

      // During host-call pause, also update pending changes
      if (isHostCallPaused) {
        pendingChanges.setGas(gas);
      }

      const pvmIds = orchestrator.getPvmIds();
      for (const pvmId of pvmIds) {
        orchestrator.setGas(pvmId, gas).catch((err) => {
          console.error(`Failed to set gas on ${pvmId}:`, err);
        });
      }
    },
    [orchestrator, isHostCallPaused, pendingChanges],
  );

  return (
    <div
      data-testid="registers-panel"
      className="flex flex-col h-full overflow-hidden"
    >
      <div className="px-2 h-7 text-sm font-normal text-foreground border-b border-border shrink-0 flex items-center">
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
      <div
        data-testid="registers-scroll"
        className="flex-1 overflow-auto min-h-[4.5rem]"
      >
        {registers.map((value, regIndex) => (
          <RegisterRow
            key={REGISTER_KEYS[regIndex]}
            index={regIndex}
            value={value}
            editable={editable}
            changed={changedRegisters.has(regIndex)}
            divergences={divergenceMap.get(regIndex)}
            onCommit={commitRegister}
          />
        ))}
      </div>
      {pendingChanges.pending && (
        <PendingChanges pending={pendingChanges.pending} />
      )}
    </div>
  );
}
