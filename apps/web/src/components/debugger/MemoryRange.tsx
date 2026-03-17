import { useState, useEffect } from "react";
import { HexDump } from "./HexDump";

interface MemoryRangeProps {
  address: number;
  label: string;
  isWritable: boolean;
  editable: boolean;
  getData: () => Uint8Array | undefined;
  isLoading: boolean;
  onExpand: () => void;
  onWriteBytes: (address: number, data: Uint8Array) => void;
}

export function MemoryRange({
  address,
  label,
  isWritable,
  editable,
  getData,
  isLoading,
  onExpand,
  onWriteBytes,
}: MemoryRangeProps) {
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
        <span data-testid={`memory-range-label-${address}`}>{label}</span>
        {!isWritable && (
          <span className="ml-1 text-muted-foreground text-[10px]">(RO)</span>
        )}
      </button>
      {expanded && (
        <div className="px-2 py-1 border-b border-border">
          {isLoading && !data && (
            <span className="text-xs text-muted-foreground">Loading…</span>
          )}
          {data && (
            <HexDump
              data={data}
              baseAddress={address}
              editable={editable}
              onWriteBytes={onWriteBytes}
            />
          )}
        </div>
      )}
    </div>
  );
}
