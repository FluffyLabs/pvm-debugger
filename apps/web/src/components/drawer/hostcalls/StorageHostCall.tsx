import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import type { HostCallInfo } from "@pvmdbg/types";
import { toHex } from "@pvmdbg/types";
import type { UseStorageTable, StorageEntry } from "../../../hooks/useStorageTable";
import type { HostCallEffects } from "../../../lib/fetch-utils";
import { NONE, safeFromHex } from "../../../lib/fetch-utils";
import { useStableCallback } from "../../../hooks/useStableCallback";
import type { Orchestrator } from "@pvmdbg/orchestrator";

const HOST_CALL_LABELS: Record<number, string> = {
  3: "read",
  4: "write",
};

interface StorageHostCallProps {
  info: HostCallInfo;
  storageTable: UseStorageTable;
  orchestrator: Orchestrator | null;
  onEffectsReady: (effects: HostCallEffects) => void;
  traceVersion: number;
}

/** Service ID u64 max = "self". */
const SELF_SERVICE_ID = (1n << 64n) - 1n;

/** Build scoped key: "serviceId:keyHex". */
function scopedKey(serviceId: bigint, keyHex: string): string {
  const svcLabel = serviceId === SELF_SERVICE_ID ? "self" : serviceId.toString();
  return `${svcLabel}:${keyHex}`;
}

/** Try to decode hex bytes as printable ASCII string. */
function tryAscii(hex: string): string | null {
  const clean = hex.startsWith("0x") ? hex.slice(2) : hex;
  if (clean.length === 0 || clean.length % 2 !== 0) return null;
  const chars: string[] = [];
  for (let i = 0; i < clean.length; i += 2) {
    const byte = parseInt(clean.slice(i, i + 2), 16);
    if (byte < 0x20 || byte > 0x7e) return null; // not printable ASCII
    chars.push(String.fromCharCode(byte));
  }
  return chars.join("");
}

/** Hook: read key bytes from PVM memory. */
function useKeyFromMemory(
  orchestrator: Orchestrator | null,
  pvmId: string,
  keyPtr: number,
  keyLen: number,
): string | null {
  const [keyHex, setKeyHex] = useState<string | null>(null);

  useEffect(() => {
    if (!orchestrator || keyLen === 0) {
      setKeyHex(null);
      return;
    }
    let cancelled = false;
    orchestrator.getMemory(pvmId, keyPtr, keyLen).then((data) => {
      if (!cancelled) {
        setKeyHex(toHex(data));
      }
    }).catch(() => {
      if (!cancelled) setKeyHex(null);
    });
    return () => { cancelled = true; };
  }, [orchestrator, pvmId, keyPtr, keyLen]);

  return keyHex;
}

/** New entry form for adding key/value pairs to the storage table. */
function AddEntryForm({ onAdd }: { onAdd: (key: string, value: string) => void }) {
  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("");

  const handleAdd = useCallback(() => {
    const trimmedKey = newKey.trim();
    if (!trimmedKey) return;
    onAdd(trimmedKey, newValue.trim());
    setNewKey("");
    setNewValue("");
  }, [newKey, newValue, onAdd]);

  return (
    <div data-testid="storage-add-entry" className="flex items-center gap-2">
      <input
        data-testid="storage-new-key"
        className="flex-1 rounded border border-border bg-background px-2 py-1 text-xs font-mono text-foreground placeholder:text-muted-foreground"
        placeholder="Key (hex)"
        value={newKey}
        onChange={(e) => setNewKey(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); }}
      />
      <input
        data-testid="storage-new-value"
        className="flex-1 rounded border border-border bg-background px-2 py-1 text-xs font-mono text-foreground placeholder:text-muted-foreground"
        placeholder="Value (hex)"
        value={newValue}
        onChange={(e) => setNewValue(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); }}
      />
      <button
        data-testid="storage-add-button"
        className="cursor-pointer rounded bg-primary/20 px-2 py-1 text-xs font-medium text-primary hover:bg-primary/30"
        onClick={handleAdd}
      >
        Add
      </button>
    </div>
  );
}

/** Editable row in the storage table. */
function StorageRow({
  entry,
  isActive,
  onValueChange,
  onRemove,
}: {
  entry: StorageEntry;
  isActive: boolean;
  onValueChange: (key: string, value: string) => void;
  onRemove: (key: string) => void;
}) {
  return (
    <tr
      data-testid={`storage-row-${entry.key}`}
      className={isActive ? "bg-amber-400/10" : ""}
    >
      <td className="px-2 py-1 font-mono text-xs text-foreground break-all">
        {entry.key}
        {isActive && (
          <span data-testid="storage-active-indicator" className="ml-1 text-amber-400 text-[10px]">(active)</span>
        )}
      </td>
      <td className="px-2 py-1">
        <input
          data-testid={`storage-value-${entry.key}`}
          className="w-full rounded border border-border bg-background px-1 py-0.5 text-xs font-mono text-foreground"
          value={entry.value}
          onChange={(e) => onValueChange(entry.key, e.target.value)}
        />
      </td>
      <td className="px-1 py-1">
        <button
          data-testid={`storage-remove-${entry.key}`}
          className="cursor-pointer text-xs text-muted-foreground hover:text-destructive"
          onClick={() => onRemove(entry.key)}
          aria-label={`Remove ${entry.key}`}
        >
          ×
        </button>
      </td>
    </tr>
  );
}

/** The editable storage table component. */
function StorageTable({
  entries,
  activeKey,
  onValueChange,
  onRemove,
  onAdd,
}: {
  entries: StorageEntry[];
  activeKey: string | null;
  onValueChange: (key: string, value: string) => void;
  onRemove: (key: string) => void;
  onAdd: (key: string, value: string) => void;
}) {
  return (
    <div data-testid="storage-table" className="flex flex-col gap-2">
      <h4 className="text-sm font-semibold text-foreground">Storage Table</h4>
      {entries.length > 0 ? (
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="border-b border-border text-left text-muted-foreground">
              <th className="px-2 py-1 font-medium">Key</th>
              <th className="px-2 py-1 font-medium">Value</th>
              <th className="px-1 py-1 w-6" />
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <StorageRow
                key={entry.key}
                entry={entry}
                isActive={entry.key === activeKey}
                onValueChange={onValueChange}
                onRemove={onRemove}
              />
            ))}
          </tbody>
        </table>
      ) : (
        <p data-testid="storage-table-empty" className="text-xs text-muted-foreground italic">
          No storage entries yet.
        </p>
      )}
      <AddEntryForm onAdd={onAdd} />
    </div>
  );
}

export function StorageHostCall({ info, storageTable, orchestrator, onEffectsReady, traceVersion }: StorageHostCallProps) {
  const label = HOST_CALL_LABELS[info.hostCallIndex] ?? `unknown (${info.hostCallIndex})`;
  const isRead = info.hostCallIndex === 3;
  const regs = info.currentState.registers;

  // For read: ω7=serviceId, ω8=keyPtr, ω9=keyLen, ω10=dest, ω11=offset, ω12=maxLen
  const serviceId = regs[7] ?? 0n;
  const keyPtr = Number(regs[8] ?? 0n);
  const keyLen = Number(regs[9] ?? 0n);
  const destAddr = Number(regs[10] ?? 0n);
  const readOffset = Number(regs[11] ?? 0n);
  const readMaxLen = Number(regs[12] ?? 0n);

  // Read key bytes from memory
  const keyHex = useKeyFromMemory(orchestrator, info.pvmId, keyPtr, keyLen);
  const fullKey = keyHex ? scopedKey(serviceId, keyHex) : null;
  const asciiKey = keyHex ? tryAscii(keyHex) : null;

  // Seed trace data into storage table (once per mount/traceVersion)
  const seededRef = useRef(false);
  useEffect(() => {
    seededRef.current = false;
  }, [traceVersion]);

  useEffect(() => {
    if (seededRef.current || !isRead || !fullKey) return;
    // Seed from trace proposal if we have one
    const proposal = info.resumeProposal;
    if (proposal && proposal.memoryWrites.length > 0) {
      // Only seed if key doesn't already exist (don't overwrite user edits)
      if (!storageTable.store.get(fullKey)) {
        // The trace's memory write at destAddr is the sliced value; we need to reconstruct the full value.
        // The ω₇ return value from the proposal is the full value length.
        const fullLen = Number(proposal.registerWrites.get(7) ?? 0n);
        // For simplicity, seed the sliced portion — this is what the trace knows about.
        const mw = proposal.memoryWrites.find((w) => w.address === destAddr);
        if (mw) {
          storageTable.store.set(fullKey, toHex(mw.data));
        }
      }
    }
    seededRef.current = true;
  }, [isRead, fullKey, info.resumeProposal, destAddr, storageTable.store, traceVersion]);

  // Compute effects based on storage table state
  const stableOnEffects = useStableCallback(onEffectsReady);

  // Look up value from storage table
  const storedValue = fullKey ? storageTable.store.get(fullKey) : undefined;
  const keyFound = storedValue !== undefined;

  useEffect(() => {
    if (!isRead) {
      // Write host call — just report from proposal
      const proposal = info.resumeProposal;
      if (proposal) {
        stableOnEffects({
          registerWrites: new Map(proposal.registerWrites),
          memoryWrites: proposal.memoryWrites.map((mw) => ({ address: mw.address, data: new Uint8Array(mw.data) })),
          gasAfter: proposal.gasAfter,
        });
      } else {
        stableOnEffects({ registerWrites: new Map(), memoryWrites: [] });
      }
      return;
    }

    // Read host call
    if (!keyFound || !fullKey) {
      // Not found → return NONE
      stableOnEffects({
        registerWrites: new Map([[7, NONE]]),
        memoryWrites: [],
      });
      return;
    }

    // Found — slice value according to offset/maxLen
    const valueBytes = safeFromHex(storedValue!);
    const totalLen = valueBytes.length;
    const sliceStart = Math.min(readOffset, totalLen);
    const sliceEnd = Math.min(readOffset + readMaxLen, totalLen);
    const sliced = valueBytes.slice(sliceStart, sliceEnd);

    const effects: HostCallEffects = {
      registerWrites: new Map([[7, BigInt(totalLen)]]),
      memoryWrites: sliced.length > 0 ? [{ address: destAddr, data: sliced }] : [],
    };
    stableOnEffects(effects);
  }, [isRead, fullKey, keyFound, storedValue, readOffset, readMaxLen, destAddr, info.resumeProposal, stableOnEffects]);

  return (
    <div data-testid="storage-host-call" className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="flex flex-col gap-2 text-xs">
        <h4 className="text-sm font-semibold text-foreground">
          Storage: {label}
        </h4>

        {isRead && (
          <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 font-mono">
            <span className="text-muted-foreground">Service ID:</span>
            <span className="text-foreground">{serviceId === SELF_SERVICE_ID ? "self" : serviceId.toString()}</span>
            <span className="text-muted-foreground">Key ptr:</span>
            <span className="text-foreground">0x{keyPtr.toString(16)}</span>
            <span className="text-muted-foreground">Key len:</span>
            <span className="text-foreground">{keyLen}</span>
            {keyHex && (
              <>
                <span className="text-muted-foreground">Key:</span>
                <span className="text-foreground">
                  {keyHex}
                  {asciiKey && <span className="text-muted-foreground ml-1">&quot;{asciiKey}&quot;</span>}
                </span>
              </>
            )}
            <span className="text-muted-foreground">Offset:</span>
            <span className="text-foreground">{readOffset}</span>
            <span className="text-muted-foreground">Max len:</span>
            <span className="text-foreground">{readMaxLen}</span>
          </div>
        )}

        {/* Live status indicator */}
        {isRead && fullKey && (
          <div data-testid="storage-status" className="mt-1">
            {keyFound ? (
              <span className="text-green-400 text-xs">Key found in storage table</span>
            ) : (
              <span className="text-amber-400 text-xs">Key not found — will return NONE</span>
            )}
          </div>
        )}
      </div>

      <StorageTable
        entries={storageTable.entries}
        activeKey={fullKey}
        onValueChange={storageTable.setEntry}
        onRemove={storageTable.removeEntry}
        onAdd={storageTable.setEntry}
      />
    </div>
  );
}
