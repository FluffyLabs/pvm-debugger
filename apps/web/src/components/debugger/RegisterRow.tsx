import { useState, useRef, useEffect, useCallback } from "react";
import { Popover, PopoverTrigger, PopoverContent } from "@fluffylabs/shared-ui";
import { formatRegister, parseBigintInput } from "./value-format";

export interface RegisterDivergence {
  pvmId: string;
  value: bigint;
}

interface RegisterRowProps {
  index: number;
  value: bigint;
  editable: boolean;
  changed?: boolean;
  divergences?: RegisterDivergence[];
  onCommit?: (index: number, value: bigint) => void;
}

export function RegisterRow({ index, value, editable, changed, divergences, onCommit }: RegisterRowProps) {
  const { hex, decimal } = formatRegister(value);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [flash, setFlash] = useState(false);
  const prevChangedRef = useRef(false);

  // Trigger flash animation when `changed` transitions from false to true
  useEffect(() => {
    if (changed && !prevChangedRef.current) {
      setFlash(true);
      const timer = setTimeout(() => setFlash(false), 600);
      return () => clearTimeout(timer);
    }
    if (!changed) {
      setFlash(false);
    }
    prevChangedRef.current = !!changed;
  }, [changed]);

  // Cancel editing if editable becomes false (e.g. execution starts)
  useEffect(() => {
    if (!editable && editing) {
      setEditing(false);
      setError(false);
    }
  }, [editable, editing]);

  const startEditing = useCallback(() => {
    if (!editable) return;
    setDraft(hex);
    setError(false);
    setEditing(true);
  }, [editable, hex]);

  // Focus the input once editing starts
  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const commit = useCallback(() => {
    const parsed = parseBigintInput(draft);
    if (parsed === null) {
      setError(true);
      return;
    }
    setEditing(false);
    setError(false);
    onCommit?.(index, parsed);
  }, [draft, index, onCommit]);

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

  const hasDivergence = divergences && divergences.length > 0;

  const isZero = value === 0n;

  return (
    <div
      data-testid={`register-row-${index}`}
      className={`flex items-baseline gap-2 px-2 py-0.5 font-mono text-xs hover:bg-muted/50 ${flash ? "register-flash" : ""} ${isZero && !changed ? "opacity-40" : ""}`}
      style={{ minHeight: "1.5rem" }}
    >
      <span data-testid={`register-label-${index}`} className="text-muted-foreground w-8 shrink-0 select-none">
        ω{index}:
      </span>
      {editing ? (
        <input
          ref={inputRef}
          data-testid={`register-edit-${index}`}
          className={`flex-1 bg-transparent border-b outline-none font-mono text-xs text-foreground ${error ? "border-red-500" : ""}`}
          style={{ borderColor: error ? undefined : "var(--color-brand)", minHeight: "1.25rem", lineHeight: "1.25rem", padding: 0 }}
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            setError(false);
          }}
          onKeyDown={onKeyDown}
          onBlur={commit}
        />
      ) : (
        <>
          <span
            data-testid={`register-hex-${index}`}
            className={`text-foreground ${editable ? "cursor-pointer hover:underline" : ""}`}
            onClick={startEditing}
          >
            {hex}
          </span>
          <span data-testid={`register-decimal-${index}`} className="text-muted-foreground">
            ({decimal})
          </span>
          {changed && (
            <span
              data-testid={`register-delta-${index}`}
              className="font-semibold shrink-0 select-none"
              style={{ color: "var(--color-brand)" }}
              title="Changed"
            >
              ●
            </span>
          )}
          {hasDivergence && (
            <Popover>
              <PopoverTrigger asChild>
                <span
                  data-testid={`register-divergence-${index}`}
                  className="text-amber-500 cursor-pointer shrink-0 select-none"
                  title="Divergence detected"
                >
                  ⚠
                </span>
              </PopoverTrigger>
              <PopoverContent side="right" align="start" size="small">
                <div className="text-xs font-mono space-y-1" data-testid={`register-divergence-popover-${index}`}>
                  <div className="font-semibold text-amber-400 mb-1">Divergence</div>
                  {divergences.map((d) => (
                    <div key={d.pvmId}>
                      <span className="text-muted-foreground">{d.pvmId}:</span>{" "}
                      {formatRegister(d.value).hex}
                    </div>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          )}
        </>
      )}
    </div>
  );
}
