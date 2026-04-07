import { useEffect, useRef, useState } from "react";
import type { PendingChangesData } from "../../hooks/usePendingChanges";
import { bytesToHex, formatGas, formatRegister } from "./value-format";

interface PendingChangesProps {
  pending: PendingChangesData;
}

const DEBOUNCE_MS = 300;
const MAX_MEMORY_BYTES_PREVIEW = 16;

/** Coalesced memory write range for display. */
interface CoalescedRange {
  address: number;
  totalBytes: number;
  preview: string;
}

/**
 * Coalesce adjacent/overlapping memory writes into contiguous ranges.
 * Exported for unit testing.
 */
export function coalesceMemoryWrites(
  writes: Array<{ address: number; data: Uint8Array }>,
): CoalescedRange[] {
  if (writes.length === 0) return [];

  // Sort by address
  const sorted = [...writes].sort((a, b) => a.address - b.address);
  const ranges: CoalescedRange[] = [];

  let currentStart = sorted[0].address;
  let currentEnd = sorted[0].address + sorted[0].data.length;
  const chunks: Uint8Array[] = [sorted[0].data];

  for (let i = 1; i < sorted.length; i++) {
    const w = sorted[i];
    if (w.address <= currentEnd) {
      // Adjacent or overlapping — extend range
      const newEnd = w.address + w.data.length;
      if (newEnd > currentEnd) {
        currentEnd = newEnd;
      }
      chunks.push(w.data);
    } else {
      // Gap — emit current range and start a new one
      const totalBytes = currentEnd - currentStart;
      const merged = mergeChunks(chunks, totalBytes);
      ranges.push({
        address: currentStart,
        totalBytes,
        preview: formatPreview(merged),
      });
      currentStart = w.address;
      currentEnd = w.address + w.data.length;
      chunks.length = 0;
      chunks.push(w.data);
    }
  }

  // Emit last range
  const totalBytes = currentEnd - currentStart;
  const merged = mergeChunks(chunks, totalBytes);
  ranges.push({
    address: currentStart,
    totalBytes,
    preview: formatPreview(merged),
  });

  return ranges;
}

function mergeChunks(chunks: Uint8Array[], _totalBytes: number): Uint8Array {
  // For preview we only need the first few bytes
  const previewLen = Math.min(_totalBytes, MAX_MEMORY_BYTES_PREVIEW);
  const merged = new Uint8Array(previewLen);
  let offset = 0;
  for (const chunk of chunks) {
    const toCopy = Math.min(chunk.length, previewLen - offset);
    if (toCopy <= 0) break;
    merged.set(chunk.subarray(0, toCopy), offset);
    offset += toCopy;
  }
  return merged;
}

function formatPreview(data: Uint8Array): string {
  if (data.length > MAX_MEMORY_BYTES_PREVIEW) {
    return bytesToHex(data.slice(0, MAX_MEMORY_BYTES_PREVIEW)) + " \u2026";
  }
  return bytesToHex(data);
}

export function PendingChanges({ pending }: PendingChangesProps) {
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounce visibility on mount so short auto-continue pauses do not flash.
  useEffect(() => {
    timerRef.current = setTimeout(() => setVisible(true), DEBOUNCE_MS);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      setVisible(false);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!visible) return null;

  const hasRegisterWrites = pending.registerWrites.size > 0;
  const hasMemoryWrites = pending.memoryWrites.length > 0;
  const hasGasChange = pending.gasAfter !== undefined;

  if (!hasRegisterWrites && !hasMemoryWrites && !hasGasChange) return null;

  const coalescedWrites = hasMemoryWrites
    ? coalesceMemoryWrites(pending.memoryWrites)
    : [];

  return (
    <div data-testid="pending-changes" className="shrink-0 bg-amber-500/10">
      <div className="sticky top-0 px-2 py-1 text-xs font-normal text-foreground border-t border-b border-border bg-amber-500/10">
        Pending Host Call Changes
      </div>
      <div className="overflow-auto max-h-40">
        <div className="px-2 py-1.5 text-xs font-mono space-y-0.5">
          {hasRegisterWrites && (
            <div
              data-testid="pending-register-writes"
              className="space-y-0.5 min-h-[4.5rem]"
            >
              {[...pending.registerWrites.entries()].map(([regIdx, val]) => (
                <div key={regIdx} className="flex items-baseline gap-1">
                  <span className="text-amber-800 dark:text-amber-300">
                    {"\u03C9"}
                    {regIdx} {"\u2190"} {formatRegister(val).hex}
                  </span>
                </div>
              ))}
            </div>
          )}
          {hasGasChange && (
            <div data-testid="pending-gas-change">
              <span className="text-amber-800 dark:text-amber-300">
                Gas {"\u2190"} {formatGas(pending.gasAfter!)}
              </span>
            </div>
          )}
          {coalescedWrites.length > 0 && (
            <div data-testid="pending-memory-writes" className="space-y-0.5">
              {coalescedWrites.map((range, i) => (
                <div key={i} className="flex items-baseline gap-1">
                  <span className="text-amber-800 dark:text-amber-300">
                    [0x{range.address.toString(16)}] {"\u2190"} {range.preview}
                  </span>
                  <span className="text-muted-foreground">
                    ({range.totalBytes}B)
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
