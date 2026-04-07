import { useCallback } from "react";
import type { TransferOrOperand } from "../../../../lib/fetch-codec";
import { DEFAULT_OPERAND } from "../../../../lib/fetch-defaults";
import { TransferOrOperandEditor } from "./TransferOrOperandEditor";

interface AllTransfersEditorProps {
  value: TransferOrOperand[];
  onChange: (value: TransferOrOperand[]) => void;
}

export function AllTransfersEditor({
  value,
  onChange,
}: AllTransfersEditorProps) {
  const addItem = useCallback(() => {
    onChange([...value, { ...DEFAULT_OPERAND }]);
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
    (idx: number, item: TransferOrOperand) => {
      const next = [...value];
      next[idx] = item;
      onChange(next);
    },
    [value, onChange],
  );

  return (
    <div
      data-testid="all-transfers-editor"
      className="flex flex-col gap-2 text-xs"
    >
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground">
          {value.length} accumulation input(s)
        </span>
        <button
          className="cursor-pointer rounded bg-primary/20 px-2 py-0.5 text-[10px] text-primary hover:bg-primary/30"
          onClick={addItem}
        >
          + Add
        </button>
      </div>
      {value.map((item, idx) => (
        <div key={idx} className="border border-border rounded p-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-muted-foreground">
              Input #{idx}
            </span>
            <button
              className="cursor-pointer text-xs text-muted-foreground hover:text-destructive"
              onClick={() => removeItem(idx)}
            >
              ×
            </button>
          </div>
          <TransferOrOperandEditor
            value={item}
            onChange={(v) => setItem(idx, v)}
          />
        </div>
      ))}
    </div>
  );
}
