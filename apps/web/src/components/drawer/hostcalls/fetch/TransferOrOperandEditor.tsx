import { fromHex, toHex } from "@pvmdbg/types";
import { useCallback } from "react";
import type {
  Operand,
  ResultKind,
  Transfer,
  TransferOrOperand,
} from "../../../../lib/fetch-codec";
import {
  RESULT_KIND_NAMES,
  TRANSFER_MEMO_SIZE,
} from "../../../../lib/fetch-codec";
import {
  DEFAULT_OPERAND,
  DEFAULT_TRANSFER,
} from "../../../../lib/fetch-defaults";
import { BytesBlobEditor } from "./BytesBlobEditor";

interface TransferOrOperandEditorProps {
  value: TransferOrOperand;
  onChange: (value: TransferOrOperand) => void;
}

function OperandEditor({
  value,
  onChange,
}: {
  value: Operand;
  onChange: (v: Operand) => void;
}) {
  const setHash = useCallback(
    (
      key: "packagehash" | "segroot" | "authorizer" | "payloadhash",
      v: Uint8Array,
    ) => {
      onChange({ ...value, [key]: v });
    },
    [value, onChange],
  );

  return (
    <div className="flex flex-col gap-1.5">
      {(["packagehash", "segroot", "authorizer", "payloadhash"] as const).map(
        (key) => (
          <div key={key} className="flex items-center gap-2">
            <label className="text-muted-foreground w-24 shrink-0 text-[10px]">
              {key}
            </label>
            <input
              className="flex-1 rounded border border-border bg-background px-1 py-0.5 font-mono text-[10px] text-foreground"
              value={toHex(value[key])}
              onChange={(e) => {
                try {
                  const b = fromHex(e.target.value);
                  if (b.length === 32) setHash(key, b);
                } catch {
                  /* ignore */
                }
              }}
            />
          </div>
        ),
      )}
      <div className="flex items-center gap-2">
        <label className="text-muted-foreground w-24 shrink-0 text-[10px]">
          gaslimit (u64)
        </label>
        <input
          className="flex-1 rounded border border-border bg-background px-1.5 py-0.5 font-mono text-xs text-foreground"
          value={value.gaslimit.toString()}
          onChange={(e) => {
            try {
              onChange({ ...value, gaslimit: BigInt(e.target.value) });
            } catch {
              /* ignore */
            }
          }}
        />
      </div>
      {/* O(result) */}
      <div className="flex items-center gap-2">
        <label className="text-muted-foreground w-24 shrink-0 text-[10px]">
          result kind
        </label>
        <select
          className="flex-1 rounded border border-border bg-background px-1.5 py-0.5 text-xs text-foreground"
          value={value.result.kind}
          onChange={(e) => {
            const kind = parseInt(e.target.value, 10) as ResultKind;
            onChange({
              ...value,
              result:
                kind === 0
                  ? { kind: 0, blob: value.result.blob ?? new Uint8Array(0) }
                  : { kind },
            });
          }}
        >
          {([0, 1, 2, 3, 4, 5, 6] as ResultKind[]).map((k) => (
            <option key={k} value={k}>
              {k} — {RESULT_KIND_NAMES[k]}
            </option>
          ))}
        </select>
      </div>
      {value.result.kind === 0 && (
        <div className="flex flex-col gap-1 ml-4">
          <span className="text-[10px] text-muted-foreground">Result blob</span>
          <BytesBlobEditor
            value={value.result.blob ?? new Uint8Array(0)}
            onChange={(b) =>
              onChange({ ...value, result: { kind: 0, blob: b } })
            }
          />
        </div>
      )}
      <div className="flex flex-col gap-1">
        <span className="text-[10px] text-muted-foreground">
          authtrace blob
        </span>
        <BytesBlobEditor
          value={value.authtrace}
          onChange={(b) => onChange({ ...value, authtrace: b })}
        />
      </div>
    </div>
  );
}

function TransferEditor({
  value,
  onChange,
}: {
  value: Transfer;
  onChange: (v: Transfer) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2">
        <label className="text-muted-foreground w-20 shrink-0 text-[10px]">
          source (u32)
        </label>
        <input
          className="flex-1 rounded border border-border bg-background px-1.5 py-0.5 font-mono text-xs text-foreground"
          value={value.source}
          onChange={(e) => {
            const n = parseInt(e.target.value, 10);
            if (!isNaN(n)) onChange({ ...value, source: n });
          }}
        />
      </div>
      <div className="flex items-center gap-2">
        <label className="text-muted-foreground w-20 shrink-0 text-[10px]">
          dest (u32)
        </label>
        <input
          className="flex-1 rounded border border-border bg-background px-1.5 py-0.5 font-mono text-xs text-foreground"
          value={value.dest}
          onChange={(e) => {
            const n = parseInt(e.target.value, 10);
            if (!isNaN(n)) onChange({ ...value, dest: n });
          }}
        />
      </div>
      <div className="flex items-center gap-2">
        <label className="text-muted-foreground w-20 shrink-0 text-[10px]">
          amount (u64)
        </label>
        <input
          className="flex-1 rounded border border-border bg-background px-1.5 py-0.5 font-mono text-xs text-foreground"
          value={value.amount.toString()}
          onChange={(e) => {
            try {
              onChange({ ...value, amount: BigInt(e.target.value) });
            } catch {
              /* ignore */
            }
          }}
        />
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-[10px] text-muted-foreground">
          memo ({TRANSFER_MEMO_SIZE} bytes)
        </span>
        <BytesBlobEditor
          value={value.memo}
          onChange={(b) => onChange({ ...value, memo: b })}
          defaultSize={TRANSFER_MEMO_SIZE}
        />
      </div>
      <div className="flex items-center gap-2">
        <label className="text-muted-foreground w-20 shrink-0 text-[10px]">
          gas (u64)
        </label>
        <input
          className="flex-1 rounded border border-border bg-background px-1.5 py-0.5 font-mono text-xs text-foreground"
          value={value.gas.toString()}
          onChange={(e) => {
            try {
              onChange({ ...value, gas: BigInt(e.target.value) });
            } catch {
              /* ignore */
            }
          }}
        />
      </div>
    </div>
  );
}

export function TransferOrOperandEditor({
  value,
  onChange,
}: TransferOrOperandEditorProps) {
  const handleTagSwitch = useCallback(
    (newTag: "operand" | "transfer") => {
      if (newTag === value.tag) return;
      if (newTag === "operand") {
        onChange({ ...DEFAULT_OPERAND });
      } else {
        onChange({ ...DEFAULT_TRANSFER });
      }
    },
    [value.tag, onChange],
  );

  return (
    <div
      data-testid="transfer-or-operand-editor"
      className="flex flex-col gap-2 text-xs"
    >
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground text-[10px]">Type:</span>
        <button
          className={`cursor-pointer rounded px-2 py-0.5 text-[10px] font-medium ${value.tag === "operand" ? "bg-blue-500/20 text-blue-300" : "bg-muted text-muted-foreground"}`}
          onClick={() => handleTagSwitch("operand")}
        >
          Operand
        </button>
        <button
          className={`cursor-pointer rounded px-2 py-0.5 text-[10px] font-medium ${value.tag === "transfer" ? "bg-blue-500/20 text-blue-300" : "bg-muted text-muted-foreground"}`}
          onClick={() => handleTagSwitch("transfer")}
        >
          Transfer
        </button>
      </div>
      {value.tag === "operand" ? (
        <OperandEditor value={value} onChange={(v) => onChange(v)} />
      ) : (
        <TransferEditor value={value} onChange={(v) => onChange(v)} />
      )}
    </div>
  );
}
