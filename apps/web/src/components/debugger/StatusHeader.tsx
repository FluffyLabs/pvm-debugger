import type { PvmLifecycle, PvmStatus, MachineStateSnapshot } from "@pvmdbg/types";
import { formatPc, formatGas, lifecycleLabel } from "./value-format";

interface StatusHeaderProps {
  snapshot: MachineStateSnapshot;
  lifecycle: PvmLifecycle;
}

function badgeClassName(lifecycle: PvmLifecycle, status: PvmStatus): string {
  switch (lifecycle) {
    case "running":
      return "bg-blue-600 text-white";
    case "paused":
      return "bg-green-600 text-white";
    case "paused_host_call":
      return "bg-yellow-600 text-white";
    case "terminated":
      return status === "halt"
        ? "bg-green-700 text-white"
        : status === "out_of_gas"
          ? "bg-amber-600 text-white"
          : "bg-red-600 text-white";
    case "failed":
      return "bg-red-700 text-white";
    case "timed_out":
      return "bg-amber-700 text-white";
  }
}

export function StatusHeader({ snapshot, lifecycle }: StatusHeaderProps) {
  const label = lifecycleLabel(lifecycle, snapshot.status);
  const className = badgeClassName(lifecycle, snapshot.status);

  return (
    <div data-testid="status-header" className="flex flex-col gap-1.5 px-2 py-1.5 border-b border-border">
      <div className="flex items-center gap-2">
        <span
          data-testid="status-badge"
          className={`inline-flex items-center rounded px-1.5 py-0.5 text-xs font-semibold ${className}`}
        >
          {label}
        </span>
      </div>
      <div className="flex items-center gap-4 font-mono text-xs">
        <div className="flex items-center gap-1">
          <span className="text-muted-foreground">PC:</span>
          <span data-testid="pc-value" className="text-foreground">
            0x{formatPc(snapshot.pc)}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-muted-foreground">Gas:</span>
          <span data-testid="gas-value" className="text-foreground">
            {formatGas(snapshot.gas)}
          </span>
        </div>
      </div>
    </div>
  );
}
