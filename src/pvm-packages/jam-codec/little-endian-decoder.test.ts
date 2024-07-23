import assert from "node:assert";
import { test } from "node:test";

import { LittleEndianDecoder } from "./little-endian-decoder";

test("LittleEndianDecoder", async (t) => {
  await t.test("Empty bytes array", () => {
    const decoder = new LittleEndianDecoder();

    const encodedBytes = new Uint8Array([]);
    const expectedValue = 0n;

    const result = decoder.decode(encodedBytes);

    assert.strictEqual(result, expectedValue);
  });

  await t.test("1 byte number", () => {
    const decoder = new LittleEndianDecoder();

    const encodedBytes = new Uint8Array([0xff]);
    const expectedValue = 255n;

    const result = decoder.decode(encodedBytes);

    assert.strictEqual(result, expectedValue);
  });

  await t.test("2 bytes number", () => {
    const decoder = new LittleEndianDecoder();

    const encodedBytes = new Uint8Array([0xff, 0x01]);
    const expectedValue = 511n;

    const result = decoder.decode(encodedBytes);

    assert.strictEqual(result, expectedValue);
  });

  await t.test("4 bytes number", () => {
    const decoder = new LittleEndianDecoder();

    const encodedBytes = new Uint8Array([0xff, 0x56, 0x34, 0x12]);
    const expectedValue = 305420031n;

    const result = decoder.decode(encodedBytes);

    assert.strictEqual(result, expectedValue);
  });

  await t.test("8 bytes number", () => {
    const decoder = new LittleEndianDecoder();

    const encodedBytes = new Uint8Array([0xff, 0xde, 0xbc, 0x9a, 0x78, 0x56, 0x34, 0x12]);
    const expectedValue = 1311768467463790335n;

    const result = decoder.decode(encodedBytes);

    assert.strictEqual(result, expectedValue);
  });
});
