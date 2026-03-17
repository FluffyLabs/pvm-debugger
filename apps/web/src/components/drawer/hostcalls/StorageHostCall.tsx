import { useState, useCallback } from "react";
import type { HostCallInfo } from "@pvmdbg/types";
import type { UseStorageTable, StorageEntry } from "../../../hooks/useStorageTable";

const HOST_CALL_LABELS: Record<number, string> = {
  1: "fetch",
  2: "lookup",
  3: "read",
  4: "write",
};

interface StorageHostCallProps {
  info: HostCallInfo;
  storageTable: UseStorageTable;
}

/** Decode read host call registers into human-readable details. */
function decodeReadDetails(regs: bigint[]) {
  const serviceId = regs[7] ?? 0n;
  const keyPtr = Number(regs[8] ?? 0n);
  const keyLen = Number(regs[9] ?? 0n);
  return { serviceId, keyPtr, keyLen };
}

/** Decode write host call registers into human-readable details. */
function decodeWriteDetails(regs: bigint[]) {
  const keyPtr = Number(regs[7] ?? 0n);
  const keyLen = Number(regs[8] ?? 0n);
  const valPtr = Number(regs[9] ?? 0n);
  const valLen = Number(regs[10] ?? 0n);
  return { keyPtr, keyLen, valPtr, valLen };
}

/** Decode fetch host call registers. */
function decodeFetchDetails(regs: bigint[]) {
  return {
    r7: regs[7] ?? 0n,
    r8: regs[8] ?? 0n,
    r9: regs[9] ?? 0n,
    r10: regs[10] ?? 0n,
    r11: regs[11] ?? 0n,
  };
}

/** Decode lookup host call registers. */
function decodeLookupDetails(regs: bigint[]) {
  return {
    r7: regs[7] ?? 0n,
    r8: regs[8] ?? 0n,
    r9: regs[9] ?? 0n,
  };
}

/** Format bytes as a hex string with 0x prefix. */
function toHex(data: Uint8Array): string {
  return (
    "0x" +
    Array.from(data)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
  );
}

/** Try to extract the key hex from trace memory reads or register pointers. */
function deriveKeyHex(info: HostCallInfo): string | null {
  // For read/write, try to get key from memory reads in the resume proposal
  const proposal = info.resumeProposal;
  if (!proposal) return null;

  // The trace may include memory reads that represent the key data
  // For read (index 3): key is at ω8/ω9
  // For write (index 4): key is at ω7/ω8
  if (info.hostCallIndex === 3) {
    const keyPtr = Number(info.currentState.registers[8] ?? 0n);
    const keyLen = Number(info.currentState.registers[9] ?? 0n);
    // Look in memory writes for a read at keyPtr
    for (const mw of proposal.memoryWrites) {
      if (mw.address === keyPtr && mw.data.length >= keyLen) {
        return toHex(mw.data.slice(0, keyLen));
      }
    }
  } else if (info.hostCallIndex === 4) {
    const keyPtr = Number(info.currentState.registers[7] ?? 0n);
    const keyLen = Number(info.currentState.registers[8] ?? 0n);
    for (const mw of proposal.memoryWrites) {
      if (mw.address === keyPtr && mw.data.length >= keyLen) {
        return toHex(mw.data.slice(0, keyLen));
      }
    }
  }

  return null;
}

function ReadDetails({ info }: { info: HostCallInfo }) {
  const { serviceId, keyPtr, keyLen } = decodeReadDetails(info.currentState.registers);
  const keyHex = deriveKeyHex(info);

  return (
    <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 font-mono">
      <span className="text-muted-foreground">Service ID:</span>
      <span className="text-foreground">{serviceId.toString()}</span>
      <span className="text-muted-foreground">Key ptr:</span>
      <span className="text-foreground">0x{keyPtr.toString(16)}</span>
      <span className="text-muted-foreground">Key len:</span>
      <span className="text-foreground">{keyLen}</span>
      {keyHex && (
        <>
          <span className="text-muted-foreground">Key:</span>
          <span className="text-foreground">{keyHex}</span>
        </>
      )}
    </div>
  );
}

function WriteDetails({ info }: { info: HostCallInfo }) {
  const { keyPtr, keyLen, valPtr, valLen } = decodeWriteDetails(info.currentState.registers);
  const keyHex = deriveKeyHex(info);

  return (
    <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 font-mono">
      <span className="text-muted-foreground">Key ptr:</span>
      <span className="text-foreground">0x{keyPtr.toString(16)}</span>
      <span className="text-muted-foreground">Key len:</span>
      <span className="text-foreground">{keyLen}</span>
      <span className="text-muted-foreground">Value ptr:</span>
      <span className="text-foreground">0x{valPtr.toString(16)}</span>
      <span className="text-muted-foreground">Value len:</span>
      <span className="text-foreground">{valLen}</span>
      {keyHex && (
        <>
          <span className="text-muted-foreground">Key:</span>
          <span className="text-foreground">{keyHex}</span>
        </>
      )}
    </div>
  );
}

function FetchDetails({ info }: { info: HostCallInfo }) {
  const { r7, r8, r9, r10, r11 } = decodeFetchDetails(info.currentState.registers);
  return (
    <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 font-mono">
      <span className="text-muted-foreground">ω7:</span>
      <span className="text-foreground">{r7.toString()}</span>
      <span className="text-muted-foreground">ω8:</span>
      <span className="text-foreground">{r8.toString()}</span>
      <span className="text-muted-foreground">ω9:</span>
      <span className="text-foreground">{r9.toString()}</span>
      <span className="text-muted-foreground">ω10:</span>
      <span className="text-foreground">{r10.toString()}</span>
      <span className="text-muted-foreground">ω11:</span>
      <span className="text-foreground">{r11.toString()}</span>
    </div>
  );
}

function LookupDetails({ info }: { info: HostCallInfo }) {
  const { r7, r8, r9 } = decodeLookupDetails(info.currentState.registers);
  return (
    <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 font-mono">
      <span className="text-muted-foreground">ω7:</span>
      <span className="text-foreground">{r7.toString()}</span>
      <span className="text-muted-foreground">ω8:</span>
      <span className="text-foreground">{r8.toString()}</span>
      <span className="text-muted-foreground">ω9:</span>
      <span className="text-foreground">{r9.toString()}</span>
    </div>
  );
}

function HostCallDetails({ info }: { info: HostCallInfo }) {
  switch (info.hostCallIndex) {
    case 1:
      return <FetchDetails info={info} />;
    case 2:
      return <LookupDetails info={info} />;
    case 3:
      return <ReadDetails info={info} />;
    case 4:
      return <WriteDetails info={info} />;
    default:
      return null;
  }
}

function PendingEffects({ info }: { info: HostCallInfo }) {
  const proposal = info.resumeProposal;
  if (!proposal) return null;

  const hasRegs = proposal.registerWrites.size > 0;
  const hasMem = proposal.memoryWrites.length > 0;
  const hasGas = proposal.gasAfter !== undefined;

  if (!hasRegs && !hasMem && !hasGas) {
    return (
      <p className="text-muted-foreground text-xs italic">No pending effects from trace.</p>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <h4 className="text-sm font-semibold text-foreground">Pending Effects</h4>
      <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-0.5 font-mono text-xs">
        {[...proposal.registerWrites.entries()].map(([idx, val]) => (
          <div key={idx} className="contents">
            <span className="text-muted-foreground">ω{idx} ←:</span>
            <span className="text-amber-400">{val.toString()}</span>
          </div>
        ))}
        {hasMem && (
          <div className="contents">
            <span className="text-muted-foreground">Memory:</span>
            <span className="text-amber-400">{proposal.memoryWrites.length} write(s)</span>
          </div>
        )}
        {hasGas && (
          <div className="contents">
            <span className="text-muted-foreground">Gas after:</span>
            <span className="text-amber-400">{proposal.gasAfter!.toString()}</span>
          </div>
        )}
      </div>
    </div>
  );
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
        onKeyDown={(e) => {
          if (e.key === "Enter") handleAdd();
        }}
      />
      <input
        data-testid="storage-new-value"
        className="flex-1 rounded border border-border bg-background px-2 py-1 text-xs font-mono text-foreground placeholder:text-muted-foreground"
        placeholder="Value (hex)"
        value={newValue}
        onChange={(e) => setNewValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleAdd();
        }}
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
          <span
            data-testid="storage-active-indicator"
            className="ml-1 text-amber-400 text-[10px]"
          >
            (active)
          </span>
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

export function StorageHostCall({ info, storageTable }: StorageHostCallProps) {
  const label = HOST_CALL_LABELS[info.hostCallIndex] ?? `unknown (${info.hostCallIndex})`;
  const activeKey = deriveKeyHex(info);

  return (
    <div data-testid="storage-host-call" className="flex flex-col gap-2 text-xs">
      <h4 className="text-sm font-semibold text-foreground">
        Storage: {label}
      </h4>

      <HostCallDetails info={info} />

      <div className="border-t border-border my-1" />

      <PendingEffects info={info} />

      <div className="border-t border-border my-1" />

      <StorageTable
        entries={storageTable.entries}
        activeKey={activeKey}
        onValueChange={storageTable.setEntry}
        onRemove={storageTable.removeEntry}
        onAdd={storageTable.setEntry}
      />
    </div>
  );
}
