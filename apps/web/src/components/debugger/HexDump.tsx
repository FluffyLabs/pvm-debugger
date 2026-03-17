const BYTES_PER_ROW = 16;

interface HexDumpProps {
  data: Uint8Array;
  baseAddress: number;
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

export function HexDump({ data, baseAddress }: HexDumpProps) {
  const rowCount = Math.ceil(data.length / BYTES_PER_ROW);

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
              {Array.from(rowBytes, (byte, i) => (
                <span
                  key={i}
                  className={byte === 0 ? "text-muted-foreground/40" : "text-foreground"}
                >
                  {byteToHex(byte)}
                  {i < rowBytes.length - 1 ? " " : ""}
                </span>
              ))}
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
