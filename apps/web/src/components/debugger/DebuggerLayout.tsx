import { useState, type ReactNode } from "react";
import "../../styles/debugger-layout.css";

type PanelName = "instructions" | "registers" | "memory";

const PANEL_LABELS: Record<PanelName, string> = {
  instructions: "Instructions",
  registers: "Registers",
  memory: "Memory",
};

interface DebuggerLayoutProps {
  toolbar: ReactNode;
  instructions: ReactNode;
  registers: ReactNode;
  memory: ReactNode;
  drawer?: ReactNode;
}

/**
 * 3-column debugger grid: toolbar row + [Instructions | Registers | Memory] + bottom drawer.
 * Each panel scrolls independently; the page itself does not scroll.
 *
 * Below 768px, collapses to a single-panel view with a tab switcher.
 */
export function DebuggerLayout({
  toolbar,
  instructions,
  registers,
  memory,
  drawer,
}: DebuggerLayoutProps) {
  const [activePanel, setActivePanel] = useState<PanelName>("instructions");

  return (
    <div data-testid="debugger-layout" className="debugger-shell">
      <div data-testid="debugger-toolbar" className="debugger-toolbar">
        {toolbar}
      </div>
      <div data-testid="panel-switcher" className="debugger-panel-switcher">
        {(Object.keys(PANEL_LABELS) as PanelName[]).map((key) => (
          <button
            key={key}
            data-testid={`panel-switcher-${key}`}
            data-active={activePanel === key}
            onClick={() => setActivePanel(key)}
          >
            {PANEL_LABELS[key]}
          </button>
        ))}
      </div>
      <div data-testid="debugger-panels" className="debugger-panels">
        <div
          data-testid="panel-instructions"
          className="debugger-panel"
          data-mobile-visible={activePanel === "instructions"}
        >
          {instructions}
        </div>
        <div
          data-testid="panel-registers"
          className="debugger-panel"
          data-mobile-visible={activePanel === "registers"}
        >
          {registers}
        </div>
        <div
          data-testid="panel-memory"
          className="debugger-panel"
          data-mobile-visible={activePanel === "memory"}
        >
          {memory}
        </div>
      </div>
      {drawer}
    </div>
  );
}
