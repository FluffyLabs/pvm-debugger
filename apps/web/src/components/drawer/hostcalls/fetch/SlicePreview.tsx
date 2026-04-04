interface SlicePreviewProps {
  totalBytes: number;
  offset: number;
  maxLen: number;
  destAddr: number;
}

/**
 * Visual preview of which portion of the full blob gets written to memory.
 * Shows a progress bar with colored segments and text summary.
 */
export function SlicePreview({ totalBytes, offset, maxLen, destAddr }: SlicePreviewProps) {
  if (totalBytes === 0) {
    return (
      <div data-testid="slice-preview" className="text-xs text-muted-foreground">
        Empty response (0 bytes)
      </div>
    );
  }

  const sliceStart = Math.min(offset, totalBytes);
  const sliceEnd = Math.min(offset + maxLen, totalBytes);
  const sliceLen = sliceEnd - sliceStart;

  const skipPct = (sliceStart / totalBytes) * 100;
  const writePct = (sliceLen / totalBytes) * 100;

  return (
    <div data-testid="slice-preview" className="flex flex-col gap-1">
      {/* Progress bar */}
      <div className="h-2 w-full rounded bg-muted overflow-hidden flex">
        {skipPct > 0 && (
          <div className="bg-muted-foreground/30" style={{ width: `${skipPct}%` }} />
        )}
        {writePct > 0 && (
          <div className="bg-blue-500" style={{ width: `${writePct}%` }} />
        )}
      </div>

      {/* Text summary */}
      <div className="text-xs text-muted-foreground font-mono">
        Slice: [{sliceStart}..{sliceEnd}) of {totalBytes} bytes
        {sliceLen > 0 && (
          <span className="ml-2">
            to 0x{destAddr.toString(16)}
          </span>
        )}
      </div>
    </div>
  );
}
