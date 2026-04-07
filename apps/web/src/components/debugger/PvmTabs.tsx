import type { MachineStateSnapshot, PvmLifecycle } from "@pvmdbg/types";
import { AVAILABLE_PVMS } from "../../lib/debugger-settings";
import { lifecycleLabel } from "./value-format";

interface PvmTabsProps {
  snapshots: Map<
    string,
    { snapshot: MachineStateSnapshot; lifecycle: PvmLifecycle }
  >;
  selectedPvmId: string | null;
  onSelect: (pvmId: string) => void;
  /** Concise divergence summary text (e.g. "PC, Gas, 2 registers"). */
  divergenceSummary?: string | null;
  /** Full per-field divergence details for tooltip. */
  divergenceDetails?: string | null;
  /** Per-PVM error messages from orchestrator error events. */
  perPvmErrors?: Map<string, string>;
  /** Set of currently active/loaded PVM ids. */
  activePvmIds?: Set<string>;
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

/** Format error text for inline display. */
function formatErrorText(
  lifecycle: PvmLifecycle,
  errorMsg?: string,
): string | null {
  if (lifecycle === "timed_out") return "Timeout";
  if (lifecycle === "failed") return `Error: ${errorMsg ?? "unknown"}`;
  return null;
}

/** Get lowercase display name for a PVM id. */
function pvmDisplayName(id: string): string {
  return id.toLowerCase();
}

/**
 * PVM tab bar for the debugger toolbar. Renders all known PVMs from AVAILABLE_PVMS:
 * active ones as clickable tab buttons, inactive ones as grayed-out spans.
 * Extra PVMs from snapshots (not in the known list) also render for backward compatibility.
 */
export function PvmTabs({
  snapshots,
  selectedPvmId,
  onSelect,
  divergenceSummary,
  divergenceDetails,
  perPvmErrors,
  activePvmIds,
}: PvmTabsProps) {
  const active = activePvmIds ?? new Set(snapshots.keys());

  // Build ordered PVM list: known PVMs first, then any extras from snapshots
  const knownIds = AVAILABLE_PVMS.map((p) => p.id);
  const extraIds = [...snapshots.keys()].filter((id) => !knownIds.includes(id));
  const allIds = [...knownIds, ...extraIds];

  // Collect inline error messages for failed/timed-out PVMs
  const errorEntries: Array<{ pvmId: string; text: string }> = [];
  for (const [pvmId, { lifecycle }] of snapshots) {
    const errorText = formatErrorText(lifecycle, perPvmErrors?.get(pvmId));
    if (errorText) {
      errorEntries.push({ pvmId, text: errorText });
    }
  }

  return (
    <div
      data-testid="pvm-tabs"
      className="flex items-center gap-1 ml-auto"
      role="tablist"
    >
      {allIds.map((pvmId) => {
        const entry = snapshots.get(pvmId);
        const isActive = active.has(pvmId);

        if (!isActive) {
          // Inactive/grayed-out PVM
          return (
            <span
              key={pvmId}
              data-testid={`pvm-tab-${pvmId}`}
              className="flex items-center gap-1.5 px-2 py-0.5 text-xs font-mono text-muted-foreground/40"
            >
              {pvmDisplayName(pvmId)}
            </span>
          );
        }

        const isSelected = pvmId === selectedPvmId;
        const lifecycle = entry?.lifecycle;
        const snapshot = entry?.snapshot;

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
            {lifecycle && (
              <span
                data-testid={`pvm-dot-${pvmId}`}
                className={`inline-block h-2 w-2 rounded-full ${dotColor(lifecycle)}`}
              />
            )}
            {pvmDisplayName(pvmId)}
            {lifecycle && snapshot && (
              <span data-testid={`pvm-status-${pvmId}`} className="sr-only">
                {lifecycleLabel(lifecycle, snapshot.status)}
              </span>
            )}
          </button>
        );
      })}

      {/* Inline error text for failed/timed-out PVMs */}
      {errorEntries.map(({ pvmId, text }) => (
        <span
          key={`error-${pvmId}`}
          data-testid={`pvm-error-${pvmId}`}
          className="text-xs text-red-500 font-mono"
        >
          {text}
        </span>
      ))}

      {/* Divergence summary with tooltip */}
      {divergenceSummary && (
        <span
          data-testid="divergence-summary"
          title={divergenceDetails ?? undefined}
          className="text-xs text-amber-500 font-mono cursor-help"
        >
          Divergence: {divergenceSummary}
        </span>
      )}
    </div>
  );
}
