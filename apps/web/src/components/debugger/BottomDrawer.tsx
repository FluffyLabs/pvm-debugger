import { useCallback, useRef } from "react";
import { useDrawer, type DrawerTab } from "./DrawerContext";
import { SettingsTab } from "../drawer/SettingsTab";
import { HostCallTab } from "../drawer/HostCallTab";
import { EcalliTraceTab } from "../drawer/EcalliTraceTab";
import { LogsTab } from "../drawer/LogsTab";
import type { HostCallInfo, MachineStateSnapshot, PvmLifecycle } from "@pvmdbg/types";
import type { Orchestrator } from "@pvmdbg/orchestrator";
import type { UseStorageTable } from "../../hooks/useStorageTable";
import type { UsePendingChanges } from "../../hooks/usePendingChanges";
import { useHostCallState } from "../../hooks/useHostCallState";

const TABS: { id: DrawerTab; label: string }[] = [
  { id: "settings", label: "Settings" },
  { id: "ecalli_trace", label: "Ecalli Trace" },
  { id: "host_call", label: "Host Call" },
  { id: "logs", label: "Logs" },
];

const TAB_BAR_HEIGHT = 28;
const MIN_EXPANDED_HEIGHT = 80;

function clampHeight(h: number, maxHeight: number): number {
  return Math.max(MIN_EXPANDED_HEIGHT, Math.min(h, maxHeight));
}

interface BottomDrawerProps {
  onPvmChange: (ids: string[]) => void;
  hostCallInfo: Map<string, HostCallInfo>;
  selectedPvmId: string | null;
  snapshots: Map<string, { snapshot: MachineStateSnapshot; lifecycle: PvmLifecycle }>;
  orchestrator: Orchestrator | null;
  storageTable: UseStorageTable;
  pendingChanges: UsePendingChanges;
  snapshotVersion: number;
}

export function BottomDrawer({ onPvmChange, hostCallInfo, selectedPvmId, snapshots, orchestrator, storageTable, pendingChanges, snapshotVersion }: BottomDrawerProps) {
  const { activeTab, height, setActiveTab, setHeight } = useDrawer();
  const { activeHostCall } = useHostCallState(hostCallInfo, selectedPvmId, snapshots);
  const dragRef = useRef<{ startY: number; startH: number } | null>(null);

  const isExpanded = activeTab !== null;

  const handleTabClick = useCallback(
    (tab: DrawerTab) => {
      if (activeTab === tab) {
        setActiveTab(null);
      } else {
        setActiveTab(tab);
      }
    },
    [activeTab, setActiveTab],
  );

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      dragRef.current = { startY: e.clientY, startH: height };
      const target = e.currentTarget as HTMLElement;
      target.setPointerCapture(e.pointerId);
    },
    [height],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragRef.current) return;
      const delta = dragRef.current.startY - e.clientY;
      const maxHeight = Math.floor(window.innerHeight * 0.6);
      const newHeight = clampHeight(dragRef.current.startH + delta, maxHeight);
      setHeight(newHeight);
    },
    [setHeight],
  );

  const onPointerUp = useCallback(() => {
    dragRef.current = null;
  }, []);

  const totalHeight = isExpanded ? height + TAB_BAR_HEIGHT : TAB_BAR_HEIGHT;

  return (
    <div
      data-testid="bottom-drawer"
      className="flex flex-col border-t border-border bg-background"
      style={{ height: totalHeight, minHeight: TAB_BAR_HEIGHT, flexShrink: 0 }}
    >
      {/* Drag handle */}
      {isExpanded && (
        <div
          data-testid="drawer-drag-handle"
          className="h-1.5 cursor-row-resize flex items-center justify-center hover:bg-accent/50"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <div className="w-10 h-0.5 rounded bg-muted-foreground/40" />
        </div>
      )}

      {/* Tab bar */}
      <div
        data-testid="drawer-tab-bar"
        className="flex items-center gap-0.5 px-2 border-b border-border bg-muted/30"
        style={{ height: TAB_BAR_HEIGHT, flexShrink: 0 }}
      >
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            data-testid={`drawer-tab-${id}`}
            aria-label={label}
            onClick={() => handleTabClick(id)}
            className={`cursor-pointer px-3 py-0.5 text-xs font-medium transition-colors border-b-2 ${
              activeTab === id
                ? "text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground hover:bg-accent/50"
            }`}
            style={activeTab === id ? { borderBottomColor: "var(--color-brand)" } : undefined}
          >
            {label}
          </button>
        ))}
        {isExpanded && (
          <button
            data-testid="drawer-close-button"
            aria-label="Close drawer"
            onClick={() => setActiveTab(null)}
            className="ml-auto p-0.5 flex items-center text-muted-foreground hover:text-foreground cursor-pointer"
          >
            <svg width="10" height="10" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="2" y1="2" x2="12" y2="12" />
              <line x1="12" y1="2" x2="2" y2="12" />
            </svg>
          </button>
        )}
      </div>

      {/* Tab content area */}
      {isExpanded && (
        <div
          data-testid="drawer-content"
          className="flex-1 overflow-auto px-3 py-2 text-sm text-muted-foreground min-h-0"
        >
          {activeTab === "settings" && <SettingsTab onPvmChange={onPvmChange} />}
          {activeTab === "ecalli_trace" && <EcalliTraceTab orchestrator={orchestrator} selectedPvmId={selectedPvmId} snapshotVersion={snapshotVersion} activeHostCall={activeHostCall} />}
          {activeTab === "host_call" && <HostCallTab activeHostCall={activeHostCall} orchestrator={orchestrator} storageTable={storageTable} pendingChanges={pendingChanges} />}
          {activeTab === "logs" && <LogsTab orchestrator={orchestrator} selectedPvmId={selectedPvmId} snapshotVersion={snapshotVersion} />}
        </div>
      )}
    </div>
  );
}
