import assert from "node:assert";
import { test } from "node:test";

import { decodeNaturalNumber } from "./decode-natural-number";

test("decodeNaturalNumber", async (t) => {
  await t.test("decode 0", () => {
    const encodedBytes = new Uint8Array([0]);
    const expectedValue = 0n;

    const result = decodeNaturalNumber(encodedBytes);

    assert.strictEqual(result.value, expectedValue);
    assert.strictEqual(result.bytesToSkip, encodedBytes.length);
  });

  await t.test("decode single byte min value", () => {
    const encodedBytes = new Uint8Array([1]);
    const expectedValue = 1n;

    const result = decodeNaturalNumber(encodedBytes);

    assert.strictEqual(result.value, expectedValue);
    assert.strictEqual(result.bytesToSkip, encodedBytes.length);
  });

  await t.test("decode single byte max value", () => {
    const encodedBytes = new Uint8Array([127]);
    const expectedValue = 127n;

    const result = decodeNaturalNumber(encodedBytes);

    assert.strictEqual(result.value, expectedValue);
    assert.strictEqual(result.bytesToSkip, encodedBytes.length);
  });

  await t.test("decode 2 bytes min value", () => {
    const encodedBytes = new Uint8Array([128, 128]);
    const expectedValue = 128n;

    const result = decodeNaturalNumber(encodedBytes);

    assert.strictEqual(result.value, expectedValue);
    assert.strictEqual(result.bytesToSkip, encodedBytes.length);
  });

  await t.test("decode 2 bytes max value", () => {
    const encodedBytes = new Uint8Array([191, 255]);
    const expectedValue = 2n ** 14n - 1n;

    const result = decodeNaturalNumber(encodedBytes);

    assert.strictEqual(result.value, expectedValue);
    assert.strictEqual(result.bytesToSkip, encodedBytes.length);
  });

  await t.test("decode 3 bytes min value", () => {
    const encodedBytes = new Uint8Array([192, 0, 0x40]);
    const expectedValue = 2n ** 14n;

    const result = decodeNaturalNumber(encodedBytes);

    assert.strictEqual(result.value, expectedValue);
    assert.strictEqual(result.bytesToSkip, encodedBytes.length);
  });

  await t.test("decode 3 bytes max value", () => {
    const encodedBytes = new Uint8Array([192 + 31, 0xff, 0xff]);
    const expectedValue = 2n ** 21n - 1n;

    const result = decodeNaturalNumber(encodedBytes);

    assert.strictEqual(result.value, expectedValue);
    assert.strictEqual(result.bytesToSkip, encodedBytes.length);
  });

  await t.test("decode 4 bytes min value", () => {
    const encodedBytes = new Uint8Array([0xe0, 0, 0, 0x20]);
    const expectedValue = 2n ** 21n;

    const result = decodeNaturalNumber(encodedBytes);

    assert.strictEqual(result.value, expectedValue);
    assert.strictEqual(result.bytesToSkip, encodedBytes.length);
  });

  await t.test("decode 4 bytes max value", () => {
    const encodedBytes = new Uint8Array([0xe0 + 15, 0xff, 0xff, 0xff]);
    const expectedValue = 2n ** 28n - 1n;

    const result = decodeNaturalNumber(encodedBytes);

    assert.strictEqual(result.value, expectedValue);
    assert.strictEqual(result.bytesToSkip, encodedBytes.length);
  });

  await t.test("decode 5 bytes min value", () => {
    const encodedBytes = new Uint8Array([256 - 16, 0, 0, 0, 0x10]);
    const expectedValue = 2n ** 28n;

    const result = decodeNaturalNumber(encodedBytes);

    assert.strictEqual(result.value, expectedValue);
    assert.strictEqual(result.bytesToSkip, encodedBytes.length);
  });

  await t.test("decode 5 bytes max value", () => {
    const encodedBytes = new Uint8Array([256 - 16 + 7, 0xff, 0xff, 0xff, 0xff]);
    const expectedValue = 2n ** 35n - 1n;

    const result = decodeNaturalNumber(encodedBytes);

    assert.strictEqual(result.value, expectedValue);
    assert.strictEqual(result.bytesToSkip, encodedBytes.length);
  });

  await t.test("decode 6 bytes min value", () => {
    const encodedBytes = new Uint8Array([256 - 8, 0, 0, 0, 0, 0x08]);
    const expectedValue = 2n ** 35n;

    const result = decodeNaturalNumber(encodedBytes);

    assert.strictEqual(result.value, expectedValue);
    assert.strictEqual(result.bytesToSkip, encodedBytes.length);
  });

  await t.test("decode 6 bytes max value", () => {
    const encodedBytes = new Uint8Array([256 - 8 + 3, 0xff, 0xff, 0xff, 0xff, 0xff]);
    const expectedValue = 2n ** 42n - 1n;

    const result = decodeNaturalNumber(encodedBytes);

    assert.strictEqual(result.value, expectedValue);
    assert.strictEqual(result.bytesToSkip, encodedBytes.length);
  });

  await t.test("decode 7 bytes min value", () => {
    const encodedBytes = new Uint8Array([256 - 4, 0, 0, 0, 0, 0, 0x04]);
    const expectedValue = 2n ** 42n;

    const result = decodeNaturalNumber(encodedBytes);

    assert.strictEqual(result.value, expectedValue);
    assert.strictEqual(result.bytesToSkip, encodedBytes.length);
  });

  await t.test("decode 7 bytes max value", () => {
    const encodedBytes = new Uint8Array([256 - 4 + 1, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff]);
    const expectedValue = 2n ** 49n - 1n;

    const result = decodeNaturalNumber(encodedBytes);

    assert.strictEqual(result.value, expectedValue);
    assert.strictEqual(result.bytesToSkip, encodedBytes.length);
  });

  await t.test("decode 8 bytes min value", () => {
    const encodedBytes = new Uint8Array([256 - 2, 0, 0, 0, 0, 0, 0, 0x02]);
    const expectedValue = 2n ** 49n;

    const result = decodeNaturalNumber(encodedBytes);

    assert.strictEqual(result.value, expectedValue);
    assert.strictEqual(result.bytesToSkip, encodedBytes.length);
  });

  await t.test("decode 8 bytes max value", () => {
    const encodedBytes = new Uint8Array([256 - 2, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff]);
    const expectedValue = 2n ** 56n - 1n;

    const result = decodeNaturalNumber(encodedBytes);

    assert.strictEqual(result.value, expectedValue);
    assert.strictEqual(result.bytesToSkip, encodedBytes.length);
  });

  await t.test("decode 9 bytes min value", () => {
    const encodedBytes = new Uint8Array([255, 0, 0, 0, 0, 0, 0, 0, 0x01]);
    const expectedValue = 2n ** 56n;

    const result = decodeNaturalNumber(encodedBytes);

    assert.strictEqual(result.value, expectedValue);
    assert.strictEqual(result.bytesToSkip, encodedBytes.length);
  });

  await t.test("decode 9 bytes max value", () => {
    const encodedBytes = new Uint8Array([255, 255, 255, 255, 255, 255, 255, 255, 255]);
    const expectedValue = 2n ** 64n - 1n;

    const result = decodeNaturalNumber(encodedBytes);

    assert.strictEqual(result.value, expectedValue);
    assert.strictEqual(result.bytesToSkip, encodedBytes.length);
  });

  await t.test("decode 0 with extra bytes", () => {
    const encodedBytes = new Uint8Array([0, 1, 2, 3]);
    const expectedValue = 0n;

    const result = decodeNaturalNumber(encodedBytes);

    assert.strictEqual(result.value, expectedValue);
    assert.strictEqual(result.bytesToSkip, 1);
  });

  await t.test("decode 7 bytes number with extra bytes ", () => {
    const encodedBytes = new Uint8Array([256 - 4 + 1, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0x1, 0x2]);
    const expectedValue = 2n ** 49n - 1n;

    const result = decodeNaturalNumber(encodedBytes);

    assert.strictEqual(result.value, expectedValue);
    assert.strictEqual(result.bytesToSkip, 7);
  });

  await t.test("decode 9 bytes number with extra bytes", () => {
    const encodedBytes = new Uint8Array([255, 255, 255, 255, 255, 255, 255, 255, 255, 1, 2, 3]);
    const expectedValue = 2n ** 64n - 1n;

    const result = decodeNaturalNumber(encodedBytes);

    assert.strictEqual(result.value, expectedValue);
    assert.strictEqual(result.bytesToSkip, 9);
  });
});
