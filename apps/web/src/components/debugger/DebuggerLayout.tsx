import type { ReactNode } from "react";
import "../../styles/debugger-layout.css";

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
 */
export function DebuggerLayout({
  toolbar,
  instructions,
  registers,
  memory,
  drawer,
}: DebuggerLayoutProps) {
  return (
    <div data-testid="debugger-layout" className="debugger-shell">
      <div data-testid="debugger-toolbar" className="debugger-toolbar">
        {toolbar}
      </div>
      <div data-testid="debugger-panels" className="debugger-panels">
        <div data-testid="panel-instructions" className="debugger-panel">
          {instructions}
        </div>
        <div data-testid="panel-registers" className="debugger-panel">
          {registers}
        </div>
        <div data-testid="panel-memory" className="debugger-panel">
          {memory}
        </div>
      </div>
      {drawer}
    </div>
  );
}
