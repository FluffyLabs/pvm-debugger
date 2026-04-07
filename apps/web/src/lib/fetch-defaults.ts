/**
 * Default values for all fetch variant editors.
 * Uses small testnet values from pvm-debugger.
 */

import {
  FetchKind,
  encodeVariantData,
  type ProtocolConstants,
  type WorkItemSummary,
  type RefinementContext,
  type Operand,
  type Transfer,
  type WorkItem,
  type WorkPackageData,
} from "./fetch-codec";

const ZERO_HASH = new Uint8Array(32);

export const DEFAULT_PROTOCOL_CONSTANTS: ProtocolConstants = {
  electiveItemBalance: 100000n,
  electiveByteBalance: 100n,
  baseServiceBalance: 1000000n,
  coreCount: 2,
  preimageExpungePeriod: 7200,
  epochLength: 12,
  gasAccumulateReport: 100000n,
  gasIsAuthorized: 100000n,
  gasMaxRefine: 500000n,
  gasMaxBlock: 15000000n,
  recentHistoryLength: 8,
  maxWorkItems: 4,
  maxReportDeps: 8,
  maxTicketsPerExtrinsic: 16,
  maxLookupAnchorAge: 14400,
  ticketsPerValidator: 2,
  maxAuthorizersPerCore: 8,
  slotDuration: 6,
  authorizersQueueSize: 80,
  rotationPeriod: 10,
  maxExtrinsicsPerWorkItem: 4,
  reportTimeoutGracePeriod: 10,
  validatorsCount: 6,
  maxAuthorizerCodeSize: 65536,
  maxBundleSize: 12582912,
  maxServiceCodeSize: 4194304,
  erasureCodedPieceSize: 684,
  maxImportSegments: 2048,
  ecPiecesPerSegment: 6,
  maxWorkReportSize: 4096,
  transferMemoSize: 128,
  maxExportSegments: 2048,
  contestLength: 4,
};

export const DEFAULT_WORK_ITEM_SUMMARY: WorkItemSummary = {
  serviceindex: 0,
  codehash: new Uint8Array(32),
  refgaslimit: 500000n,
  accgaslimit: 100000n,
  exportcount: 0,
  importsegmentsCount: 0,
  extrinsicsCount: 0,
  payloadLength: 0,
};

export const DEFAULT_REFINEMENT_CONTEXT: RefinementContext = {
  anchorhash: new Uint8Array(32),
  anchorpoststate: new Uint8Array(32),
  anchoraccoutlog: new Uint8Array(32),
  lookupanchorhash: new Uint8Array(32),
  lookupanchortime: 0,
  prerequisites: [],
};

export const DEFAULT_OPERAND: Operand = {
  tag: "operand",
  packagehash: new Uint8Array(32),
  segroot: new Uint8Array(32),
  authorizer: new Uint8Array(32),
  payloadhash: new Uint8Array(32),
  gaslimit: 500000n,
  result: { kind: 0, blob: new Uint8Array(0) },
  authtrace: new Uint8Array(0),
};

export const DEFAULT_TRANSFER: Transfer = {
  tag: "transfer",
  source: 0,
  dest: 0,
  amount: 0n,
  memo: new Uint8Array(128),
  gas: 0n,
};

export const DEFAULT_WORK_ITEM: WorkItem = {
  serviceindex: 0,
  codehash: new Uint8Array(32),
  refgaslimit: 500000n,
  accgaslimit: 100000n,
  exportcount: 0,
  payload: new Uint8Array(0),
  importsegments: [],
  extrinsics: [],
};

export const DEFAULT_WORK_PACKAGE: WorkPackageData = {
  authcodehost: 0,
  authcodehash: new Uint8Array(32),
  context: { ...DEFAULT_REFINEMENT_CONTEXT },
  authtoken: new Uint8Array(0),
  authconfig: new Uint8Array(0),
  workitems: [],
};

/**
 * Eagerly compute the encoded blob for a given FetchKind using the same
 * defaults that StructEditor initializes with.  This allows FetchHostCall
 * to start with a correct blob on render 1 instead of waiting for
 * StructEditor to report asynchronously via an effect.
 */
export function computeDefaultEncodedBlob(kind: FetchKind): Uint8Array {
  switch (kind) {
    case FetchKind.Constants:
      return encodeVariantData({ kind, data: DEFAULT_PROTOCOL_CONSTANTS });
    case FetchKind.Entropy:
      return encodeVariantData({ kind, data: new Uint8Array(32) });
    case FetchKind.AuthorizerTrace:
    case FetchKind.OtherWorkItemExtrinsics:
    case FetchKind.MyExtrinsics:
    case FetchKind.OtherWorkItemImports:
    case FetchKind.MyImports:
    case FetchKind.Authorizer:
    case FetchKind.AuthorizationToken:
    case FetchKind.WorkItemPayload:
      return new Uint8Array(0);
    case FetchKind.WorkPackage:
      return encodeVariantData({ kind, data: DEFAULT_WORK_PACKAGE });
    case FetchKind.RefineContext:
      return encodeVariantData({ kind, data: DEFAULT_REFINEMENT_CONTEXT });
    case FetchKind.AllWorkItems:
      return encodeVariantData({ kind, data: [] as WorkItemSummary[] });
    case FetchKind.OneWorkItem:
      return encodeVariantData({ kind, data: DEFAULT_WORK_ITEM_SUMMARY });
    case FetchKind.AllTransfersAndOperands:
      return encodeVariantData({ kind, data: [] });
    case FetchKind.OneTransferOrOperand:
      return encodeVariantData({ kind, data: DEFAULT_OPERAND });
    default:
      return new Uint8Array(0);
  }
}
