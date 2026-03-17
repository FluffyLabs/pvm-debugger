import { useMemo } from "react";
import type { Orchestrator } from "@pvmdbg/orchestrator";
import type { PageMapEntry } from "@pvmdbg/types";
import { useMemoryReader } from "../../hooks/useMemoryReader";
import { MemoryRange } from "./MemoryRange";

const PAGE_SIZE = 4096;

interface MemoryPanelProps {
  orchestrator: Orchestrator | null;
  pvmId: string | null;
  pageMap: PageMapEntry[];
  /** Monotonic counter that increments on each snapshot change, used to invalidate cache. */
  snapshotVersion: number;
}

/** Expand page map segments into individual 4 KiB page addresses, sorted ascending. */
function expandPages(pageMap: PageMapEntry[]): number[] {
  const addresses: number[] = [];
  for (const entry of pageMap) {
    const pageCount = Math.ceil(entry.length / PAGE_SIZE);
    for (let i = 0; i < pageCount; i++) {
      addresses.push(entry.address + i * PAGE_SIZE);
    }
  }
  addresses.sort((a, b) => a - b);
  // Deduplicate (segments can overlap)
  return [...new Set(addresses)];
}

export function MemoryPanel({ orchestrator, pvmId, pageMap, snapshotVersion }: MemoryPanelProps) {
  const pages = useMemo(() => expandPages(pageMap), [pageMap]);
  const { getPage, isLoading, expandPage } = useMemoryReader(orchestrator, pvmId, snapshotVersion);

  if (pages.length === 0) {
    return (
      <div data-testid="memory-panel" className="flex flex-col h-full overflow-hidden">
        <div className="px-2 py-1 text-sm font-semibold text-foreground border-b border-border shrink-0">
          Memory
        </div>
        <div className="px-2 py-2 text-xs text-muted-foreground">No memory pages.</div>
      </div>
    );
  }

  return (
    <div data-testid="memory-panel" className="flex flex-col h-full overflow-hidden">
      <div className="px-2 py-1 text-sm font-semibold text-foreground border-b border-border shrink-0">
        Memory
      </div>
      <div className="flex-1 overflow-auto">
        {pages.map((addr) => (
          <MemoryRange
            key={addr}
            address={addr}
            getData={() => getPage(addr)}
            isLoading={isLoading(addr)}
            onExpand={() => expandPage(addr)}
          />
        ))}
      </div>
    </div>
  );
}
