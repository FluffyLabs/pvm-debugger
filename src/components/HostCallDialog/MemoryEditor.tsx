import { useCallback, useEffect, useState } from "react";
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

  try {
    // Support hex (0x...) and decimal
    if (value.toLowerCase().startsWith("0x")) {
      return parseInt(value, 16);
    }
    return parseInt(value, 10);
  } catch {
    return null;
  }
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
  const [addressInput, setAddressInput] = useState("");
  const [lengthInput, setLengthInput] = useState("256");
  const [address, setAddress] = useState<number | null>(null);
  const [length, setLength] = useState<number | null>(null);
  const [data, setData] = useState<Uint8Array | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingByte, setEditingByte] = useState<number | null>(null);
  const [editValue, setEditValue] = useState("");

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
        onMemoryChange?.(address, memoryData);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to read memory");
        setData(null);
      } finally {
        setIsLoading(false);
      }
    };

    loadMemory();
  }, [address, length, readMemory, onMemoryChange]);

  const handleAddressBlur = useCallback(() => {
    const parsed = parseNumber(addressInput);
    setAddress(parsed);
  }, [addressInput]);

  const handleLengthBlur = useCallback(() => {
    const parsed = parseNumber(lengthInput);
    if (parsed !== null && parsed > MAX_LENGTH) {
      setLengthInput(MAX_LENGTH.toString());
      setLength(MAX_LENGTH);
    } else {
      setLength(parsed);
    }
  }, [lengthInput]);

  const handleByteClick = useCallback(
    (byteIndex: number) => {
      if (disabled || !data) return;
      setEditingByte(byteIndex);
      setEditValue(toHex(data[byteIndex]));
    },
    [disabled, data],
  );

  const handleByteChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase();
    // Only allow hex characters, max 2
    if (/^[0-9A-F]{0,2}$/.test(value)) {
      setEditValue(value);
    }
  }, []);

  const handleByteBlur = useCallback(() => {
    if (editingByte === null || !data || address === null) {
      setEditingByte(null);
      return;
    }

    const byteValue = parseInt(editValue || "0", 16);
    if (!isNaN(byteValue) && byteValue >= 0 && byteValue <= 255) {
      const newData = new Uint8Array(data);
      newData[editingByte] = byteValue;
      setData(newData);
      onMemoryChange?.(address, newData);
    }
    setEditingByte(null);
  }, [editingByte, editValue, data, address, onMemoryChange]);

  const handleByteKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        handleByteBlur();
      } else if (e.key === "Escape") {
        setEditingByte(null);
      }
    },
    [handleByteBlur],
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
            onChange={(e) => setAddressInput(e.target.value)}
            onBlur={handleAddressBlur}
            onKeyUp={(e) => e.key === "Enter" && handleAddressBlur()}
            disabled={disabled}
          />
        </div>
        <div className="flex-1">
          <label className="text-sm font-medium">Length (max {MAX_LENGTH})</label>
          <Input
            className="font-mono"
            placeholder="256"
            value={lengthInput}
            onChange={(e) => setLengthInput(e.target.value)}
            onBlur={handleLengthBlur}
            onKeyUp={(e) => e.key === "Enter" && handleLengthBlur()}
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
                          const isEditing = editingByte === byteIndex;

                          return isEditing ? (
                            <input
                              key={i}
                              type="text"
                              className="w-5 h-4 text-center bg-brand/20 border border-brand rounded text-xs p-0 focus:outline-none"
                              value={editValue}
                              onChange={handleByteChange}
                              onBlur={handleByteBlur}
                              onKeyDown={handleByteKeyDown}
                              autoFocus
                            />
                          ) : (
                            <span
                              key={i}
                              className={`w-5 text-center cursor-pointer hover:bg-brand/20 rounded ${
                                disabled ? "cursor-not-allowed opacity-50" : ""
                              }`}
                              onClick={() => handleByteClick(byteIndex)}
                            >
                              {toHex(byte)}
                            </span>
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
