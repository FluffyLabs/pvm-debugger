import { fromHex, toHex } from "@pvmdbg/types";
import { useCallback, useEffect, useRef, useState } from "react";

interface RawEditorProps {
  blob: Uint8Array;
  onBlobChange: (data: Uint8Array) => void;
}

/**
 * Hex textarea for the full response blob (Raw mode).
 */
export function RawEditor({ blob, onBlobChange }: RawEditorProps) {
  const [text, setText] = useState(() => toHex(blob));
  const editingRef = useRef(false);

  useEffect(() => {
    if (!editingRef.current) {
      setText(toHex(blob));
    }
  }, [blob]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      editingRef.current = true;
      const raw = e.target.value;
      setText(raw);

      const clean =
        raw.startsWith("0x") || raw.startsWith("0X") ? raw.slice(2) : raw;
      if (clean.length % 2 === 0 && /^[0-9a-fA-F]*$/.test(clean)) {
        try {
          onBlobChange(fromHex("0x" + clean));
        } catch {
          // ignore
        }
      }
    },
    [onBlobChange],
  );

  const handleBlur = useCallback(() => {
    editingRef.current = false;
    setText(toHex(blob));
  }, [blob]);

  return (
    <div data-testid="raw-editor" className="flex flex-col gap-2">
      <textarea
        data-testid="raw-hex-textarea"
        className="w-full min-h-[120px] rounded border border-border bg-background px-2 py-1.5 font-mono text-xs text-foreground resize-y"
        value={text}
        onChange={handleChange}
        onBlur={handleBlur}
        placeholder="0x..."
        spellCheck={false}
      />
      <div className="text-xs text-muted-foreground font-mono">
        {blob.length} byte{blob.length !== 1 ? "s" : ""}
      </div>
    </div>
  );
}
