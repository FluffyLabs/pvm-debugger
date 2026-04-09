import { useCallback } from "react";
import type { WorkItemSummary } from "../../../../lib/fetch-codec";
import { DEFAULT_WORK_ITEM_SUMMARY } from "../../../../lib/fetch-defaults";
import { WorkItemInfoEditor } from "./WorkItemInfoEditor";

interface AllWorkItemsEditorProps {
  value: WorkItemSummary[];
  onChange: (value: WorkItemSummary[]) => void;
}

export function AllWorkItemsEditor({
  value,
  onChange,
}: AllWorkItemsEditorProps) {
  const addItem = useCallback(() => {
    onChange([...value, { ...DEFAULT_WORK_ITEM_SUMMARY }]);
  }, [value, onChange]);

  const removeItem = useCallback(
    (idx: number) => {
      const next = [...value];
      next.splice(idx, 1);
      onChange(next);
    },
    [value, onChange],
  );

  const setItem = useCallback(
    (idx: number, item: WorkItemSummary) => {
      const next = [...value];
      next[idx] = item;
      onChange(next);
    },
    [value, onChange],
  );

  return (
    <div
      data-testid="all-work-items-editor"
      className="flex flex-col gap-2 text-xs"
    >
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground">
          {value.length} work item summary(ies)
        </span>
        <button
          type="button"
          className="cursor-pointer rounded bg-primary/20 px-2 py-0.5 text-[10px] text-primary hover:bg-primary/30"
          onClick={addItem}
        >
          + Add
        </button>
      </div>
      {value.map((item, idx) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: index is the only stable key
        <div key={idx} className="border border-border rounded p-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-muted-foreground">
              Item #{idx}
            </span>
            <button
              type="button"
              className="cursor-pointer text-xs text-muted-foreground hover:text-destructive"
              onClick={() => removeItem(idx)}
            >
              ×
            </button>
          </div>
          <WorkItemInfoEditor value={item} onChange={(v) => setItem(idx, v)} />
        </div>
      ))}
    </div>
  );
}
