import assert from "node:assert";
import { describe, it } from "node:test";

import { JumpTable } from "./jump-table";
import { Mask } from "./mask";
import { ProgramDecoder } from "./program-decoder";

const code = [4, 7, 246, 4, 8, 10, 41, 135, 4, 0, 4, 7, 239, 190, 173, 222];

const jumpTableItemLength = 1;
const jumpTable = [5];
const bitMask = [73, 6];
const program = new Uint8Array([jumpTable.length, jumpTableItemLength, 16, ...jumpTable, ...code, ...bitMask]);

describe("ProgramDecoder", () => {
  it("should corectly decode instructions", () => {
    const programDecoder = new ProgramDecoder(program);

    const result = programDecoder.getCode();

    assert.deepStrictEqual(result, new Uint8Array(code));
  });

  it("should corectly decode mask", () => {
    const programDecoder = new ProgramDecoder(program);

    const result = programDecoder.getMask();

    assert.deepStrictEqual(result, new Mask(new Uint8Array(bitMask)));
  });

  it("should corectly decode jump table", () => {
    const programDecoder = new ProgramDecoder(program);

    const result = programDecoder.getJumpTable();

    assert.deepStrictEqual(result, new JumpTable(jumpTableItemLength, new Uint8Array(jumpTable)));
  });
});
