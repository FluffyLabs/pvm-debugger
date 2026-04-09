import type { Orchestrator } from "@pvmdbg/orchestrator";
import type { MemoryChunk, PageMapEntry } from "@pvmdbg/types";
import { useCallback, useMemo } from "react";
import { useMemoryReader } from "../../hooks/useMemoryReader";
import { MemoryRange } from "./MemoryRange";

const PAGE_SIZE = 4096;

interface MemoryPanelProps {
  orchestrator: Orchestrator | null;
  pvmId: string | null;
  pageMap: PageMapEntry[];
  /** Monotonic counter that increments on each snapshot change, used to invalidate cache. */
  snapshotVersion: number;
  programKind: "generic" | "jam_spi";
  memoryChunks: MemoryChunk[];
  /** True when all active PVMs are paused with ok status. */
  editable: boolean;
  /** Optional callback to record memory writes in pending changes during host-call pause. */
  onPendingWrite?: (address: number, data: Uint8Array) => void;
}

export interface ExpandedPage {
  address: number;
  isWritable: boolean;
}

/** Expand page map segments into individual 4 KiB pages with writable info, sorted ascending. */
export function expandPages(pageMap: PageMapEntry[]): ExpandedPage[] {
  const pageMap_ = new Map<number, boolean>();
  for (const entry of pageMap) {
    const pageCount = Math.ceil(entry.length / PAGE_SIZE);
    for (let i = 0; i < pageCount; i++) {
      const addr = entry.address + i * PAGE_SIZE;
      // If any segment marks this page writable, it's writable
      pageMap_.set(addr, pageMap_.get(addr) || entry.isWritable);
    }
  }
  return [...pageMap_.entries()]
    .sort(([a], [b]) => a - b)
    .map(([address, isWritable]) => ({ address, isWritable }));
}

/** Compute the set of page addresses that overlap with any memory chunk (initialized data). */
export function computeInitializedPages(
  memoryChunks: MemoryChunk[],
): Set<number> {
  const pages = new Set<number>();
  for (const chunk of memoryChunks) {
    const start = chunk.address;
    const end = start + chunk.data.length;
    // Find all page-aligned addresses that overlap [start, end)
    const firstPage = Math.floor(start / PAGE_SIZE) * PAGE_SIZE;
    for (let addr = firstPage; addr < end; addr += PAGE_SIZE) {
      pages.add(addr);
    }
  }
  return pages;
}

/** Get an SPI-aware label for a memory page, or a generic fallback. */
export function getPageLabel(
  address: number,
  isWritable: boolean,
  programKind: "generic" | "jam_spi",
  initializedPages: Set<number>,
): string {
  if (programKind !== "jam_spi") {
    return `Page @ 0x${address.toString(16).toUpperCase()}`;
  }

  if (address >= 0xfeff0000) return "Arguments";
  if (address >= 0xfefc0000 && address < 0xfeff0000) return "Stack";
  if (!isWritable && address >= 0x00010000) return "RO Data";
  if (isWritable && initializedPages.has(address)) return "RW Data";
  if (isWritable) return "Heap";

  return `Page @ 0x${address.toString(16).toUpperCase()}`;
}

export function MemoryPanel({
  orchestrator,
  pvmId,
  pageMap,
  snapshotVersion,
  programKind,
  memoryChunks,
  editable,
  onPendingWrite,
}: MemoryPanelProps) {
  const pages = useMemo(() => expandPages(pageMap), [pageMap]);
  const initializedPages = useMemo(
    () => computeInitializedPages(memoryChunks),
    [memoryChunks],
  );
  const { getPage, isLoading, expandPage, getChangedOffsets } = useMemoryReader(
    orchestrator,
    pvmId,
    snapshotVersion,
  );

  const onWriteBytes = useCallback(
    (address: number, data: Uint8Array) => {
      if (!orchestrator) return;

      // Also record in pending changes during host-call pause
      if (onPendingWrite) {
        onPendingWrite(address, data);
      }

      const pvmIds = orchestrator.getPvmIds();
      for (const id of pvmIds) {
        orchestrator.setMemory(id, address, data).catch((err) => {
          console.error(
            `Failed to write memory at 0x${address.toString(16)} on ${id}:`,
            err,
          );
        });
      }
    },
    [orchestrator, onPendingWrite],
  );

  if (pages.length === 0) {
    return (
      <div
        data-testid="memory-panel"
        className="flex flex-col h-full overflow-hidden"
      >
        <div className="px-2 h-7 text-sm font-normal text-foreground border-b border-border shrink-0 flex items-center">
          Memory
        </div>
        <div className="px-2 py-2 text-xs text-muted-foreground">
          No memory pages.
        </div>
      </div>
    );
  }

  return (
    <div
      data-testid="memory-panel"
      className="flex flex-col h-full overflow-hidden"
    >
      <div className="px-2 h-7 text-sm font-normal text-foreground border-b border-border shrink-0 flex items-center">
        Memory
      </div>
      <div className="flex-1 overflow-auto">
        {pages.map((pg) => (
          <MemoryRange
            key={pg.address}
            address={pg.address}
            label={getPageLabel(
              pg.address,
              pg.isWritable,
              programKind,
              initializedPages,
            )}
            isWritable={pg.isWritable}
            editable={editable && pg.isWritable}
            getData={() => getPage(pg.address)}
            isLoading={isLoading(pg.address)}
            onExpand={() => expandPage(pg.address)}
            onWriteBytes={onWriteBytes}
            changedOffsets={getChangedOffsets(pg.address)}
          />
        ))}
      </div>
    </div>
  );
}
