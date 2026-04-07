import type { HostCallInfo } from "@pvmdbg/types";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useStableCallback } from "../../../hooks/useStableCallback";
import { FETCH_KIND_INFO, type FetchKind } from "../../../lib/fetch-codec";
import { computeDefaultEncodedBlob } from "../../../lib/fetch-defaults";
import type { HostCallEffects } from "../../../lib/fetch-utils";
import { computeFetchEffects } from "../../../lib/fetch-utils";
import { RawEditor } from "./fetch/RawEditor";
import { SlicePreview } from "./fetch/SlicePreview";
import { StructEditor } from "./fetch/StructEditor";
import { TraceView } from "./fetch/TraceView";

type Mode = "trace" | "raw" | "struct";

interface FetchHostCallProps {
  info: HostCallInfo;
  onEffectsReady: (effects: HostCallEffects) => void;
  traceVersion: number;
}

/**
 * Extract trace data from the resume proposal's memory writes.
 * Returns the memory write data bytes if present, else empty.
 */
function getTraceData(info: HostCallInfo): Uint8Array {
  const proposal = info.resumeProposal;
  if (!proposal || proposal.memoryWrites.length === 0) return new Uint8Array(0);
  return new Uint8Array(proposal.memoryWrites[0].data);
}

/**
 * Get the authoritative total response length from the r7 proposal write.
 * This is the full response length, NOT traceData.length (which is the slice).
 */
function getTraceTotalLength(info: HostCallInfo): number {
  const proposal = info.resumeProposal;
  if (!proposal) return 0;
  const r7 = proposal.registerWrites.get(7);
  if (r7 === undefined) return 0;
  return Number(r7);
}

export function FetchHostCall({
  info,
  onEffectsReady,
  traceVersion,
}: FetchHostCallProps) {
  const regs = info.currentState.registers;
  const destAddr = Number(regs[7] ?? 0n);
  const offset = Number(regs[8] ?? 0n);
  const maxLen = Number(regs[9] ?? 0n);
  const kindNum = Number(regs[10] ?? 0n);
  const kind = (kindNum >= 0 && kindNum <= 15 ? kindNum : 0) as FetchKind;
  const kindInfo = FETCH_KIND_INFO[kind];

  const hasProposal = !!info.resumeProposal;
  const traceData = useMemo(() => getTraceData(info), [info]);
  const traceTotalLength = useMemo(() => getTraceTotalLength(info), [info]);

  // Compute the initial blob eagerly: use trace data when available,
  // otherwise encode the struct defaults for this kind synchronously.
  // This avoids any race with StructEditor's async effect reporting.
  const initialBlob = useMemo(
    () => (hasProposal ? traceData : computeDefaultEncodedBlob(kind)),
    [hasProposal, traceData, kind],
  );

  // Mode state
  const [mode, setMode] = useState<Mode>(hasProposal ? "trace" : "struct");
  const [blob, setBlob] = useState<Uint8Array>(initialBlob);

  // For Trace→Struct and Raw→Struct: the blob to decode
  const [structInitialBlob, setStructInitialBlob] = useState<
    Uint8Array | undefined
  >(undefined);

  // Reset state on traceVersion change
  useEffect(() => {
    setMode(hasProposal ? "trace" : "struct");
    setBlob(initialBlob);
    setStructInitialBlob(undefined);
  }, [traceVersion, hasProposal, initialBlob]);

  const stableOnEffects = useStableCallback(onEffectsReady);

  // Compute and report effects whenever blob changes
  useEffect(() => {
    const effects = computeFetchEffects(blob, false, destAddr, offset, maxLen);
    stableOnEffects(effects);
  }, [blob, destAddr, offset, maxLen, stableOnEffects]);

  // Mode switching with data preservation
  const handleModeChange = useCallback(
    (newMode: Mode) => {
      if (newMode === mode) return;

      if (mode === "struct" && (newMode === "raw" || newMode === "trace")) {
        // Struct→Raw: blob is already current (updated by StructEditor via onBlobChange)
      } else if (mode === "raw" && newMode === "struct") {
        // Raw→Struct: pass current blob as initialBlob for decoding
        setStructInitialBlob(new Uint8Array(blob));
      } else if (mode === "trace" && newMode === "raw") {
        // Trace→Raw: copy trace data into blob
        setBlob(traceData);
      } else if (mode === "trace" && newMode === "struct") {
        // Trace→Struct: decode trace data into struct fields
        setBlob(traceData);
        setStructInitialBlob(new Uint8Array(traceData));
      }

      setMode(newMode);
    },
    [mode, blob, traceData],
  );

  const handleRawBlobChange = useCallback((newBlob: Uint8Array) => {
    setBlob(newBlob);
  }, []);

  const handleStructBlobChange = useCallback((newBlob: Uint8Array) => {
    setBlob(newBlob);
  }, []);

  return (
    <div data-testid="fetch-host-call" className="flex flex-col gap-3 text-xs">
      {/* Kind description */}
      <div
        data-testid="fetch-kind-description"
        className="text-xs text-muted-foreground"
      >
        <span className="font-semibold text-foreground">
          Kind {kindNum}: {kindInfo.name}
        </span>
        <span className="ml-2">{kindInfo.description}</span>
      </div>

      {/* Mode tabs */}
      <div data-testid="fetch-mode-tabs" className="flex gap-1">
        {hasProposal && (
          <button
            data-testid="fetch-mode-trace"
            className={`cursor-pointer rounded px-2 py-0.5 text-[10px] font-medium ${mode === "trace" ? "bg-blue-500/20 text-blue-300" : "bg-muted text-muted-foreground"}`}
            onClick={() => handleModeChange("trace")}
          >
            Trace
          </button>
        )}
        <button
          data-testid="fetch-mode-raw"
          className={`cursor-pointer rounded px-2 py-0.5 text-[10px] font-medium ${mode === "raw" ? "bg-blue-500/20 text-blue-300" : "bg-muted text-muted-foreground"}`}
          onClick={() => handleModeChange("raw")}
        >
          Raw
        </button>
        <button
          data-testid="fetch-mode-struct"
          className={`cursor-pointer rounded px-2 py-0.5 text-[10px] font-medium ${mode === "struct" ? "bg-blue-500/20 text-blue-300" : "bg-muted text-muted-foreground"}`}
          onClick={() => handleModeChange("struct")}
        >
          Struct
        </button>
      </div>

      {/* Mode content */}
      {mode === "trace" && (
        <TraceView traceData={traceData} traceTotalLength={traceTotalLength} />
      )}
      {mode === "raw" && (
        <RawEditor blob={blob} onBlobChange={handleRawBlobChange} />
      )}
      {mode === "struct" && (
        <StructEditor
          kind={kind}
          initialBlob={structInitialBlob}
          onBlobChange={handleStructBlobChange}
        />
      )}

      {/* Slice preview */}
      <SlicePreview
        totalBytes={blob.length}
        offset={offset}
        maxLen={maxLen}
        destAddr={destAddr}
      />
    </div>
  );
}
