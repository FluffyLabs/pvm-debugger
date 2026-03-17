import { useCallback, useRef } from "react";
import { useDrawer, type DrawerTab } from "./DrawerContext";
import { SettingsTab } from "../drawer/SettingsTab";
import { HostCallTab } from "../drawer/HostCallTab";
import type { HostCallInfo, MachineStateSnapshot, PvmLifecycle } from "@pvmdbg/types";
import type { Orchestrator } from "@pvmdbg/orchestrator";
import type { UseStorageTable } from "../../hooks/useStorageTable";
import { useHostCallState } from "../../hooks/useHostCallState";

const TABS: { id: DrawerTab; label: string }[] = [
  { id: "settings", label: "Settings" },
  { id: "ecalli_trace", label: "Ecalli Trace" },
  { id: "host_call", label: "Host Call" },
  { id: "logs", label: "Logs" },
];

const TAB_BAR_HEIGHT = 36;
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
}

export function BottomDrawer({ onPvmChange, hostCallInfo, selectedPvmId, snapshots, orchestrator, storageTable }: BottomDrawerProps) {
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

      {/* Tab content area */}
      {isExpanded && (
        <div
          data-testid="drawer-content"
          className="flex-1 overflow-auto px-3 py-2 text-sm text-muted-foreground min-h-0"
        >
          {activeTab === "settings" && <SettingsTab onPvmChange={onPvmChange} />}
          {activeTab === "ecalli_trace" && <p>Ecalli Trace — coming soon</p>}
          {activeTab === "host_call" && <HostCallTab activeHostCall={activeHostCall} orchestrator={orchestrator} storageTable={storageTable} />}
          {activeTab === "logs" && <p>Logs — coming soon</p>}
        </div>
      )}

      {/* Tab bar */}
      <div
        data-testid="drawer-tab-bar"
        className="flex items-center gap-0.5 px-2 border-t border-border bg-muted/30"
        style={{ height: TAB_BAR_HEIGHT, flexShrink: 0 }}
      >
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            data-testid={`drawer-tab-${id}`}
            aria-label={label}
            onClick={() => handleTabClick(id)}
            className={`cursor-pointer px-3 py-1 text-xs font-medium rounded transition-colors ${
              activeTab === id
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
