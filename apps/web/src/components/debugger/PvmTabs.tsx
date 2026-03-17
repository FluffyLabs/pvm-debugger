import type { MachineStateSnapshot, PvmLifecycle } from "@pvmdbg/types";
import { lifecycleLabel } from "./value-format";

interface PvmTabsProps {
  snapshots: Map<string, { snapshot: MachineStateSnapshot; lifecycle: PvmLifecycle }>;
  selectedPvmId: string | null;
  onSelect: (pvmId: string) => void;
}

/** Compact lifecycle status dot color. */
function dotColor(lifecycle: PvmLifecycle): string {
  switch (lifecycle) {
    case "paused":
      return "bg-blue-500";
    case "running":
      return "bg-green-500";
    case "paused_host_call":
      return "bg-amber-500";
    case "terminated":
      return "bg-gray-500";
    case "failed":
    case "timed_out":
      return "bg-red-500";
  }
}

/**
 * PVM tab bar for the debugger toolbar. One tab per active PVM with a lifecycle
 * status dot. Clicking a tab switches the globally selected PVM.
 */
export function PvmTabs({ snapshots, selectedPvmId, onSelect }: PvmTabsProps) {
  const entries = [...snapshots.entries()];

  if (entries.length === 0) return null;

  return (
    <div data-testid="pvm-tabs" className="flex items-center gap-1" role="tablist">
      {entries.map(([pvmId, { lifecycle, snapshot }]) => {
        const isSelected = pvmId === selectedPvmId;
        return (
          <button
            key={pvmId}
            role="tab"
            aria-selected={isSelected}
            data-testid={`pvm-tab-${pvmId}`}
            onClick={() => onSelect(pvmId)}
            className={`flex items-center gap-1.5 rounded px-2 py-0.5 text-xs font-mono cursor-pointer transition-colors ${
              isSelected
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
            }`}
          >
            <span
              data-testid={`pvm-dot-${pvmId}`}
              className={`inline-block h-2 w-2 rounded-full ${dotColor(lifecycle)}`}
            />
            {pvmId}
            <span data-testid={`pvm-status-${pvmId}`} className="sr-only">
              {lifecycleLabel(lifecycle, snapshot.status)}
            </span>
          </button>
        );
      })}
    </div>
  );
}
