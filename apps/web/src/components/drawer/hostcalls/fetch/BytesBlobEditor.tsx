import { fromHex, toHex } from "@pvmdbg/types";
import { useCallback, useEffect, useRef, useState } from "react";

interface BytesBlobEditorProps {
  value: Uint8Array;
  onChange: (data: Uint8Array) => void;
  defaultSize?: number;
}

/**
 * Simple hex textarea for arbitrary-length blobs.
 * Uses editingRef to prevent parent syncs from clobbering user input mid-edit.
 */
export function BytesBlobEditor({
  value,
  onChange,
  defaultSize,
}: BytesBlobEditorProps) {
  const [text, setText] = useState(() => toHex(value));
  const editingRef = useRef(false);

  // Sync parent value → local text, but not while user is editing
  useEffect(() => {
    if (!editingRef.current) {
      setText(toHex(value));
    }
  }, [value]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      editingRef.current = true;
      const raw = e.target.value;
      setText(raw);

      // Only notify parent on valid even-length hex
      const clean =
        raw.startsWith("0x") || raw.startsWith("0X") ? raw.slice(2) : raw;
      if (clean.length % 2 === 0 && /^[0-9a-fA-F]*$/.test(clean)) {
        try {
          onChange(fromHex(`0x${clean}`));
        } catch {
          // ignore invalid
        }
      }
    },
    [onChange],
  );

  const handleBlur = useCallback(() => {
    editingRef.current = false;
    // On blur, try to notify parent with whatever we have
    const clean =
      text.startsWith("0x") || text.startsWith("0X") ? text.slice(2) : text;
    if (clean.length % 2 === 1) {
      // Pad odd-length and sync
      const padded = `0${clean}`;
      try {
        const bytes = fromHex(`0x${padded}`);
        onChange(bytes);
        setText(toHex(bytes));
      } catch {
        // revert to parent value
        setText(toHex(value));
      }
    } else {
      setText(toHex(value));
    }
  }, [text, value, onChange]);

  const placeholder = defaultSize
    ? `0x${"00".repeat(Math.min(defaultSize, 8))}... (${defaultSize} bytes)`
    : "0x...";

  return (
    <textarea
      data-testid="bytes-blob-editor"
      className="w-full min-h-[60px] rounded border border-border bg-background px-2 py-1.5 font-mono text-xs text-foreground resize-y"
      value={text}
      onChange={handleChange}
      onBlur={handleBlur}
      placeholder={placeholder}
      spellCheck={false}
    />
  );
}
