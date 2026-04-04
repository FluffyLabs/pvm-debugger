import { describe, it, expect } from "vitest";
import {
  PROTOCOL_CONSTANTS_SIZE,
  encodeProtocolConstants,
  decodeProtocolConstants,
  WORK_ITEM_SUMMARY_SIZE,
  encodeWorkItemSummary,
  decodeWorkItemSummary,
  encodeRefinementContext,
  decodeRefinementContext,
  encodeTransferOrOperand,
  decodeTransferOrOperand,
  encodeWorkPackage,
  decodeWorkPackage,
  encodeImportRef,
  decodeImportRef,
  encodeExtrinsicRef,
  decodeExtrinsicRef,
  encodeWorkItem,
  decodeWorkItem,
  encodeOResult,
  decodeOResult,
  tryDecodeBlob,
  encodeVariantData,
  FetchKind,
  FETCH_KIND_INFO,
  TRANSFER_MEMO_SIZE,
  type ProtocolConstants,
  type WorkItemSummary,
  type RefinementContext,
  type TransferOrOperand,
  type WorkPackageData,
  type WorkItem,
  type Transfer,
} from "./fetch-codec";
import {
  DEFAULT_PROTOCOL_CONSTANTS,
  DEFAULT_WORK_ITEM_SUMMARY,
  DEFAULT_REFINEMENT_CONTEXT,
  DEFAULT_OPERAND,
  DEFAULT_TRANSFER,
  DEFAULT_WORK_ITEM,
  DEFAULT_WORK_PACKAGE,
} from "./fetch-defaults";
import { encodeSequenceVarLen, decodeSequenceVarLen } from "@pvmdbg/types";

describe("ProtocolConstants", () => {
  it("encodes to exactly 134 bytes", () => {
    const encoded = encodeProtocolConstants(DEFAULT_PROTOCOL_CONSTANTS);
    expect(encoded.length).toBe(PROTOCOL_CONSTANTS_SIZE);
    expect(encoded.length).toBe(134);
  });

  it("roundtrips through encode/decode", () => {
    const encoded = encodeProtocolConstants(DEFAULT_PROTOCOL_CONSTANTS);
    const decoded = decodeProtocolConstants(encoded);
    expect(decoded).not.toBeNull();
    expect(decoded!.value).toEqual(DEFAULT_PROTOCOL_CONSTANTS);
    expect(decoded!.bytesRead).toBe(134);
  });

  it("returns null on too-short buffer", () => {
    const result = decodeProtocolConstants(new Uint8Array(100));
    expect(result).toBeNull();
  });
});

describe("WorkItemSummary", () => {
  it("encodes to exactly 62 bytes", () => {
    const encoded = encodeWorkItemSummary(DEFAULT_WORK_ITEM_SUMMARY);
    expect(encoded.length).toBe(WORK_ITEM_SUMMARY_SIZE);
    expect(encoded.length).toBe(62);
  });

  it("roundtrips through encode/decode", () => {
    const summary: WorkItemSummary = {
      serviceindex: 42,
      codehash: new Uint8Array(32).fill(0xAB),
      refgaslimit: 123456n,
      accgaslimit: 789012n,
      exportcount: 3,
      importsegmentsCount: 5,
      extrinsicsCount: 2,
      payloadLength: 1024,
    };
    const encoded = encodeWorkItemSummary(summary);
    const decoded = decodeWorkItemSummary(encoded);
    expect(decoded).not.toBeNull();
    expect(decoded!.value.serviceindex).toBe(42);
    expect(decoded!.value.exportcount).toBe(3);
    expect(decoded!.value.payloadLength).toBe(1024);
  });
});

describe("RefinementContext", () => {
  it("roundtrips with empty prerequisites", () => {
    const encoded = encodeRefinementContext(DEFAULT_REFINEMENT_CONTEXT);
    const decoded = decodeRefinementContext(encoded);
    expect(decoded).not.toBeNull();
    expect(decoded!.value.lookupanchortime).toBe(0);
    expect(decoded!.value.prerequisites.length).toBe(0);
  });

  it("roundtrips with prerequisites", () => {
    const ctx: RefinementContext = {
      ...DEFAULT_REFINEMENT_CONTEXT,
      lookupanchortime: 12345,
      prerequisites: [new Uint8Array(32).fill(1), new Uint8Array(32).fill(2)],
    };
    const encoded = encodeRefinementContext(ctx);
    const decoded = decodeRefinementContext(encoded);
    expect(decoded).not.toBeNull();
    expect(decoded!.value.lookupanchortime).toBe(12345);
    expect(decoded!.value.prerequisites.length).toBe(2);
    expect(decoded!.value.prerequisites[0][0]).toBe(1);
    expect(decoded!.value.prerequisites[1][0]).toBe(2);
  });
});

describe("ImportRef", () => {
  it("encodes to 34 bytes", () => {
    const ref = { hash: new Uint8Array(32), index: 0, isWorkPackageHash: false };
    expect(encodeImportRef(ref).length).toBe(34);
  });

  it("roundtrips normal import", () => {
    const ref = { hash: new Uint8Array(32).fill(0xAA), index: 42, isWorkPackageHash: false };
    const decoded = decodeImportRef(encodeImportRef(ref));
    expect(decoded.value.index).toBe(42);
    expect(decoded.value.isWorkPackageHash).toBe(false);
  });

  it("roundtrips work-package hash import (high bit)", () => {
    const ref = { hash: new Uint8Array(32).fill(0xBB), index: 100, isWorkPackageHash: true };
    const decoded = decodeImportRef(encodeImportRef(ref));
    expect(decoded.value.index).toBe(100);
    expect(decoded.value.isWorkPackageHash).toBe(true);
  });
});

describe("ExtrinsicRef", () => {
  it("encodes to 36 bytes (hash + u32, not VarU64)", () => {
    const ref = { hash: new Uint8Array(32), length: 1000 };
    expect(encodeExtrinsicRef(ref).length).toBe(36);
  });

  it("roundtrips", () => {
    const ref = { hash: new Uint8Array(32).fill(0xCC), length: 65535 };
    const decoded = decodeExtrinsicRef(encodeExtrinsicRef(ref));
    expect(decoded.value.length).toBe(65535);
  });
});

describe("TransferOrOperand", () => {
  it("roundtrips operand", () => {
    const encoded = encodeTransferOrOperand(DEFAULT_OPERAND);
    const decoded = decodeTransferOrOperand(encoded);
    expect(decoded.value.tag).toBe("operand");
    if (decoded.value.tag === "operand") {
      expect(decoded.value.gaslimit).toBe(500000n);
      expect(decoded.value.result.kind).toBe(0);
    }
  });

  it("roundtrips transfer", () => {
    const xfer: TransferOrOperand = {
      ...DEFAULT_TRANSFER,
      source: 1,
      dest: 2,
      amount: 1000n,
      gas: 500n,
    };
    const encoded = encodeTransferOrOperand(xfer);
    const decoded = decodeTransferOrOperand(encoded);
    expect(decoded.value.tag).toBe("transfer");
    if (decoded.value.tag === "transfer") {
      expect(decoded.value.source).toBe(1);
      expect(decoded.value.dest).toBe(2);
      expect(decoded.value.amount).toBe(1000n);
      expect(decoded.value.memo.length).toBe(TRANSFER_MEMO_SIZE);
      expect(decoded.value.gas).toBe(500n);
    }
  });

  it("roundtrips mixed sequence (operand + transfer)", () => {
    const items: TransferOrOperand[] = [DEFAULT_OPERAND, DEFAULT_TRANSFER];
    const encoded = encodeSequenceVarLen(items, encodeTransferOrOperand);
    const decoded = decodeSequenceVarLen(encoded, 0, decodeTransferOrOperand);
    expect(decoded.value.length).toBe(2);
    expect(decoded.value[0].tag).toBe("operand");
    expect(decoded.value[1].tag).toBe("transfer");
  });
});

describe("WorkItem", () => {
  it("roundtrips with non-empty imports and extrinsics", () => {
    const item: WorkItem = {
      serviceindex: 5,
      codehash: new Uint8Array(32).fill(0xCC),
      refgaslimit: 100000n,
      accgaslimit: 50000n,
      exportcount: 3,
      payload: new Uint8Array([0x01, 0x02, 0x03]),
      importsegments: [
        { hash: new Uint8Array(32).fill(0xAA), index: 7, isWorkPackageHash: false },
        { hash: new Uint8Array(32).fill(0xBB), index: 42, isWorkPackageHash: true },
      ],
      extrinsics: [
        { hash: new Uint8Array(32).fill(0xDD), length: 1024 },
      ],
    };
    const encoded = encodeWorkItem(item);
    const decoded = decodeWorkItem(encoded);
    expect(decoded.value.serviceindex).toBe(5);
    expect(decoded.value.exportcount).toBe(3);
    expect(decoded.value.importsegments.length).toBe(2);
    expect(decoded.value.importsegments[1].index).toBe(42);
    expect(decoded.value.importsegments[1].isWorkPackageHash).toBe(true);
    expect(decoded.value.extrinsics.length).toBe(1);
    expect(decoded.value.extrinsics[0].length).toBe(1024);
    expect(Array.from(decoded.value.payload)).toEqual([0x01, 0x02, 0x03]);
  });
});

describe("Transfer memo truncation", () => {
  it("truncates memo longer than 128 bytes", () => {
    const longMemo = new Uint8Array(200).fill(0xFF);
    const xfer: Transfer = {
      ...DEFAULT_TRANSFER,
      memo: longMemo,
    };
    const encoded = encodeTransferOrOperand(xfer);
    const decoded = decodeTransferOrOperand(encoded);
    expect(decoded.value.tag).toBe("transfer");
    if (decoded.value.tag === "transfer") {
      expect(decoded.value.memo.length).toBe(128);
      // Should be 0xFF (truncated from the original), not zeros
      expect(decoded.value.memo[0]).toBe(0xFF);
      expect(decoded.value.memo[127]).toBe(0xFF);
    }
  });
});

describe("OResult", () => {
  it("roundtrips OK with blob", () => {
    const encoded = encodeOResult({ kind: 0, blob: new Uint8Array([1, 2, 3]) });
    const decoded = decodeOResult(encoded);
    expect(decoded.value.kind).toBe(0);
    expect(Array.from(decoded.value.blob!)).toEqual([1, 2, 3]);
  });

  it("roundtrips error kinds (1-6)", () => {
    for (const kind of [1, 2, 3, 4, 5, 6] as const) {
      const encoded = encodeOResult({ kind });
      expect(encoded.length).toBe(1);
      const decoded = decodeOResult(encoded);
      expect(decoded.value.kind).toBe(kind);
    }
  });
});

describe("WorkPackage", () => {
  it("roundtrips with nested fields", () => {
    const wp: WorkPackageData = {
      authcodehost: 42,
      authcodehash: new Uint8Array(32).fill(0x11),
      context: {
        ...DEFAULT_REFINEMENT_CONTEXT,
        lookupanchortime: 999,
        prerequisites: [new Uint8Array(32).fill(0xAA)],
      },
      authtoken: new Uint8Array([0x01, 0x02]),
      authconfig: new Uint8Array([0x03]),
      workitems: [
        {
          ...DEFAULT_WORK_ITEM,
          serviceindex: 7,
          exportcount: 2,
          payload: new Uint8Array([0xDE, 0xAD]),
        },
      ],
    };

    const encoded = encodeWorkPackage(wp);
    const decoded = decodeWorkPackage(encoded);
    expect(decoded).not.toBeNull();
    expect(decoded!.value.authcodehost).toBe(42);
    expect(decoded!.value.context.lookupanchortime).toBe(999);
    expect(decoded!.value.context.prerequisites.length).toBe(1);
    expect(decoded!.value.authtoken.length).toBe(2);
    expect(decoded!.value.workitems.length).toBe(1);
    expect(decoded!.value.workitems[0].serviceindex).toBe(7);
    expect(decoded!.value.workitems[0].exportcount).toBe(2);
    expect(Array.from(decoded!.value.workitems[0].payload)).toEqual([0xDE, 0xAD]);
  });
});

describe("tryDecodeBlob", () => {
  it("decodes Constants blob", () => {
    const blob = encodeProtocolConstants(DEFAULT_PROTOCOL_CONSTANTS);
    const result = tryDecodeBlob(FetchKind.Constants, blob);
    expect(result).not.toBeNull();
    expect(result!.kind).toBe(FetchKind.Constants);
  });

  it("decodes Entropy (32 bytes)", () => {
    const result = tryDecodeBlob(FetchKind.Entropy, new Uint8Array(32));
    expect(result).not.toBeNull();
  });

  it("returns null for Entropy with wrong size", () => {
    const result = tryDecodeBlob(FetchKind.Entropy, new Uint8Array(31));
    expect(result).toBeNull();
  });

  it("returns raw blob for blob variants", () => {
    const blob = new Uint8Array([1, 2, 3]);
    const result = tryDecodeBlob(FetchKind.AuthorizerTrace, blob);
    expect(result).not.toBeNull();
    expect(Array.from((result!.data as Uint8Array))).toEqual([1, 2, 3]);
  });
});

describe("FETCH_KIND_INFO", () => {
  it("has entries for all 16 kinds", () => {
    for (let i = 0; i <= 15; i++) {
      expect(FETCH_KIND_INFO[i as FetchKind]).toBeDefined();
      expect(FETCH_KIND_INFO[i as FetchKind].name).toBeTruthy();
      expect(FETCH_KIND_INFO[i as FetchKind].description).toBeTruthy();
    }
  });
});

describe("encodeVariantData roundtrip", () => {
  it("roundtrips ProtocolConstants through encodeVariantData/tryDecodeBlob", () => {
    const data = { kind: FetchKind.Constants as const, data: DEFAULT_PROTOCOL_CONSTANTS };
    const blob = encodeVariantData(data);
    const result = tryDecodeBlob(FetchKind.Constants, blob);
    expect(result).not.toBeNull();
    expect((result!.data as ProtocolConstants).coreCount).toBe(2);
  });
});
