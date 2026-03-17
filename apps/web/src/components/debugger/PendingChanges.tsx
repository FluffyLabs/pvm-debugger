import { useState, useEffect, useRef } from "react";
import type { HostCallResumeProposal } from "@pvmdbg/types";
import { formatRegister, formatGas, bytesToHex } from "./value-format";

interface PendingChangesProps {
  proposal: HostCallResumeProposal;
}

const DEBOUNCE_MS = 300;
const MAX_MEMORY_BYTES_PREVIEW = 16;

export function PendingChanges({ proposal }: PendingChangesProps) {
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounce visibility so short auto-continue pauses do not flash
  useEffect(() => {
    timerRef.current = setTimeout(() => setVisible(true), DEBOUNCE_MS);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      setVisible(false);
    };
  }, [proposal]);

  if (!visible) return null;

  const hasRegisterWrites = proposal.registerWrites.size > 0;
  const hasMemoryWrites = proposal.memoryWrites.length > 0;
  const hasGasChange = proposal.gasAfter !== undefined;

  if (!hasRegisterWrites && !hasMemoryWrites && !hasGasChange) return null;

  return (
    <div data-testid="pending-changes" className="px-2 py-1.5 border-b border-border bg-yellow-950/20">
      <div className="text-xs font-semibold text-yellow-400 mb-1">Pending Host Call Changes</div>
      {hasRegisterWrites && (
        <div data-testid="pending-register-writes" className="text-xs font-mono space-y-0.5 mb-1">
          {[...proposal.registerWrites.entries()].map(([regIdx, val]) => (
            <div key={regIdx} className="flex items-baseline gap-1">
              <span className="text-muted-foreground">ω{regIdx}:</span>
              <span className="text-yellow-300">{formatRegister(val).hex}</span>
            </div>
          ))}
        </div>
      )}
      {hasGasChange && (
        <div data-testid="pending-gas-change" className="text-xs font-mono mb-1">
          <span className="text-muted-foreground">Gas → </span>
          <span className="text-yellow-300">{formatGas(proposal.gasAfter!)}</span>
        </div>
      )}
      {hasMemoryWrites && (
        <div data-testid="pending-memory-writes" className="text-xs font-mono space-y-0.5">
          {proposal.memoryWrites.map((mw, i) => {
            const preview = mw.data.length > MAX_MEMORY_BYTES_PREVIEW
              ? bytesToHex(mw.data.slice(0, MAX_MEMORY_BYTES_PREVIEW)) + " …"
              : bytesToHex(mw.data);
            return (
              <div key={i} className="flex items-baseline gap-1">
                <span className="text-muted-foreground">
                  [0x{mw.address.toString(16)}]:
                </span>
                <span className="text-yellow-300 truncate">{preview}</span>
                <span className="text-muted-foreground">({mw.data.length}B)</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
