import { useCallback } from "react";
import { toHex, fromHex } from "@pvmdbg/types";
import type { WorkItemSummary } from "../../../../lib/fetch-codec";

interface WorkItemInfoEditorProps {
  value: WorkItemSummary;
  onChange: (value: WorkItemSummary) => void;
}

/**
 * Editor for a single WorkItemSummary (62 bytes, kind 12).
 */
export function WorkItemInfoEditor({ value, onChange }: WorkItemInfoEditorProps) {
  const setField = useCallback(
    (key: keyof WorkItemSummary, val: number | bigint | Uint8Array) => {
      onChange({ ...value, [key]: val });
    },
    [value, onChange],
  );

  return (
    <div data-testid="work-item-info-editor" className="grid grid-cols-1 md:grid-cols-2 gap-1 text-xs">
      <div className="flex items-center gap-2">
        <label className="text-muted-foreground w-28 shrink-0">serviceindex (u32)</label>
        <input
          className="flex-1 rounded border border-border bg-background px-1.5 py-0.5 font-mono text-foreground"
          value={value.serviceindex}
          onChange={(e) => { const n = parseInt(e.target.value, 10); if (!isNaN(n)) setField("serviceindex", n); }}
        />
      </div>
      <div className="flex items-center gap-2">
        <label className="text-muted-foreground w-28 shrink-0">codehash (32B)</label>
        <input
          className="flex-1 rounded border border-border bg-background px-1.5 py-0.5 font-mono text-foreground text-[10px]"
          value={toHex(value.codehash)}
          onChange={(e) => {
            try { const b = fromHex(e.target.value); if (b.length === 32) setField("codehash", b); } catch { /* ignore */ }
          }}
        />
      </div>
      <div className="flex items-center gap-2">
        <label className="text-muted-foreground w-28 shrink-0">refgaslimit (u64)</label>
        <input
          className="flex-1 rounded border border-border bg-background px-1.5 py-0.5 font-mono text-foreground"
          value={value.refgaslimit.toString()}
          onChange={(e) => { try { setField("refgaslimit", BigInt(e.target.value)); } catch { /* ignore */ } }}
        />
      </div>
      <div className="flex items-center gap-2">
        <label className="text-muted-foreground w-28 shrink-0">accgaslimit (u64)</label>
        <input
          className="flex-1 rounded border border-border bg-background px-1.5 py-0.5 font-mono text-foreground"
          value={value.accgaslimit.toString()}
          onChange={(e) => { try { setField("accgaslimit", BigInt(e.target.value)); } catch { /* ignore */ } }}
        />
      </div>
      <div className="flex items-center gap-2">
        <label className="text-muted-foreground w-28 shrink-0">exportcount (u16)</label>
        <input
          className="flex-1 rounded border border-border bg-background px-1.5 py-0.5 font-mono text-foreground"
          value={value.exportcount}
          onChange={(e) => { const n = parseInt(e.target.value, 10); if (!isNaN(n)) setField("exportcount", n); }}
        />
      </div>
      <div className="flex items-center gap-2">
        <label className="text-muted-foreground w-28 shrink-0">imports count</label>
        <input
          className="flex-1 rounded border border-border bg-background px-1.5 py-0.5 font-mono text-foreground"
          value={value.importsegmentsCount}
          onChange={(e) => { const n = parseInt(e.target.value, 10); if (!isNaN(n)) setField("importsegmentsCount", n); }}
        />
      </div>
      <div className="flex items-center gap-2">
        <label className="text-muted-foreground w-28 shrink-0">extrinsics count</label>
        <input
          className="flex-1 rounded border border-border bg-background px-1.5 py-0.5 font-mono text-foreground"
          value={value.extrinsicsCount}
          onChange={(e) => { const n = parseInt(e.target.value, 10); if (!isNaN(n)) setField("extrinsicsCount", n); }}
        />
      </div>
      <div className="flex items-center gap-2">
        <label className="text-muted-foreground w-28 shrink-0">payload length</label>
        <input
          className="flex-1 rounded border border-border bg-background px-1.5 py-0.5 font-mono text-foreground"
          value={value.payloadLength}
          onChange={(e) => { const n = parseInt(e.target.value, 10); if (!isNaN(n)) setField("payloadLength", n); }}
        />
      </div>
    </div>
  );
}
