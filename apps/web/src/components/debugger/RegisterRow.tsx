import { useState, useRef, useEffect, useCallback } from "react";
import { formatRegister, parseBigintInput } from "./value-format";

interface RegisterRowProps {
  index: number;
  value: bigint;
  editable: boolean;
  onCommit?: (index: number, value: bigint) => void;
}

export function RegisterRow({ index, value, editable, onCommit }: RegisterRowProps) {
  const { hex, decimal } = formatRegister(value);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

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

  return (
    <div
      data-testid={`register-row-${index}`}
      className="flex items-baseline gap-2 px-2 py-0.5 font-mono text-xs hover:bg-muted/50"
      style={{ minHeight: "1.5rem" }}
    >
      <span data-testid={`register-label-${index}`} className="text-muted-foreground w-8 shrink-0 select-none">
        ω{index}:
      </span>
      {editing ? (
        <input
          ref={inputRef}
          data-testid={`register-edit-${index}`}
          className={`flex-1 bg-transparent border-b outline-none font-mono text-xs text-foreground ${error ? "border-red-500" : "border-primary"}`}
          style={{ minHeight: "1.25rem", lineHeight: "1.25rem", padding: 0 }}
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
        </>
      )}
    </div>
  );
}
