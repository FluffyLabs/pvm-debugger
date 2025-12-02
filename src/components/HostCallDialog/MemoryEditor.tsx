import { useCallback, useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";

const MAX_LENGTH = 4096;
const BYTES_PER_ROW = 16;

interface MemoryEditorProps {
  readMemory: (startAddress: number, length: number) => Promise<Uint8Array>;
  disabled?: boolean;
  onMemoryChange?: (address: number, data: Uint8Array) => void;
}

function parseNumber(value: string): number | null {
  if (!value.trim()) return null;

  // Support hex (0x...) and decimal
  if (value.toLowerCase().startsWith("0x")) {
    const parsed = parseInt(value, 16);
    return isNaN(parsed) ? null : parsed;
  }
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? null : parsed;
}

function toHex(byte: number): string {
  return byte.toString(16).padStart(2, "0").toUpperCase();
}

function toAscii(byte: number): string {
  // Printable ASCII range: 32-126
  if (byte >= 32 && byte <= 126) {
    return String.fromCharCode(byte);
  }
  return ".";
}

export const MemoryEditor: React.FC<MemoryEditorProps> = ({ readMemory, disabled, onMemoryChange }) => {
  const [addressInput, setAddressInput] = useState("0x1000");
  const [lengthInput, setLengthInput] = useState("256");
  const [address, setAddress] = useState<number | null>(0x1000);
  const [length, setLength] = useState<number | null>(256);
  const [data, setData] = useState<Uint8Array | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [focusedByte, setFocusedByte] = useState<number | null>(null);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Load memory when address and length are set
  useEffect(() => {
    const loadMemory = async () => {
      if (address === null || length === null || length <= 0) {
        setData(null);
        return;
      }

      if (length > MAX_LENGTH) {
        setError(`Length cannot exceed ${MAX_LENGTH} bytes`);
        return;
      }

      setIsLoading(true);
      setError(null);
      try {
        const memoryData = await readMemory(address, length);
        setData(memoryData);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to read memory");
        setData(null);
      } finally {
        setIsLoading(false);
      }
    };

    loadMemory();
  }, [address, length, readMemory]);

  const updateAddress = useCallback((addressInput: string) => {
    setAddressInput(addressInput);

    const parsed = parseNumber(addressInput);
    setAddress(parsed);
  }, []);

  const updateLength = useCallback((lengthInput: string) => {
    setLengthInput(lengthInput);

    const parsed = parseNumber(lengthInput);
    if (parsed !== null && parsed > MAX_LENGTH) {
      setLengthInput(MAX_LENGTH.toString());
      setLength(MAX_LENGTH);
    } else {
      setLength(parsed);
    }
  }, []);

  const focusByte = useCallback(
    (index: number, caret: number) => {
      if (!data) return;
      const clampedIndex = Math.max(0, Math.min(data.length - 1, index));
      setFocusedByte(clampedIndex);
      requestAnimationFrame(() => {
        const input = inputRefs.current[clampedIndex];
        if (input) {
          const pos = Math.max(0, Math.min(2, caret));
          input.focus();
          input.setSelectionRange(pos, pos);
        }
      });
    },
    [data],
  );

  const applyHexDigit = useCallback(
    (byteIndex: number, nibbleIndex: 0 | 1, hexDigit: string) => {
      if (!data || address === null) {
        return;
      }

      const nibbleValue = parseInt(hexDigit, 16);
      if (Number.isNaN(nibbleValue)) return;

      const newData = new Uint8Array(data);
      const current = newData[byteIndex] ?? 0;
      const updated =
        nibbleIndex === 0 ? ((nibbleValue << 4) & 0xf0) | (current & 0x0f) : (current & 0xf0) | (nibbleValue & 0x0f);
      newData[byteIndex] = updated;
      setData(newData);
      onMemoryChange?.(address, newData);
    },
    [data, address, onMemoryChange],
  );

  const moveToNextNibble = useCallback(
    (byteIndex: number, nibble: 0 | 1) => {
      if (!data) return;
      if (nibble === 0) {
        focusByte(byteIndex, 1);
      } else {
        const nextIndex = Math.min(data.length - 1, byteIndex + 1);
        focusByte(nextIndex, 0);
      }
    },
    [data, focusByte],
  );

  const moveToPreviousNibble = useCallback(
    (byteIndex: number, nibble: 0 | 1) => {
      if (!data) return;
      if (nibble === 1) {
        focusByte(byteIndex, 0);
      } else {
        const prevIndex = Math.max(0, byteIndex - 1);
        focusByte(prevIndex, 1);
      }
    },
    [data, focusByte],
  );

  const handleByteKeyDown = useCallback(
    (byteIndex: number, e: React.KeyboardEvent<HTMLInputElement>) => {
      if (disabled || !data) return;
      const input = e.currentTarget;
      const selectionStart = Math.min(Math.max(input.selectionStart ?? 0, 0), 1) as 0 | 1;
      const hex = e.key.toUpperCase();

      if (/^[0-9A-F]$/.test(hex)) {
        e.preventDefault();
        applyHexDigit(byteIndex, selectionStart, hex);
        moveToNextNibble(byteIndex, selectionStart);
        return;
      }

      if (e.key === "Backspace") {
        e.preventDefault();
        const deletingFirstNibble = selectionStart === 0;
        const targetNibble: 0 | 1 = deletingFirstNibble ? 1 : ((selectionStart - 1) as 0 | 1);
        const targetIndex = deletingFirstNibble ? Math.max(0, byteIndex - 1) : byteIndex;
        applyHexDigit(targetIndex, targetNibble, "0");
        const caretPosition = deletingFirstNibble ? 1 : selectionStart - 1;
        focusByte(targetIndex, caretPosition);
        return;
      }

      if (e.key === "Delete") {
        e.preventDefault();
        applyHexDigit(byteIndex, selectionStart, "0");
        focusByte(byteIndex, selectionStart);
        return;
      }

      if (e.key === "ArrowLeft") {
        e.preventDefault();
        moveToPreviousNibble(byteIndex, selectionStart);
        return;
      }

      if (e.key === "ArrowRight") {
        e.preventDefault();
        moveToNextNibble(byteIndex, selectionStart);
        return;
      }
    },
    [applyHexDigit, data, disabled, focusByte, moveToNextNibble, moveToPreviousNibble],
  );

  const handleBeforeInput = useCallback(
    (byteIndex: number, e: React.FormEvent<HTMLInputElement>) => {
      if (disabled || !data) return;
      const nativeEvent = e.nativeEvent as InputEvent;
      const raw = nativeEvent.data ?? "";
      const text = raw.toUpperCase().replace(/[^0-9A-F]/g, "");
      if (!text) {
        nativeEvent.preventDefault();
        return;
      }
      nativeEvent.preventDefault();
      const input = e.currentTarget;
      let nibble = Math.min(Math.max(input.selectionStart ?? 0, 0), 1) as 0 | 1;
      let index = byteIndex;
      for (const char of text) {
        applyHexDigit(index, nibble, char);
        if (!data) break;
        if (nibble === 0) {
          nibble = 1;
        } else {
          nibble = 0;
          if (index < data.length - 1) {
            index += 1;
          }
        }
      }
      focusByte(index, nibble);
    },
    [applyHexDigit, data, disabled, focusByte],
  );

  const handlePaste = useCallback(
    (byteIndex: number, e: React.ClipboardEvent<HTMLInputElement>) => {
      if (disabled || !data || address === null) return;
      let clipboard = e.clipboardData.getData("text") ?? "";
      clipboard = clipboard.replace(/^0x/i, "");
      let hex = clipboard.toUpperCase().replace(/[^0-9A-F]/g, "");
      if (!hex) return;
      e.preventDefault();
      if (hex.length % 2 === 1) {
        hex = `0${hex}`;
      }
      const newData = new Uint8Array(data);
      let index = byteIndex;
      for (let i = 0; i < hex.length && index < newData.length; i += 2) {
        const chunk = hex.slice(i, i + 2);
        const byteValue = parseInt(chunk, 16);
        if (Number.isNaN(byteValue)) continue;
        newData[index] = byteValue;
        index += 1;
      }
      setData(newData);
      onMemoryChange?.(address, newData);
      focusByte(Math.min(index, newData.length - 1), 0);
    },
    [address, data, disabled, focusByte, onMemoryChange],
  );

  // Split data into rows for display
  const rows: { offset: number; bytes: number[] }[] = [];
  if (data) {
    for (let i = 0; i < data.length; i += BYTES_PER_ROW) {
      rows.push({
        offset: i,
        bytes: Array.from(data.slice(i, i + BYTES_PER_ROW)),
      });
    }
  }

  return (
    <div className="space-y-3">
      {/* Address and Length inputs */}
      <div className="flex gap-2 items-center">
        <div className="flex-1">
          <label className="text-sm font-medium">Start Address</label>
          <Input
            className="font-mono"
            placeholder="0x1000"
            value={addressInput}
            onChange={(e) => updateAddress(e.target.value)}
            disabled={disabled}
          />
        </div>
        <div className="flex-1">
          <label className="text-sm font-medium">Length (max {MAX_LENGTH})</label>
          <Input
            className="font-mono"
            placeholder="256"
            value={lengthInput}
            onChange={(e) => updateLength(e.target.value)}
            disabled={disabled}
          />
        </div>
      </div>

      {/* Memory display */}
      {isLoading && <div className="p-3 bg-muted rounded-md text-sm text-muted-foreground">Loading memory...</div>}

      {error && <div className="p-3 bg-destructive/10 text-destructive rounded-md text-sm">{error}</div>}

      {data && !isLoading && (
        <div className="border rounded-md overflow-hidden">
          <div className="bg-muted px-2 py-1 text-xs text-muted-foreground border-b">
            Memory at 0x{address?.toString(16).toUpperCase()} ({data.length} bytes)
          </div>
          <div className="font-mono text-xs">
            <table className="w-full">
              <tbody>
                {rows.map((row) => (
                  <tr key={row.offset} className="hover:bg-muted/50">
                    {/* Offset */}
                    <td className="px-2 py-0.5 text-muted-foreground border-r bg-muted/30 select-none">
                      {(address! + row.offset).toString(16).padStart(8, "0").toUpperCase()}
                    </td>
                    {/* Hex bytes */}
                    <td className="px-2 py-0.5 border-r">
                      <div className="flex gap-1 flex-wrap">
                        {row.bytes.map((byte, i) => {
                          const byteIndex = row.offset + i;
                          const isActive = focusedByte === byteIndex;

                          return (
                            <input
                              key={i}
                              ref={(el) => (inputRefs.current[byteIndex] = el)}
                              className={`w-6 h-6 text-center font-mono text-xs uppercase rounded border ${
                                disabled
                                  ? "cursor-not-allowed opacity-50 bg-muted"
                                  : "cursor-text hover:border-brand focus-visible:ring-1 focus-visible:ring-brand bg-background"
                              } ${isActive ? "border-brand" : "border-transparent"}`}
                              value={toHex(byte)}
                              onFocus={() => !disabled && setFocusedByte(byteIndex)}
                              onKeyDown={(e) => handleByteKeyDown(byteIndex, e)}
                              onBeforeInput={(e) => handleBeforeInput(byteIndex, e)}
                              onPaste={(e) => handlePaste(byteIndex, e)}
                              onChange={() => {}}
                              onClick={(e) => {
                                // keep caret where clicked but ensure nibble boundaries
                                const target = e.currentTarget;
                                const pos = Math.min(Math.max(target.selectionStart ?? 0, 0), 1);
                                requestAnimationFrame(() => target.setSelectionRange(pos, pos));
                              }}
                              disabled={disabled}
                            />
                          );
                        })}
                        {/* Pad with empty spaces if row is incomplete */}
                        {row.bytes.length < BYTES_PER_ROW &&
                          Array(BYTES_PER_ROW - row.bytes.length)
                            .fill(null)
                            .map((_, i) => (
                              <span key={`pad-${i}`} className="w-5 text-center">
                                {"  "}
                              </span>
                            ))}
                      </div>
                    </td>
                    {/* ASCII */}
                    <td className="px-2 py-0.5 text-muted-foreground select-none">
                      {row.bytes.map((byte) => toAscii(byte)).join("")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!data && !isLoading && !error && address !== null && length !== null && (
        <div className="p-3 bg-muted rounded-md text-sm text-muted-foreground">No memory data to display</div>
      )}
    </div>
  );
};
