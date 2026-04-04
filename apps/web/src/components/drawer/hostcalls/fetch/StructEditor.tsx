import { useState, useMemo, useEffect, useRef } from "react";
import { toHex } from "@pvmdbg/types";
import {
  FetchKind,
  tryDecodeBlob,
  encodeVariantData,
  type ProtocolConstants,
  type RefinementContext,
  type WorkItemSummary,
  type TransferOrOperand,
  type WorkPackageData,
} from "../../../../lib/fetch-codec";
import {
  DEFAULT_PROTOCOL_CONSTANTS,
  DEFAULT_WORK_ITEM_SUMMARY,
  DEFAULT_REFINEMENT_CONTEXT,
  DEFAULT_OPERAND,
  DEFAULT_WORK_PACKAGE,
} from "../../../../lib/fetch-defaults";
import { useStableCallback } from "../../../../hooks/useStableCallback";
import { ProtocolConstantsEditor } from "./ProtocolConstantsEditor";
import { WorkItemInfoEditor } from "./WorkItemInfoEditor";
import { RefinementContextEditor } from "./RefinementContextEditor";
import { AuthorizerInfoEditor } from "./AuthorizerInfoEditor";
import { TransferOrOperandEditor } from "./TransferOrOperandEditor";
import { AllWorkItemsEditor } from "./AllWorkItemsEditor";
import { AllTransfersEditor } from "./AllTransfersEditor";
import { WorkPackageEditor } from "./WorkPackageEditor";
import { BytesBlobEditor } from "./BytesBlobEditor";

interface StructEditorProps {
  kind: FetchKind;
  /** Initial blob to decode into struct fields (for Raw→Struct / Trace→Struct). */
  initialBlob?: Uint8Array;
  onBlobChange: (blob: Uint8Array) => void;
}

function areBytesEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

/**
 * Centralized struct editor for all fetch variants.
 * Manages all variant state, computes encoded blob via useMemo,
 * and only notifies parent onBlobChange when actual bytes differ.
 */
export function StructEditor({ kind, initialBlob, onBlobChange }: StructEditorProps) {
  // Per-variant state
  const [constants, setConstants] = useState<ProtocolConstants>(DEFAULT_PROTOCOL_CONSTANTS);
  const [entropy, setEntropy] = useState<Uint8Array>(new Uint8Array(32));
  const [blobData, setBlobData] = useState<Uint8Array>(new Uint8Array(0));
  const [refinementCtx, setRefinementCtx] = useState<RefinementContext>(DEFAULT_REFINEMENT_CONTEXT);
  const [workItemSummary, setWorkItemSummary] = useState<WorkItemSummary>(DEFAULT_WORK_ITEM_SUMMARY);
  const [allWorkItems, setAllWorkItems] = useState<WorkItemSummary[]>([]);
  const [transferOrOperand, setTransferOrOperand] = useState<TransferOrOperand>(DEFAULT_OPERAND);
  const [allTransfers, setAllTransfers] = useState<TransferOrOperand[]>([]);
  const [workPackage, setWorkPackage] = useState<WorkPackageData>(DEFAULT_WORK_PACKAGE);

  // Track decoded initial blob to prevent re-decoding
  const decodedBlobRef = useRef<Uint8Array | null>(null);

  // Decode initialBlob when it changes
  useEffect(() => {
    if (!initialBlob || initialBlob.length === 0) return;
    if (decodedBlobRef.current && areBytesEqual(decodedBlobRef.current, initialBlob)) return;
    decodedBlobRef.current = new Uint8Array(initialBlob);

    const result = tryDecodeBlob(kind, initialBlob);
    if (!result) return;

    switch (result.kind) {
      case FetchKind.Constants: setConstants(result.data); break;
      case FetchKind.Entropy: setEntropy(result.data); break;
      case FetchKind.AuthorizerTrace:
      case FetchKind.OtherWorkItemExtrinsics:
      case FetchKind.MyExtrinsics:
      case FetchKind.OtherWorkItemImports:
      case FetchKind.MyImports:
      case FetchKind.Authorizer:
      case FetchKind.AuthorizationToken:
      case FetchKind.WorkItemPayload:
        setBlobData(result.data as Uint8Array); break;
      case FetchKind.WorkPackage: setWorkPackage(result.data); break;
      case FetchKind.RefineContext: setRefinementCtx(result.data); break;
      case FetchKind.AllWorkItems: setAllWorkItems(result.data); break;
      case FetchKind.OneWorkItem: setWorkItemSummary(result.data); break;
      case FetchKind.AllTransfersAndOperands: setAllTransfers(result.data); break;
      case FetchKind.OneTransferOrOperand: setTransferOrOperand(result.data); break;
    }
  }, [initialBlob, kind]);

  // Centralized encoding: compute blob from active variant's state
  const encodedBlob = useMemo((): Uint8Array => {
    switch (kind) {
      case FetchKind.Constants:
        return encodeVariantData({ kind, data: constants });
      case FetchKind.Entropy:
        return encodeVariantData({ kind, data: entropy });
      case FetchKind.AuthorizerTrace:
      case FetchKind.OtherWorkItemExtrinsics:
      case FetchKind.MyExtrinsics:
      case FetchKind.OtherWorkItemImports:
      case FetchKind.MyImports:
      case FetchKind.Authorizer:
      case FetchKind.AuthorizationToken:
      case FetchKind.WorkItemPayload:
        return encodeVariantData({ kind, data: blobData } as { kind: FetchKind.AuthorizerTrace; data: Uint8Array });
      case FetchKind.WorkPackage:
        return encodeVariantData({ kind, data: workPackage });
      case FetchKind.RefineContext:
        return encodeVariantData({ kind, data: refinementCtx });
      case FetchKind.AllWorkItems:
        return encodeVariantData({ kind, data: allWorkItems });
      case FetchKind.OneWorkItem:
        return encodeVariantData({ kind, data: workItemSummary });
      case FetchKind.AllTransfersAndOperands:
        return encodeVariantData({ kind, data: allTransfers });
      case FetchKind.OneTransferOrOperand:
        return encodeVariantData({ kind, data: transferOrOperand });
      default:
        return new Uint8Array(0);
    }
  }, [kind, constants, entropy, blobData, refinementCtx, workItemSummary, allWorkItems, transferOrOperand, allTransfers, workPackage]);

  // Notify parent only when encoded bytes actually change
  const lastBlobRef = useRef<Uint8Array>(new Uint8Array(0));
  const stableOnBlobChange = useStableCallback(onBlobChange);

  useEffect(() => {
    if (!areBytesEqual(lastBlobRef.current, encodedBlob)) {
      lastBlobRef.current = encodedBlob;
      stableOnBlobChange(encodedBlob);
    }
  }, [encodedBlob, stableOnBlobChange]);

  // Render the appropriate variant editor
  const editor = (() => {
    switch (kind) {
      case FetchKind.Constants:
        return <ProtocolConstantsEditor value={constants} onChange={setConstants} />;
      case FetchKind.Entropy:
        return (
          <div className="flex flex-col gap-1">
            <span className="text-[10px] text-muted-foreground">32-byte entropy hash</span>
            <BytesBlobEditor value={entropy} onChange={setEntropy} defaultSize={32} />
          </div>
        );
      case FetchKind.AuthorizerTrace:
      case FetchKind.OtherWorkItemExtrinsics:
      case FetchKind.MyExtrinsics:
      case FetchKind.OtherWorkItemImports:
      case FetchKind.MyImports:
      case FetchKind.Authorizer:
      case FetchKind.AuthorizationToken:
      case FetchKind.WorkItemPayload:
        return <BytesBlobEditor value={blobData} onChange={setBlobData} />;
      case FetchKind.WorkPackage:
        return <WorkPackageEditor value={workPackage} onChange={setWorkPackage} />;
      case FetchKind.RefineContext:
        return <RefinementContextEditor value={refinementCtx} onChange={setRefinementCtx} />;
      case FetchKind.AllWorkItems:
        return <AllWorkItemsEditor value={allWorkItems} onChange={setAllWorkItems} />;
      case FetchKind.OneWorkItem:
        return <WorkItemInfoEditor value={workItemSummary} onChange={setWorkItemSummary} />;
      case FetchKind.AllTransfersAndOperands:
        return <AllTransfersEditor value={allTransfers} onChange={setAllTransfers} />;
      case FetchKind.OneTransferOrOperand:
        return <TransferOrOperandEditor value={transferOrOperand} onChange={setTransferOrOperand} />;
      default:
        return <div className="text-xs text-muted-foreground italic">Unknown kind</div>;
    }
  })();

  return (
    <div data-testid="struct-editor" className="flex flex-col gap-3">
      {editor}

      {/* Encoded output preview */}
      <div data-testid="struct-encoded-output" className="border-t border-border pt-2">
        <div className="text-[10px] text-muted-foreground mb-1">
          Encoded output ({encodedBlob.length} bytes)
        </div>
        <div className="max-h-[80px] overflow-auto rounded bg-muted/30 px-2 py-1 font-mono text-[10px] break-all text-foreground">
          {toHex(encodedBlob)}
        </div>
      </div>
    </div>
  );
}
