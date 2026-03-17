import type { MachineStateSnapshot, PvmLifecycle } from "@pvmdbg/types";
import { StatusHeader } from "./StatusHeader";
import { RegisterRow } from "./RegisterRow";

interface RegistersPanelProps {
  snapshot: MachineStateSnapshot | null;
  lifecycle: PvmLifecycle | null;
}

const REGISTER_COUNT = 13;
const DEFAULT_REGISTERS = Array.from({ length: REGISTER_COUNT }, () => 0n);

export function RegistersPanel({ snapshot, lifecycle }: RegistersPanelProps) {
  const registers = snapshot?.registers ?? DEFAULT_REGISTERS;

  return (
    <div data-testid="registers-panel" className="flex flex-col h-full overflow-hidden">
      <div className="px-2 py-1 text-sm font-semibold text-foreground border-b border-border shrink-0">
        Registers
      </div>
      {snapshot && lifecycle ? (
        <StatusHeader snapshot={snapshot} lifecycle={lifecycle} />
      ) : (
        <div className="px-2 py-1.5 text-xs text-muted-foreground border-b border-border">
          No PVM loaded
        </div>
      )}
      <div data-testid="registers-scroll" className="flex-1 overflow-auto">
        {registers.map((value, i) => (
          <RegisterRow key={i} index={i} value={value} />
        ))}
      </div>
    </div>
  );
}
