import { useCallback } from "react";
import { toHex, fromHex } from "@pvmdbg/types";
import type { RefinementContext } from "../../../../lib/fetch-codec";

interface RefinementContextEditorProps {
  value: RefinementContext;
  onChange: (value: RefinementContext) => void;
}

function HashField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: Uint8Array;
  onChange: (v: Uint8Array) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <label className="text-muted-foreground w-32 shrink-0 text-[10px]">{label}</label>
      <input
        className="flex-1 rounded border border-border bg-background px-1.5 py-0.5 font-mono text-[10px] text-foreground"
        value={toHex(value)}
        onChange={(e) => {
          try {
            const b = fromHex(e.target.value);
            if (b.length === 32) onChange(b);
          } catch {
            // ignore
          }
        }}
      />
    </div>
  );
}

export function RefinementContextEditor({ value, onChange }: RefinementContextEditorProps) {
  const setHash = useCallback(
    (key: "anchorhash" | "anchorpoststate" | "anchoraccoutlog" | "lookupanchorhash", v: Uint8Array) => {
      onChange({ ...value, [key]: v });
    },
    [value, onChange],
  );

  const setTimeslot = useCallback(
    (v: number) => onChange({ ...value, lookupanchortime: v }),
    [value, onChange],
  );

  const addPrerequisite = useCallback(() => {
    onChange({ ...value, prerequisites: [...value.prerequisites, new Uint8Array(32)] });
  }, [value, onChange]);

  const removePrerequisite = useCallback(
    (idx: number) => {
      const next = [...value.prerequisites];
      next.splice(idx, 1);
      onChange({ ...value, prerequisites: next });
    },
    [value, onChange],
  );

  const setPrerequisite = useCallback(
    (idx: number, v: Uint8Array) => {
      const next = [...value.prerequisites];
      next[idx] = v;
      onChange({ ...value, prerequisites: next });
    },
    [value, onChange],
  );

  return (
    <div data-testid="refinement-context-editor" className="flex flex-col gap-2 text-xs">
      <HashField label="anchorhash" value={value.anchorhash} onChange={(v) => setHash("anchorhash", v)} />
      <HashField label="anchorpoststate" value={value.anchorpoststate} onChange={(v) => setHash("anchorpoststate", v)} />
      <HashField label="anchoraccoutlog" value={value.anchoraccoutlog} onChange={(v) => setHash("anchoraccoutlog", v)} />
      <HashField label="lookupanchorhash" value={value.lookupanchorhash} onChange={(v) => setHash("lookupanchorhash", v)} />

      <div className="flex items-center gap-2">
        <label className="text-muted-foreground w-32 shrink-0 text-[10px]">lookupanchortime (u32)</label>
        <input
          className="flex-1 rounded border border-border bg-background px-1.5 py-0.5 font-mono text-xs text-foreground"
          type="text"
          value={value.lookupanchortime}
          onChange={(e) => { const n = parseInt(e.target.value, 10); if (!isNaN(n)) setTimeslot(n); }}
        />
      </div>

      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-[10px]">Prerequisites ({value.prerequisites.length})</span>
          <button
            className="cursor-pointer rounded bg-primary/20 px-1.5 py-0.5 text-[10px] text-primary hover:bg-primary/30"
            onClick={addPrerequisite}
          >
            + Add
          </button>
        </div>
        {value.prerequisites.map((prereq, idx) => (
          <div key={idx} className="flex items-center gap-1">
            <input
              className="flex-1 rounded border border-border bg-background px-1 py-0.5 font-mono text-[10px] text-foreground"
              value={toHex(prereq)}
              onChange={(e) => {
                try { const b = fromHex(e.target.value); if (b.length === 32) setPrerequisite(idx, b); } catch { /* ignore */ }
              }}
            />
            <button
              className="cursor-pointer text-xs text-muted-foreground hover:text-destructive"
              onClick={() => removePrerequisite(idx)}
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
