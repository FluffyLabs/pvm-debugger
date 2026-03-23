import { useState, useEffect, useRef } from "react";
import type { PendingChangesData } from "../../hooks/usePendingChanges";
import { formatRegister, formatGas, bytesToHex } from "./value-format";

interface PendingChangesProps {
  pending: PendingChangesData;
}

const DEBOUNCE_MS = 300;
const MAX_MEMORY_BYTES_PREVIEW = 16;

export function PendingChanges({ pending }: PendingChangesProps) {
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounce visibility on mount so short auto-continue pauses do not flash.
  // Keyed on mount/unmount only — user edits to pending content must not reset the timer.
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

  return (
    <div data-testid="pending-changes" className="shrink-0 bg-amber-500/10">
      <div className="px-2 py-1 text-xs font-normal text-foreground border-t border-b border-border">
        Pending Host Call Changes
      </div>
      <div className="px-2 py-1.5 text-xs font-mono space-y-0.5">
        {hasRegisterWrites && (
          <div data-testid="pending-register-writes" className="space-y-0.5">
            {[...pending.registerWrites.entries()].map(([regIdx, val]) => (
              <div key={regIdx} className="flex items-baseline gap-1">
                <span className="text-amber-800 dark:text-amber-300">{"\u03C9"}{regIdx} {"\u2190"} {formatRegister(val).hex}</span>
              </div>
            ))}
          </div>
        )}
        {hasGasChange && (
          <div data-testid="pending-gas-change">
            <span className="text-amber-800 dark:text-amber-300">Gas {"\u2190"} {formatGas(pending.gasAfter!)}</span>
          </div>
        )}
        {hasMemoryWrites && (
          <div data-testid="pending-memory-writes" className="space-y-0.5">
            {pending.memoryWrites.map((mw, i) => {
              const preview = mw.data.length > MAX_MEMORY_BYTES_PREVIEW
                ? bytesToHex(mw.data.slice(0, MAX_MEMORY_BYTES_PREVIEW)) + " \u2026"
                : bytesToHex(mw.data);
              return (
                <div key={i} className="flex items-baseline gap-1">
                  <span className="text-amber-800 dark:text-amber-300">
                    [0x{mw.address.toString(16)}] {"\u2190"} {preview}
                  </span>
                  <span className="text-muted-foreground">({mw.data.length}B)</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
