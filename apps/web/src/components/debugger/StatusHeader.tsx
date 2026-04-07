import { WithTooltip } from "@fluffylabs/shared-ui";
import type {
  MachineStateSnapshot,
  PvmLifecycle,
  PvmStatus,
} from "@pvmdbg/types";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  formatGas,
  formatGasHex,
  formatPc,
  lifecycleLabel,
  parseBigintInput,
  parsePcInput,
} from "./value-format";

interface StatusHeaderProps {
  snapshot: MachineStateSnapshot;
  lifecycle: PvmLifecycle;
  editable: boolean;
  pcChanged?: boolean;
  gasChanged?: boolean;
  onPcCommit?: (pc: number) => void;
  onGasCommit?: (gas: bigint) => void;
}

function badgeClassName(lifecycle: PvmLifecycle, status: PvmStatus): string {
  switch (lifecycle) {
    case "running":
      return "bg-blue-600 text-white";
    case "paused":
      return "bg-green-600 text-white";
    case "paused_host_call":
      return "bg-yellow-600 text-white";
    case "terminated":
      return status === "halt"
        ? "bg-green-700 text-white"
        : status === "out_of_gas"
          ? "bg-amber-600 text-white"
          : "bg-red-600 text-white";
    case "failed":
      return "bg-red-700 text-white";
    case "timed_out":
      return "bg-amber-700 text-white";
  }
}

function InlineEdit({
  testId,
  displayValue,
  editable,
  changed,
  onCommit,
}: {
  testId: string;
  displayValue: string;
  editable: boolean;
  changed?: boolean;
  onCommit: (raw: string) => boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!editable && editing) {
      setEditing(false);
      setError(false);
    }
  }, [editable, editing]);

  const startEditing = useCallback(() => {
    if (!editable) return;
    setDraft(displayValue);
    setError(false);
    setEditing(true);
  }, [editable, displayValue]);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const commit = useCallback(() => {
    const ok = onCommit(draft);
    if (!ok) {
      setError(true);
      return;
    }
    setEditing(false);
    setError(false);
  }, [draft, onCommit]);

  const cancel = useCallback(() => {
    setEditing(false);
    setError(false);
  }, []);

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        commit();
      } else if (e.key === "Escape") {
        e.preventDefault();
        cancel();
      }
    },
    [commit, cancel],
  );

  if (editing) {
    return (
      <input
        ref={inputRef}
        data-testid={`${testId}-edit`}
        className={`bg-transparent border-b outline-none font-mono text-xs text-foreground w-24 ${error ? "border-red-500" : "border-primary"}`}
        style={{ minHeight: "1rem", lineHeight: "1rem", padding: 0 }}
        value={draft}
        onChange={(e) => {
          setDraft(e.target.value);
          setError(false);
        }}
        onKeyDown={onKeyDown}
        onBlur={commit}
      />
    );
  }

  return (
    <span
      data-testid={testId}
      className={`text-foreground ${editable ? "cursor-pointer hover:underline" : ""}`}
      style={
        changed ? { borderBottom: "1px solid var(--color-brand)" } : undefined
      }
      onClick={startEditing}
    >
      {displayValue}
    </span>
  );
}

export function StatusHeader({
  snapshot,
  lifecycle,
  editable,
  pcChanged,
  gasChanged,
  onPcCommit,
  onGasCommit,
}: StatusHeaderProps) {
  const label = lifecycleLabel(lifecycle, snapshot.status);
  const className = badgeClassName(lifecycle, snapshot.status);

  const handlePcCommit = useCallback(
    (raw: string) => {
      const parsed = parsePcInput(raw);
      if (parsed === null) return false;
      onPcCommit?.(parsed);
      return true;
    },
    [onPcCommit],
  );

  const handleGasCommit = useCallback(
    (raw: string) => {
      const parsed = parseBigintInput(raw);
      if (parsed === null) return false;
      onGasCommit?.(parsed);
      return true;
    },
    [onGasCommit],
  );

  const gasHex = formatGasHex(snapshot.gas);

  return (
    <div
      data-testid="status-header"
      className="flex items-center gap-4 px-2 py-1.5 border-b border-border"
    >
      <span
        data-testid="status-badge"
        className={`inline-flex items-center rounded px-1.5 py-0.5 text-xs font-semibold shrink-0 ${className}`}
      >
        {label}
      </span>
      <div className="flex items-center gap-4 font-mono text-xs">
        <div className="flex items-center gap-1" data-testid="pc-field">
          <span className="text-muted-foreground">PC:</span>
          <InlineEdit
            testId="pc-value"
            displayValue={`0x${formatPc(snapshot.pc)}`}
            editable={editable}
            changed={pcChanged}
            onCommit={handlePcCommit}
          />
          {pcChanged && (
            <span
              data-testid="pc-delta"
              className="font-semibold select-none"
              style={{ color: "var(--color-brand)" }}
            >
              ●
            </span>
          )}
        </div>
        <div className="flex items-center gap-1" data-testid="gas-field">
          <span className="text-muted-foreground">Gas:</span>
          <WithTooltip tooltip={gasHex}>
            <span data-testid="gas-hex-tooltip-trigger">
              <InlineEdit
                testId="gas-value"
                displayValue={formatGas(snapshot.gas)}
                editable={editable}
                changed={gasChanged}
                onCommit={handleGasCommit}
              />
            </span>
          </WithTooltip>
          {gasChanged && (
            <span
              data-testid="gas-delta"
              className="font-semibold select-none"
              style={{ color: "var(--color-brand)" }}
            >
              ●
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
