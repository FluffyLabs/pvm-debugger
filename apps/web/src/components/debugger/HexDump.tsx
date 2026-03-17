import { useState, useRef, useCallback } from "react";

const BYTES_PER_ROW = 16;

interface HexDumpProps {
  data: Uint8Array;
  baseAddress: number;
  editable?: boolean;
  onWriteBytes?: (address: number, data: Uint8Array) => void;
}

function isPrintable(byte: number): boolean {
  return byte >= 0x20 && byte <= 0x7e;
}

function formatAddress(addr: number): string {
  return addr.toString(16).padStart(8, "0");
}

function byteToHex(byte: number): string {
  return byte.toString(16).padStart(2, "0");
}

const HEX_CHARS = new Set("0123456789abcdefABCDEF");

/** Strip common hex separators and 0x prefixes, return only hex chars. */
export function sanitizeHexInput(text: string): string {
  return text.replace(/0x/gi, "").replace(/[\s,;:-]/g, "").split("").filter((c) => HEX_CHARS.has(c)).join("");
}

interface ByteCellProps {
  byte: number;
  offset: number;
  editable: boolean;
  editingOffset: number | null;
  onStartEdit: (offset: number) => void;
  onCommit: (offset: number, value: number, advance: boolean) => void;
  onMovePrev: (offset: number) => void;
  onPaste: (offset: number, hex: string) => void;
  inputRef: (offset: number, el: HTMLInputElement | null) => void;
}

function ByteCell({
  byte,
  offset,
  editable,
  editingOffset,
  onStartEdit,
  onCommit,
  onMovePrev,
  onPaste,
  inputRef,
}: ByteCellProps) {
  const isEditing = editingOffset === offset;

  if (isEditing) {
    return (
      <span
        className="inline-block"
        style={{ width: "1.5em" }}
      >
        <input
          ref={(el) => inputRef(offset, el)}
          data-testid={`hex-byte-input-${offset}`}
          type="text"
          className="w-full bg-transparent border-none outline-none text-foreground font-mono text-xs p-0 m-0 text-center"
          style={{ width: "1.5em", caretColor: "auto" }}
          maxLength={2}
          autoFocus
          onKeyDown={(e) => {
            if (e.key === "Backspace" && e.currentTarget.value === "") {
              e.preventDefault();
              onMovePrev(offset);
            } else if (e.key === "Escape") {
              e.preventDefault();
              onStartEdit(-1); // cancel editing
            }
          }}
          onChange={(e) => {
            const val = e.target.value.replace(/[^0-9a-fA-F]/g, "");
            e.target.value = val;
            if (val.length === 2) {
              const parsed = parseInt(val, 16);
              onCommit(offset, parsed, true);
            }
          }}
          onPaste={(e) => {
            e.preventDefault();
            const text = e.clipboardData.getData("text");
            const hex = sanitizeHexInput(text);
            if (hex.length >= 2) {
              onPaste(offset, hex);
            }
          }}
          onBlur={() => {
            // Cancel editing on blur
            onStartEdit(-1);
          }}
        />
      </span>
    );
  }

  return (
    <span
      data-testid={`hex-byte-${offset}`}
      className={`inline-block ${editable ? "cursor-pointer hover:bg-accent/50 rounded" : "cursor-default"} ${
        byte === 0 ? "text-muted-foreground/40" : "text-foreground"
      }`}
      style={{ width: "1.5em", textAlign: "center" }}
      onClick={editable ? () => onStartEdit(offset) : undefined}
    >
      {byteToHex(byte)}
    </span>
  );
}

export function HexDump({ data, baseAddress, editable = false, onWriteBytes }: HexDumpProps) {
  const [editingOffset, setEditingOffset] = useState<number | null>(null);
  const inputRefs = useRef<Map<number, HTMLInputElement>>(new Map());
  const rowCount = Math.ceil(data.length / BYTES_PER_ROW);

  const setInputRef = useCallback((offset: number, el: HTMLInputElement | null) => {
    if (el) {
      inputRefs.current.set(offset, el);
      el.focus();
    } else {
      inputRefs.current.delete(offset);
    }
  }, []);

  const startEdit = useCallback(
    (offset: number) => {
      if (offset < 0 || offset >= data.length) {
        setEditingOffset(null);
        return;
      }
      setEditingOffset(offset);
    },
    [data.length],
  );

  const commitByte = useCallback(
    (offset: number, value: number, advance: boolean) => {
      if (!onWriteBytes) return;
      const address = baseAddress + offset;
      onWriteBytes(address, new Uint8Array([value]));
      if (advance && offset + 1 < data.length) {
        setEditingOffset(offset + 1);
      } else {
        setEditingOffset(null);
      }
    },
    [baseAddress, data.length, onWriteBytes],
  );

  const movePrev = useCallback(
    (offset: number) => {
      if (offset > 0) {
        setEditingOffset(offset - 1);
      } else {
        setEditingOffset(null);
      }
    },
    [],
  );

  const handlePaste = useCallback(
    (offset: number, hex: string) => {
      if (!onWriteBytes) return;
      // Parse pairs of hex digits into bytes
      const byteCount = Math.floor(hex.length / 2);
      // Limit to remaining bytes within the page (4096 bytes per page)
      const PAGE_SIZE = 4096;
      const offsetInPage = offset;
      const maxBytes = Math.min(byteCount, PAGE_SIZE - offsetInPage, data.length - offset);
      if (maxBytes <= 0) return;

      const bytes = new Uint8Array(maxBytes);
      for (let i = 0; i < maxBytes; i++) {
        bytes[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16);
      }
      const address = baseAddress + offset;
      onWriteBytes(address, bytes);
      // Advance past pasted bytes
      const newOffset = offset + maxBytes;
      if (newOffset < data.length) {
        setEditingOffset(newOffset);
      } else {
        setEditingOffset(null);
      }
    },
    [baseAddress, data.length, onWriteBytes],
  );

  return (
    <div
      data-testid="hex-dump"
      className="overflow-x-auto font-mono text-xs leading-5"
    >
      {Array.from({ length: rowCount }, (_, rowIdx) => {
        const offset = rowIdx * BYTES_PER_ROW;
        const rowBytes = data.subarray(offset, offset + BYTES_PER_ROW);
        const addr = baseAddress + offset;

        return (
          <div key={rowIdx} className="flex whitespace-nowrap">
            <span
              data-testid="hex-address"
              className="text-muted-foreground select-none pr-2"
            >
              {formatAddress(addr)}
            </span>
            <span data-testid="hex-bytes" className="pr-2">
              {Array.from(rowBytes, (byte, i) => {
                const byteOffset = offset + i;
                return (
                  <ByteCell
                    key={i}
                    byte={byte}
                    offset={byteOffset}
                    editable={editable}
                    editingOffset={editingOffset}
                    onStartEdit={startEdit}
                    onCommit={commitByte}
                    onMovePrev={movePrev}
                    onPaste={handlePaste}
                    inputRef={setInputRef}
                  />
                );
              })}
            </span>
            <span data-testid="hex-ascii" className="text-muted-foreground select-none">
              {Array.from(rowBytes, (byte, i) => (
                <span
                  key={i}
                  className={byte === 0 ? "text-muted-foreground/40" : ""}
                >
                  {isPrintable(byte) ? String.fromCharCode(byte) : "."}
                </span>
              ))}
            </span>
          </div>
        );
      })}
    </div>
  );
}
