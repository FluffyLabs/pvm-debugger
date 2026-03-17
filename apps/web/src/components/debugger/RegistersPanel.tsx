import { useCallback } from "react";
import type { MachineStateSnapshot, PvmLifecycle } from "@pvmdbg/types";
import type { Orchestrator } from "@pvmdbg/orchestrator";
import { StatusHeader } from "./StatusHeader";
import { RegisterRow } from "./RegisterRow";

interface RegistersPanelProps {
  snapshot: MachineStateSnapshot | null;
  lifecycle: PvmLifecycle | null;
  orchestrator: Orchestrator | null;
}

const REGISTER_COUNT = 13;
const DEFAULT_REGISTERS = Array.from({ length: REGISTER_COUNT }, () => 0n);

export function RegistersPanel({ snapshot, lifecycle, orchestrator }: RegistersPanelProps) {
  const registers = snapshot?.registers ?? DEFAULT_REGISTERS;

  // Editing is allowed only when paused with ok status
  const editable = lifecycle === "paused" && snapshot?.status === "ok" && orchestrator !== null;

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
          onPcCommit={commitPc}
          onGasCommit={commitGas}
        />
      ) : (
        <div className="px-2 py-1.5 text-xs text-muted-foreground border-b border-border">
          No PVM loaded
        </div>
      )}
      <div data-testid="registers-scroll" className="flex-1 overflow-auto">
        {registers.map((value, i) => (
          <RegisterRow
            key={i}
            index={i}
            value={value}
            editable={editable}
            onCommit={commitRegister}
          />
        ))}
      </div>
    </div>
  );
}
