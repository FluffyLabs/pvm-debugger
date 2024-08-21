import assert from "node:assert";
import { describe, it } from "node:test";

import { JumpTable } from "./jump-table";

describe("JumpTable", () => {
  it("should return true when an index exist in jump table", () => {
    const jumpTableItemLength = 4;
    const bytes = new Uint8Array([0x78, 0x56, 0x34, 0x12]);
    const jumpTable = new JumpTable(jumpTableItemLength, bytes);
    const indexToCheck = 0;

    const result = jumpTable.hasIndex(indexToCheck);

    assert.strictEqual(result, true);
  });

  it("should return false when an index not exist in jump table", () => {
    const jumpTableItemLength = 4;
    const bytes = new Uint8Array([0x78, 0x56, 0x34, 0x12]);
    const jumpTable = new JumpTable(jumpTableItemLength, bytes);
    const indexToCheck = 5;

    const result = jumpTable.hasIndex(indexToCheck);

    assert.strictEqual(result, false);
  });

  it("should return correct destination", () => {
    const jumpTableItemLength = 4;
    const expectedValue = 0x12_34_56_78;
    const bytes = new Uint8Array([0xff, 0xff, 0xff, 0xff, 0x78, 0x56, 0x34, 0x12]);
    const jumpTable = new JumpTable(jumpTableItemLength, bytes);
    const indexToCheck = 1;

    const result = jumpTable.getDestination(indexToCheck);

    assert.strictEqual(result, expectedValue);
  });
});
