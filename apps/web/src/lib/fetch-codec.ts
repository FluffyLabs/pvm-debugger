/**
 * Fetch Host Call Codec — all 16 fetch variant structs with TypeScript interfaces,
 * encode, and decode per GP §B.5 / Appendix D.
 */

import {
  type DecodeResult,
  tryDecode,
  encodeU8,
  decodeU8,
  encodeU16LE,
  decodeU16LE,
  encodeU32LE,
  decodeU32LE,
  encodeU64LE,
  decodeU64LE,
  encodeBytes32,
  decodeBytes32,
  encodeBytesVarLen,
  decodeBytesVarLen,
  encodeSequenceVarLen,
  decodeSequenceVarLen,
  encodeVarU64,
  decodeVarU64,
} from "@pvmdbg/types";

// ---------------------------------------------------------------------------
// FetchKind enum & info
// ---------------------------------------------------------------------------

export enum FetchKind {
  Constants = 0,
  Entropy = 1,
  AuthorizerTrace = 2,
  OtherWorkItemExtrinsics = 3,
  MyExtrinsics = 4,
  OtherWorkItemImports = 5,
  MyImports = 6,
  WorkPackage = 7,
  Authorizer = 8,
  AuthorizationToken = 9,
  RefineContext = 10,
  AllWorkItems = 11,
  OneWorkItem = 12,
  WorkItemPayload = 13,
  AllTransfersAndOperands = 14,
  OneTransferOrOperand = 15,
}

export interface FetchKindInfo {
  name: string;
  description: string;
}

export const FETCH_KIND_INFO: Record<FetchKind, FetchKindInfo> = {
  [FetchKind.Constants]: { name: "Constants", description: "134-byte protocol constants encoding (c)" },
  [FetchKind.Entropy]: { name: "Entropy", description: "32-byte entropy hash (context-dependent: hash in accumulate, zero in refine, ⊥ in is-auth)" },
  [FetchKind.AuthorizerTrace]: { name: "AuthorizerTrace", description: "Authorizer output trace blob (refine only)" },
  [FetchKind.OtherWorkItemExtrinsics]: { name: "OtherWorkItemExtrinsics", description: "Extrinsic blob from another work item (x̄[ω₁₁]_{ω₁₂}, refine only)" },
  [FetchKind.MyExtrinsics]: { name: "MyExtrinsics", description: "Current work item's extrinsic at index ω₁₁ (refine only)" },
  [FetchKind.OtherWorkItemImports]: { name: "OtherWorkItemImports", description: "Import segment from another work item (ī[ω₁₁]_{ω₁₂}, refine only)" },
  [FetchKind.MyImports]: { name: "MyImports", description: "Current work item's import at index ω₁₁ (refine only)" },
  [FetchKind.WorkPackage]: { name: "WorkPackage", description: "Full encoded work package (encode(p), refine + is-auth)" },
  [FetchKind.Authorizer]: { name: "Authorizer", description: "Authorization configuration blob (p.authconfig, refine + is-auth)" },
  [FetchKind.AuthorizationToken]: { name: "AuthorizationToken", description: "Authorization token blob (p.authtoken, refine + is-auth)" },
  [FetchKind.RefineContext]: { name: "RefineContext", description: "Encoded work-package context (encode(p.context), refine + is-auth)" },
  [FetchKind.AllWorkItems]: { name: "AllWorkItems", description: "All work item summaries as VarU64-counted sequence (refine + is-auth)" },
  [FetchKind.OneWorkItem]: { name: "OneWorkItem", description: "One work item summary (62 bytes fixed, S(p.workitems[ω₁₁]), refine + is-auth)" },
  [FetchKind.WorkItemPayload]: { name: "WorkItemPayload", description: "Work item payload blob (p.workitems[ω₁₁].payload, refine + is-auth)" },
  [FetchKind.AllTransfersAndOperands]: { name: "AllTransfersAndOperands", description: "All accumulation inputs as VarU64-counted sequence (accumulate only)" },
  [FetchKind.OneTransferOrOperand]: { name: "OneTransferOrOperand", description: "One accumulation input — operand or transfer (accumulate only)" },
};

// ---------------------------------------------------------------------------
// Kind 0 — ProtocolConstants (134 bytes fixed)
// ---------------------------------------------------------------------------

export interface ProtocolConstants {
  electiveItemBalance: bigint;      // B_I, u64
  electiveByteBalance: bigint;      // B_L, u64
  baseServiceBalance: bigint;       // B_S, u64
  coreCount: number;                // C, u16
  preimageExpungePeriod: number;    // D, u32
  epochLength: number;              // E, u32
  gasAccumulateReport: bigint;      // G_A, u64
  gasIsAuthorized: bigint;          // G_I, u64
  gasMaxRefine: bigint;             // G_R, u64
  gasMaxBlock: bigint;              // G_T, u64
  recentHistoryLength: number;      // H, u16
  maxWorkItems: number;             // I, u16
  maxReportDeps: number;            // J, u16
  maxTicketsPerExtrinsic: number;   // K, u16
  maxLookupAnchorAge: number;       // L, u32
  ticketsPerValidator: number;      // N, u16
  maxAuthorizersPerCore: number;    // O, u16
  slotDuration: number;             // P, u16
  authorizersQueueSize: number;     // Q, u16
  rotationPeriod: number;           // R, u16
  maxExtrinsicsPerWorkItem: number; // T, u16
  reportTimeoutGracePeriod: number; // U, u16
  validatorsCount: number;          // V, u16
  maxAuthorizerCodeSize: number;    // W_A, u32
  maxBundleSize: number;            // W_B, u32
  maxServiceCodeSize: number;       // W_C, u32
  erasureCodedPieceSize: number;    // W_E, u32
  maxImportSegments: number;        // W_M, u32
  ecPiecesPerSegment: number;       // W_P, u32
  maxWorkReportSize: number;        // W_R, u32
  transferMemoSize: number;         // W_T, u32
  maxExportSegments: number;        // W_X, u32
  contestLength: number;            // Y, u32
}

export const PROTOCOL_CONSTANTS_SIZE = 134;

export function encodeProtocolConstants(c: ProtocolConstants): Uint8Array {
  const buf = new Uint8Array(PROTOCOL_CONSTANTS_SIZE);
  const parts: Uint8Array[] = [
    encodeU64LE(c.electiveItemBalance),
    encodeU64LE(c.electiveByteBalance),
    encodeU64LE(c.baseServiceBalance),
    encodeU16LE(c.coreCount),
    encodeU32LE(c.preimageExpungePeriod),
    encodeU32LE(c.epochLength),
    encodeU64LE(c.gasAccumulateReport),
    encodeU64LE(c.gasIsAuthorized),
    encodeU64LE(c.gasMaxRefine),
    encodeU64LE(c.gasMaxBlock),
    encodeU16LE(c.recentHistoryLength),
    encodeU16LE(c.maxWorkItems),
    encodeU16LE(c.maxReportDeps),
    encodeU16LE(c.maxTicketsPerExtrinsic),
    encodeU32LE(c.maxLookupAnchorAge),
    encodeU16LE(c.ticketsPerValidator),
    encodeU16LE(c.maxAuthorizersPerCore),
    encodeU16LE(c.slotDuration),
    encodeU16LE(c.authorizersQueueSize),
    encodeU16LE(c.rotationPeriod),
    encodeU16LE(c.maxExtrinsicsPerWorkItem),
    encodeU16LE(c.reportTimeoutGracePeriod),
    encodeU16LE(c.validatorsCount),
    encodeU32LE(c.maxAuthorizerCodeSize),
    encodeU32LE(c.maxBundleSize),
    encodeU32LE(c.maxServiceCodeSize),
    encodeU32LE(c.erasureCodedPieceSize),
    encodeU32LE(c.maxImportSegments),
    encodeU32LE(c.ecPiecesPerSegment),
    encodeU32LE(c.maxWorkReportSize),
    encodeU32LE(c.transferMemoSize),
    encodeU32LE(c.maxExportSegments),
    encodeU32LE(c.contestLength),
  ];
  let off = 0;
  for (const p of parts) {
    buf.set(p, off);
    off += p.length;
  }
  return buf;
}

export function decodeProtocolConstants(bytes: Uint8Array, offset: number = 0): DecodeResult<ProtocolConstants> | null {
  if (offset + PROTOCOL_CONSTANTS_SIZE > bytes.length) return null;
  try {
    let off = offset;
    const r64 = () => { const r = decodeU64LE(bytes, off); off += r.bytesRead; return r.value; };
    const r32 = () => { const r = decodeU32LE(bytes, off); off += r.bytesRead; return r.value; };
    const r16 = () => { const r = decodeU16LE(bytes, off); off += r.bytesRead; return r.value; };

    const value: ProtocolConstants = {
      electiveItemBalance: r64(),
      electiveByteBalance: r64(),
      baseServiceBalance: r64(),
      coreCount: r16(),
      preimageExpungePeriod: r32(),
      epochLength: r32(),
      gasAccumulateReport: r64(),
      gasIsAuthorized: r64(),
      gasMaxRefine: r64(),
      gasMaxBlock: r64(),
      recentHistoryLength: r16(),
      maxWorkItems: r16(),
      maxReportDeps: r16(),
      maxTicketsPerExtrinsic: r16(),
      maxLookupAnchorAge: r32(),
      ticketsPerValidator: r16(),
      maxAuthorizersPerCore: r16(),
      slotDuration: r16(),
      authorizersQueueSize: r16(),
      rotationPeriod: r16(),
      maxExtrinsicsPerWorkItem: r16(),
      reportTimeoutGracePeriod: r16(),
      validatorsCount: r16(),
      maxAuthorizerCodeSize: r32(),
      maxBundleSize: r32(),
      maxServiceCodeSize: r32(),
      erasureCodedPieceSize: r32(),
      maxImportSegments: r32(),
      ecPiecesPerSegment: r32(),
      maxWorkReportSize: r32(),
      transferMemoSize: r32(),
      maxExportSegments: r32(),
      contestLength: r32(),
    };
    return { value, bytesRead: off - offset };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Kind 10 — RefinementContext (WorkContext)
// ---------------------------------------------------------------------------

export interface RefinementContext {
  anchorhash: Uint8Array;         // 32 bytes
  anchorpoststate: Uint8Array;    // 32 bytes
  anchoraccoutlog: Uint8Array;    // 32 bytes
  lookupanchorhash: Uint8Array;   // 32 bytes
  lookupanchortime: number;       // u32 timeslot
  prerequisites: Uint8Array[];    // var-len sequence of 32-byte hashes
}

export function encodeRefinementContext(ctx: RefinementContext): Uint8Array {
  const parts: Uint8Array[] = [
    encodeBytes32(ctx.anchorhash),
    encodeBytes32(ctx.anchorpoststate),
    encodeBytes32(ctx.anchoraccoutlog),
    encodeBytes32(ctx.lookupanchorhash),
    encodeU32LE(ctx.lookupanchortime),
    encodeSequenceVarLen(ctx.prerequisites, (h) => encodeBytes32(h)),
  ];
  const totalLen = parts.reduce((s, p) => s + p.length, 0);
  const result = new Uint8Array(totalLen);
  let off = 0;
  for (const p of parts) {
    result.set(p, off);
    off += p.length;
  }
  return result;
}

export function decodeRefinementContext(bytes: Uint8Array, offset: number = 0): DecodeResult<RefinementContext> | null {
  try {
    let off = offset;
    const h1 = decodeBytes32(bytes, off); off += h1.bytesRead;
    const h2 = decodeBytes32(bytes, off); off += h2.bytesRead;
    const h3 = decodeBytes32(bytes, off); off += h3.bytesRead;
    const h4 = decodeBytes32(bytes, off); off += h4.bytesRead;
    const ts = decodeU32LE(bytes, off); off += ts.bytesRead;
    const prereqs = decodeSequenceVarLen(bytes, off, (b, o) => decodeBytes32(b, o));
    off += prereqs.bytesRead;
    return {
      value: {
        anchorhash: h1.value,
        anchorpoststate: h2.value,
        anchoraccoutlog: h3.value,
        lookupanchorhash: h4.value,
        lookupanchortime: ts.value,
        prerequisites: prereqs.value,
      },
      bytesRead: off - offset,
    };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// ImportRef (GP I# encoding: 32B hash + u16, high bit discriminates)
// ---------------------------------------------------------------------------

export interface ImportRef {
  hash: Uint8Array;       // 32 bytes
  index: number;          // u16 index (without high bit)
  isWorkPackageHash: boolean;  // high bit of u16
}

export function encodeImportRef(ref: ImportRef): Uint8Array {
  const result = new Uint8Array(34);
  result.set(encodeBytes32(ref.hash), 0);
  const rawIndex = ref.isWorkPackageHash ? (ref.index | 0x8000) : ref.index;
  result.set(encodeU16LE(rawIndex), 32);
  return result;
}

export function decodeImportRef(bytes: Uint8Array, offset: number = 0): DecodeResult<ImportRef> {
  const hash = decodeBytes32(bytes, offset);
  const idx = decodeU16LE(bytes, offset + 32);
  const rawIndex = idx.value;
  return {
    value: {
      hash: hash.value,
      index: rawIndex & 0x7FFF,
      isWorkPackageHash: (rawIndex & 0x8000) !== 0,
    },
    bytesRead: 34,
  };
}

// ---------------------------------------------------------------------------
// ExtrinsicRef (GP: hash(32B) + u32 length)
// ---------------------------------------------------------------------------

export interface ExtrinsicRef {
  hash: Uint8Array;  // 32 bytes
  length: number;    // u32
}

export function encodeExtrinsicRef(ref: ExtrinsicRef): Uint8Array {
  const result = new Uint8Array(36);
  result.set(encodeBytes32(ref.hash), 0);
  result.set(encodeU32LE(ref.length), 32);
  return result;
}

export function decodeExtrinsicRef(bytes: Uint8Array, offset: number = 0): DecodeResult<ExtrinsicRef> {
  const hash = decodeBytes32(bytes, offset);
  const len = decodeU32LE(bytes, offset + 32);
  return {
    value: { hash: hash.value, length: len.value },
    bytesRead: 36,
  };
}

// ---------------------------------------------------------------------------
// WorkItem (GP line 4463-4476)
// ---------------------------------------------------------------------------

export interface WorkItem {
  serviceindex: number;       // u32
  codehash: Uint8Array;       // 32 bytes
  refgaslimit: bigint;        // u64
  accgaslimit: bigint;        // u64
  exportcount: number;        // u16 (NOT VarU64!)
  payload: Uint8Array;        // var-len blob
  importsegments: ImportRef[];// var-len sequence of I#-encoded imports
  extrinsics: ExtrinsicRef[]; // var-len sequence of ExtrinsicRef
}

export function encodeWorkItem(item: WorkItem): Uint8Array {
  const parts: Uint8Array[] = [
    encodeU32LE(item.serviceindex),
    encodeBytes32(item.codehash),
    encodeU64LE(item.refgaslimit),
    encodeU64LE(item.accgaslimit),
    encodeU16LE(item.exportcount),
    encodeBytesVarLen(item.payload),
    encodeSequenceVarLen(item.importsegments, encodeImportRef),
    encodeSequenceVarLen(item.extrinsics, encodeExtrinsicRef),
  ];
  const totalLen = parts.reduce((s, p) => s + p.length, 0);
  const result = new Uint8Array(totalLen);
  let off = 0;
  for (const p of parts) {
    result.set(p, off);
    off += p.length;
  }
  return result;
}

export function decodeWorkItem(bytes: Uint8Array, offset: number = 0): DecodeResult<WorkItem> {
  let off = offset;
  const si = decodeU32LE(bytes, off); off += si.bytesRead;
  const ch = decodeBytes32(bytes, off); off += ch.bytesRead;
  const rgl = decodeU64LE(bytes, off); off += rgl.bytesRead;
  const agl = decodeU64LE(bytes, off); off += agl.bytesRead;
  const ec = decodeU16LE(bytes, off); off += ec.bytesRead;
  const pl = decodeBytesVarLen(bytes, off); off += pl.bytesRead;
  const imp = decodeSequenceVarLen(bytes, off, decodeImportRef); off += imp.bytesRead;
  const ext = decodeSequenceVarLen(bytes, off, decodeExtrinsicRef); off += ext.bytesRead;
  return {
    value: {
      serviceindex: si.value,
      codehash: ch.value,
      refgaslimit: rgl.value,
      accgaslimit: agl.value,
      exportcount: ec.value,
      payload: pl.value,
      importsegments: imp.value,
      extrinsics: ext.value,
    },
    bytesRead: off - offset,
  };
}

// ---------------------------------------------------------------------------
// Kind 7 — WorkPackage
// ---------------------------------------------------------------------------

export interface WorkPackageData {
  authcodehost: number;       // u32 (service ID)
  authcodehash: Uint8Array;   // 32 bytes
  context: RefinementContext;
  authtoken: Uint8Array;      // var-len blob
  authconfig: Uint8Array;     // var-len blob
  workitems: WorkItem[];      // var-len sequence
}

export function encodeWorkPackage(wp: WorkPackageData): Uint8Array {
  const parts: Uint8Array[] = [
    encodeU32LE(wp.authcodehost),
    encodeBytes32(wp.authcodehash),
    encodeRefinementContext(wp.context)!,
    encodeBytesVarLen(wp.authtoken),
    encodeBytesVarLen(wp.authconfig),
    encodeSequenceVarLen(wp.workitems, encodeWorkItem),
  ];
  const totalLen = parts.reduce((s, p) => s + p.length, 0);
  const result = new Uint8Array(totalLen);
  let off = 0;
  for (const p of parts) {
    result.set(p, off);
    off += p.length;
  }
  return result;
}

export function decodeWorkPackage(bytes: Uint8Array, offset: number = 0): DecodeResult<WorkPackageData> | null {
  try {
    let off = offset;
    const ach = decodeU32LE(bytes, off); off += ach.bytesRead;
    const ahash = decodeBytes32(bytes, off); off += ahash.bytesRead;
    const ctxResult = decodeRefinementContext(bytes, off);
    if (!ctxResult) return null;
    off += ctxResult.bytesRead;
    const at = decodeBytesVarLen(bytes, off); off += at.bytesRead;
    const ac = decodeBytesVarLen(bytes, off); off += ac.bytesRead;
    const items = decodeSequenceVarLen(bytes, off, decodeWorkItem); off += items.bytesRead;
    return {
      value: {
        authcodehost: ach.value,
        authcodehash: ahash.value,
        context: ctxResult.value,
        authtoken: at.value,
        authconfig: ac.value,
        workitems: items.value,
      },
      bytesRead: off - offset,
    };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Kind 12 — WorkItemSummary (62 bytes fixed)
// ---------------------------------------------------------------------------

export interface WorkItemSummary {
  serviceindex: number;    // u32
  codehash: Uint8Array;    // 32 bytes
  refgaslimit: bigint;     // u64
  accgaslimit: bigint;     // u64
  exportcount: number;     // u16
  importsegmentsCount: number; // u16
  extrinsicsCount: number; // u16
  payloadLength: number;   // u32
}

export const WORK_ITEM_SUMMARY_SIZE = 62;

export function encodeWorkItemSummary(s: WorkItemSummary): Uint8Array {
  const buf = new Uint8Array(WORK_ITEM_SUMMARY_SIZE);
  let off = 0;
  const put = (data: Uint8Array) => { buf.set(data, off); off += data.length; };
  put(encodeU32LE(s.serviceindex));
  put(encodeBytes32(s.codehash));
  put(encodeU64LE(s.refgaslimit));
  put(encodeU64LE(s.accgaslimit));
  put(encodeU16LE(s.exportcount));
  put(encodeU16LE(s.importsegmentsCount));
  put(encodeU16LE(s.extrinsicsCount));
  put(encodeU32LE(s.payloadLength));
  return buf;
}

export function decodeWorkItemSummary(bytes: Uint8Array, offset: number = 0): DecodeResult<WorkItemSummary> | null {
  if (offset + WORK_ITEM_SUMMARY_SIZE > bytes.length) return null;
  try {
    let off = offset;
    const r32 = () => { const r = decodeU32LE(bytes, off); off += r.bytesRead; return r.value; };
    const r64 = () => { const r = decodeU64LE(bytes, off); off += r.bytesRead; return r.value; };
    const r16 = () => { const r = decodeU16LE(bytes, off); off += r.bytesRead; return r.value; };
    const h32 = () => { const r = decodeBytes32(bytes, off); off += r.bytesRead; return r.value; };

    const value: WorkItemSummary = {
      serviceindex: r32(),
      codehash: h32(),
      refgaslimit: r64(),
      accgaslimit: r64(),
      exportcount: r16(),
      importsegmentsCount: r16(),
      extrinsicsCount: r16(),
      payloadLength: r32(),
    };
    return { value, bytesRead: WORK_ITEM_SUMMARY_SIZE };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Kind 15 — TransferOrOperand (union with 1-byte tag)
// ---------------------------------------------------------------------------

/** O(result) encoding: tag byte + optional blob. */
export type ResultKind = 0 | 1 | 2 | 3 | 4 | 5 | 6;
export const RESULT_KIND_NAMES: Record<ResultKind, string> = {
  0: "OK (blob)",
  1: "OOG",
  2: "Panic",
  3: "Bad Exports",
  4: "Oversize",
  5: "BAD",
  6: "BIG",
};

export interface OResult {
  kind: ResultKind;
  blob?: Uint8Array; // only when kind === 0
}

export function encodeOResult(r: OResult): Uint8Array {
  if (r.kind === 0) {
    const tag = encodeU8(0);
    const data = encodeBytesVarLen(r.blob ?? new Uint8Array(0));
    const result = new Uint8Array(tag.length + data.length);
    result.set(tag, 0);
    result.set(data, tag.length);
    return result;
  }
  return encodeU8(r.kind);
}

export function decodeOResult(bytes: Uint8Array, offset: number = 0): DecodeResult<OResult> {
  const tag = decodeU8(bytes, offset);
  if (tag.value === 0) {
    const blob = decodeBytesVarLen(bytes, offset + 1);
    return {
      value: { kind: 0, blob: blob.value },
      bytesRead: 1 + blob.bytesRead,
    };
  }
  return { value: { kind: tag.value as ResultKind }, bytesRead: 1 };
}

export interface Operand {
  tag: "operand";
  packagehash: Uint8Array;   // 32 bytes
  segroot: Uint8Array;       // 32 bytes
  authorizer: Uint8Array;    // 32 bytes
  payloadhash: Uint8Array;   // 32 bytes
  gaslimit: bigint;          // u64
  result: OResult;
  authtrace: Uint8Array;     // var-len blob
}

export interface Transfer {
  tag: "transfer";
  source: number;    // u32
  dest: number;      // u32
  amount: bigint;    // u64
  memo: Uint8Array;  // 128 bytes fixed
  gas: bigint;       // u64
}

export const TRANSFER_MEMO_SIZE = 128;

export type TransferOrOperand = Operand | Transfer;

export function encodeTransferOrOperand(item: TransferOrOperand): Uint8Array {
  if (item.tag === "operand") {
    const parts: Uint8Array[] = [
      encodeU8(0), // tag
      encodeBytes32(item.packagehash),
      encodeBytes32(item.segroot),
      encodeBytes32(item.authorizer),
      encodeBytes32(item.payloadhash),
      encodeU64LE(item.gaslimit),
      encodeOResult(item.result),
      encodeBytesVarLen(item.authtrace),
    ];
    const totalLen = parts.reduce((s, p) => s + p.length, 0);
    const result = new Uint8Array(totalLen);
    let off = 0;
    for (const p of parts) { result.set(p, off); off += p.length; }
    return result;
  }
  // Transfer
  const memo = new Uint8Array(TRANSFER_MEMO_SIZE);
  memo.set(item.memo.subarray(0, TRANSFER_MEMO_SIZE)); // truncate if longer
  const parts: Uint8Array[] = [
    encodeU8(1), // tag
    encodeU32LE(item.source),
    encodeU32LE(item.dest),
    encodeU64LE(item.amount),
    memo,
    encodeU64LE(item.gas),
  ];
  const totalLen = parts.reduce((s, p) => s + p.length, 0);
  const result = new Uint8Array(totalLen);
  let off = 0;
  for (const p of parts) { result.set(p, off); off += p.length; }
  return result;
}

export function decodeTransferOrOperand(bytes: Uint8Array, offset: number = 0): DecodeResult<TransferOrOperand> {
  const tag = decodeU8(bytes, offset);
  let off = offset + 1;

  if (tag.value === 0) {
    // Operand
    const ph = decodeBytes32(bytes, off); off += ph.bytesRead;
    const sr = decodeBytes32(bytes, off); off += sr.bytesRead;
    const au = decodeBytes32(bytes, off); off += au.bytesRead;
    const plh = decodeBytes32(bytes, off); off += plh.bytesRead;
    const gl = decodeU64LE(bytes, off); off += gl.bytesRead;
    const res = decodeOResult(bytes, off); off += res.bytesRead;
    const at = decodeBytesVarLen(bytes, off); off += at.bytesRead;
    return {
      value: {
        tag: "operand",
        packagehash: ph.value,
        segroot: sr.value,
        authorizer: au.value,
        payloadhash: plh.value,
        gaslimit: gl.value,
        result: res.value,
        authtrace: at.value,
      },
      bytesRead: off - offset,
    };
  }

  // Transfer (tag === 1)
  const src = decodeU32LE(bytes, off); off += src.bytesRead;
  const dst = decodeU32LE(bytes, off); off += dst.bytesRead;
  const amt = decodeU64LE(bytes, off); off += amt.bytesRead;
  if (off + TRANSFER_MEMO_SIZE > bytes.length) throw new Error("decodeTransferOrOperand: not enough bytes for memo");
  const memo = bytes.slice(off, off + TRANSFER_MEMO_SIZE);
  off += TRANSFER_MEMO_SIZE;
  const gas = decodeU64LE(bytes, off); off += gas.bytesRead;

  return {
    value: {
      tag: "transfer",
      source: src.value,
      dest: dst.value,
      amount: amt.value,
      memo,
      gas: gas.value,
    },
    bytesRead: off - offset,
  };
}

// ---------------------------------------------------------------------------
// tryDecodeBlob — central dispatch for any FetchKind
// ---------------------------------------------------------------------------

export type FetchVariantData =
  | { kind: FetchKind.Constants; data: ProtocolConstants }
  | { kind: FetchKind.Entropy; data: Uint8Array }
  | { kind: FetchKind.AuthorizerTrace; data: Uint8Array }
  | { kind: FetchKind.OtherWorkItemExtrinsics; data: Uint8Array }
  | { kind: FetchKind.MyExtrinsics; data: Uint8Array }
  | { kind: FetchKind.OtherWorkItemImports; data: Uint8Array }
  | { kind: FetchKind.MyImports; data: Uint8Array }
  | { kind: FetchKind.WorkPackage; data: WorkPackageData }
  | { kind: FetchKind.Authorizer; data: Uint8Array }
  | { kind: FetchKind.AuthorizationToken; data: Uint8Array }
  | { kind: FetchKind.RefineContext; data: RefinementContext }
  | { kind: FetchKind.AllWorkItems; data: WorkItemSummary[] }
  | { kind: FetchKind.OneWorkItem; data: WorkItemSummary }
  | { kind: FetchKind.WorkItemPayload; data: Uint8Array }
  | { kind: FetchKind.AllTransfersAndOperands; data: TransferOrOperand[] }
  | { kind: FetchKind.OneTransferOrOperand; data: TransferOrOperand };

/**
 * Try to decode a blob for a specific FetchKind. Returns null on failure.
 */
export function tryDecodeBlob(kind: FetchKind, blob: Uint8Array): FetchVariantData | null {
  try {
    switch (kind) {
      case FetchKind.Constants: {
        const r = decodeProtocolConstants(blob);
        return r ? { kind, data: r.value } : null;
      }
      case FetchKind.Entropy:
        return blob.length === 32 ? { kind, data: new Uint8Array(blob) } : null;
      case FetchKind.AuthorizerTrace:
      case FetchKind.OtherWorkItemExtrinsics:
      case FetchKind.MyExtrinsics:
      case FetchKind.OtherWorkItemImports:
      case FetchKind.MyImports:
      case FetchKind.Authorizer:
      case FetchKind.AuthorizationToken:
      case FetchKind.WorkItemPayload:
        return { kind, data: new Uint8Array(blob) } as FetchVariantData;
      case FetchKind.WorkPackage: {
        const r = decodeWorkPackage(blob);
        return r ? { kind, data: r.value } : null;
      }
      case FetchKind.RefineContext: {
        const r = decodeRefinementContext(blob);
        return r ? { kind, data: r.value } : null;
      }
      case FetchKind.AllWorkItems: {
        const r = decodeSequenceVarLen(blob, 0, (b, o) => {
          const sr = decodeWorkItemSummary(b, o);
          if (!sr) throw new Error("bad work item summary");
          return sr;
        });
        return { kind, data: r.value };
      }
      case FetchKind.OneWorkItem: {
        const r = decodeWorkItemSummary(blob);
        return r ? { kind, data: r.value } : null;
      }
      case FetchKind.AllTransfersAndOperands: {
        const r = decodeSequenceVarLen(blob, 0, decodeTransferOrOperand);
        return { kind, data: r.value };
      }
      case FetchKind.OneTransferOrOperand: {
        const r = decodeTransferOrOperand(blob, 0);
        return { kind, data: r.value };
      }
      default:
        return null;
    }
  } catch {
    return null;
  }
}

/**
 * Encode variant data back to bytes.
 */
export function encodeVariantData(vd: FetchVariantData): Uint8Array {
  switch (vd.kind) {
    case FetchKind.Constants:
      return encodeProtocolConstants(vd.data);
    case FetchKind.Entropy:
    case FetchKind.AuthorizerTrace:
    case FetchKind.OtherWorkItemExtrinsics:
    case FetchKind.MyExtrinsics:
    case FetchKind.OtherWorkItemImports:
    case FetchKind.MyImports:
    case FetchKind.Authorizer:
    case FetchKind.AuthorizationToken:
    case FetchKind.WorkItemPayload:
      return new Uint8Array(vd.data);
    case FetchKind.WorkPackage:
      return encodeWorkPackage(vd.data);
    case FetchKind.RefineContext:
      return encodeRefinementContext(vd.data);
    case FetchKind.AllWorkItems:
      return encodeSequenceVarLen(vd.data, encodeWorkItemSummary);
    case FetchKind.OneWorkItem:
      return encodeWorkItemSummary(vd.data);
    case FetchKind.AllTransfersAndOperands:
      return encodeSequenceVarLen(vd.data, encodeTransferOrOperand);
    case FetchKind.OneTransferOrOperand:
      return encodeTransferOrOperand(vd.data);
    default:
      return new Uint8Array(0);
  }
}
