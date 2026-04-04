import { useCallback } from "react";
import { toHex, fromHex } from "@pvmdbg/types";
import type { WorkPackageData, WorkItem } from "../../../../lib/fetch-codec";
import { DEFAULT_WORK_ITEM } from "../../../../lib/fetch-defaults";
import { RefinementContextEditor } from "./RefinementContextEditor";
import { BytesBlobEditor } from "./BytesBlobEditor";

interface WorkPackageEditorProps {
  value: WorkPackageData;
  onChange: (value: WorkPackageData) => void;
}

function WorkItemEditor({ value, onChange }: { value: WorkItem; onChange: (v: WorkItem) => void }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2">
        <label className="text-muted-foreground w-28 shrink-0 text-[10px]">serviceindex (u32)</label>
        <input
          className="flex-1 rounded border border-border bg-background px-1.5 py-0.5 font-mono text-xs text-foreground"
          value={value.serviceindex}
          onChange={(e) => { const n = parseInt(e.target.value, 10); if (!isNaN(n)) onChange({ ...value, serviceindex: n }); }}
        />
      </div>
      <div className="flex items-center gap-2">
        <label className="text-muted-foreground w-28 shrink-0 text-[10px]">codehash (32B)</label>
        <input
          className="flex-1 rounded border border-border bg-background px-1 py-0.5 font-mono text-[10px] text-foreground"
          value={toHex(value.codehash)}
          onChange={(e) => { try { const b = fromHex(e.target.value); if (b.length === 32) onChange({ ...value, codehash: b }); } catch { /* ignore */ } }}
        />
      </div>
      <div className="grid grid-cols-2 gap-1">
        <div className="flex items-center gap-2">
          <label className="text-muted-foreground w-24 shrink-0 text-[10px]">refgaslimit</label>
          <input
            className="flex-1 rounded border border-border bg-background px-1.5 py-0.5 font-mono text-xs text-foreground"
            value={value.refgaslimit.toString()}
            onChange={(e) => { try { onChange({ ...value, refgaslimit: BigInt(e.target.value) }); } catch { /* ignore */ } }}
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-muted-foreground w-24 shrink-0 text-[10px]">accgaslimit</label>
          <input
            className="flex-1 rounded border border-border bg-background px-1.5 py-0.5 font-mono text-xs text-foreground"
            value={value.accgaslimit.toString()}
            onChange={(e) => { try { onChange({ ...value, accgaslimit: BigInt(e.target.value) }); } catch { /* ignore */ } }}
          />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <label className="text-muted-foreground w-28 shrink-0 text-[10px]">exportcount (u16)</label>
        <input
          className="flex-1 rounded border border-border bg-background px-1.5 py-0.5 font-mono text-xs text-foreground"
          value={value.exportcount}
          onChange={(e) => { const n = parseInt(e.target.value, 10); if (!isNaN(n)) onChange({ ...value, exportcount: n }); }}
        />
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-[10px] text-muted-foreground">payload</span>
        <BytesBlobEditor value={value.payload} onChange={(b) => onChange({ ...value, payload: b })} />
      </div>
    </div>
  );
}

export function WorkPackageEditor({ value, onChange }: WorkPackageEditorProps) {
  const addWorkItem = useCallback(() => {
    onChange({ ...value, workitems: [...value.workitems, { ...DEFAULT_WORK_ITEM }] });
  }, [value, onChange]);

  const removeWorkItem = useCallback(
    (idx: number) => {
      const next = [...value.workitems];
      next.splice(idx, 1);
      onChange({ ...value, workitems: next });
    },
    [value, onChange],
  );

  const setWorkItem = useCallback(
    (idx: number, item: WorkItem) => {
      const next = [...value.workitems];
      next[idx] = item;
      onChange({ ...value, workitems: next });
    },
    [value, onChange],
  );

  return (
    <div data-testid="work-package-editor" className="flex flex-col gap-3 text-xs">
      {/* authcodehost */}
      <div className="flex items-center gap-2">
        <label className="text-muted-foreground w-28 shrink-0 text-[10px]">authcodehost (u32)</label>
        <input
          className="flex-1 rounded border border-border bg-background px-1.5 py-0.5 font-mono text-xs text-foreground"
          value={value.authcodehost}
          onChange={(e) => { const n = parseInt(e.target.value, 10); if (!isNaN(n)) onChange({ ...value, authcodehost: n }); }}
        />
      </div>

      {/* authcodehash */}
      <div className="flex items-center gap-2">
        <label className="text-muted-foreground w-28 shrink-0 text-[10px]">authcodehash (32B)</label>
        <input
          className="flex-1 rounded border border-border bg-background px-1 py-0.5 font-mono text-[10px] text-foreground"
          value={toHex(value.authcodehash)}
          onChange={(e) => {
            try { const b = fromHex(e.target.value); if (b.length === 32) onChange({ ...value, authcodehash: b }); } catch { /* ignore */ }
          }}
        />
      </div>

      {/* Context */}
      <details open>
        <summary className="cursor-pointer text-xs font-semibold text-foreground">Context (RefinementContext)</summary>
        <div className="mt-1 ml-2 border-l border-border pl-2">
          <RefinementContextEditor value={value.context} onChange={(ctx) => onChange({ ...value, context: ctx })} />
        </div>
      </details>

      {/* authtoken */}
      <div className="flex flex-col gap-1">
        <span className="text-[10px] text-muted-foreground">authtoken</span>
        <BytesBlobEditor value={value.authtoken} onChange={(b) => onChange({ ...value, authtoken: b })} />
      </div>

      {/* authconfig */}
      <div className="flex flex-col gap-1">
        <span className="text-[10px] text-muted-foreground">authconfig</span>
        <BytesBlobEditor value={value.authconfig} onChange={(b) => onChange({ ...value, authconfig: b })} />
      </div>

      {/* Work items */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">{value.workitems.length} work item(s)</span>
          <button
            className="cursor-pointer rounded bg-primary/20 px-2 py-0.5 text-[10px] text-primary hover:bg-primary/30"
            onClick={addWorkItem}
          >
            + Add
          </button>
        </div>
        {value.workitems.map((item, idx) => (
          <div key={idx} className="border border-border rounded p-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-muted-foreground">Work Item #{idx}</span>
              <button
                className="cursor-pointer text-xs text-muted-foreground hover:text-destructive"
                onClick={() => removeWorkItem(idx)}
              >
                ×
              </button>
            </div>
            <WorkItemEditor value={item} onChange={(v) => setWorkItem(idx, v)} />
          </div>
        ))}
      </div>
    </div>
  );
}
