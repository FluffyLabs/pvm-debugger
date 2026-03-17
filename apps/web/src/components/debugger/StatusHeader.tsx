import type { PvmLifecycle, PvmStatus, MachineStateSnapshot } from "@pvmdbg/types";
import { formatPc, formatGas } from "./value-format";

interface StatusHeaderProps {
  snapshot: MachineStateSnapshot;
  lifecycle: PvmLifecycle;
}

interface StatusInfo {
  label: string;
  className: string;
}

function getStatusInfo(lifecycle: PvmLifecycle, status: PvmStatus): StatusInfo {
  switch (lifecycle) {
    case "running":
      return { label: "Running", className: "bg-blue-600 text-white" };
    case "paused":
      return status === "ok"
        ? { label: "OK", className: "bg-green-600 text-white" }
        : { label: status.toUpperCase(), className: "bg-gray-600 text-white" };
    case "paused_host_call":
      return { label: "Host Call", className: "bg-yellow-600 text-white" };
    case "terminated":
      switch (status) {
        case "halt":
          return { label: "Halt", className: "bg-green-700 text-white" };
        case "panic":
          return { label: "Panic", className: "bg-red-600 text-white" };
        case "fault":
          return { label: "Fault", className: "bg-red-600 text-white" };
        case "out_of_gas":
          return { label: "Out of Gas", className: "bg-amber-600 text-white" };
        default:
          return { label: "Terminated", className: "bg-gray-600 text-white" };
      }
    case "failed":
      return { label: "Error", className: "bg-red-700 text-white" };
    case "timed_out":
      return { label: "Timeout", className: "bg-amber-700 text-white" };
  }
}

export function StatusHeader({ snapshot, lifecycle }: StatusHeaderProps) {
  const statusInfo = getStatusInfo(lifecycle, snapshot.status);

  return (
    <div data-testid="status-header" className="flex flex-col gap-1.5 px-2 py-1.5 border-b border-border">
      <div className="flex items-center gap-2">
        <span
          data-testid="status-badge"
          className={`inline-flex items-center rounded px-1.5 py-0.5 text-xs font-semibold ${statusInfo.className}`}
        >
          {statusInfo.label}
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
