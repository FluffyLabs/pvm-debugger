import { useState, useEffect } from "react";
import { HexDump } from "./HexDump";

interface MemoryRangeProps {
  address: number;
  getData: () => Uint8Array | undefined;
  isLoading: boolean;
  onExpand: () => void;
}

function formatPageAddress(addr: number): string {
  return "0x" + addr.toString(16).toUpperCase();
}

export function MemoryRange({ address, getData, isLoading, onExpand }: MemoryRangeProps) {
  const [expanded, setExpanded] = useState(false);

  const toggle = () => {
    const next = !expanded;
    setExpanded(next);
    if (next) {
      onExpand();
    }
  };

  // Re-fetch when expanded and data may be stale (expandPage handles staleness check)
  useEffect(() => {
    if (expanded) {
      onExpand();
    }
  }, [expanded, onExpand]);

  const data = getData();

  return (
    <div data-testid={`memory-range-${address}`} className="max-content">
      <button
        data-testid={`memory-range-header-${address}`}
        type="button"
        onClick={toggle}
        className="flex items-center gap-1 w-full px-2 py-1 text-xs font-mono text-foreground hover:bg-accent/50 cursor-pointer select-none border-b border-border"
      >
        <span className="text-muted-foreground">{expanded ? "▼" : "▶"}</span>
        <span>Page @ {formatPageAddress(address)}</span>
      </button>
      {expanded && (
        <div className="px-2 py-1 border-b border-border">
          {isLoading && !data && (
            <span className="text-xs text-muted-foreground">Loading…</span>
          )}
          {data && <HexDump data={data} baseAddress={address} />}
        </div>
      )}
    </div>
  );
}
