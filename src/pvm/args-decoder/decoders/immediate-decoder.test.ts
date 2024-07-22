import { ImmediateDecoder } from "./immediate-decoder";

import assert from "node:assert";
import { test } from "node:test";

test("ImmediateDecoder", async (t) => {
  await t.test("Positive number without elided octets", () => {
    const decoder = new ImmediateDecoder();
    const encodedBytes = new Uint8Array([0x01, 0x00, 0x00, 0x00]);
    const expectedSigned = 1;
    const expectedUnsigned = 1;

    decoder.setBytes(encodedBytes);

    assert.equal(decoder.getSigned(), expectedSigned);
    assert.equal(decoder.getUnsigned(), expectedUnsigned);
  });

  await t.test("Negative number without elided octets", () => {
    const decoder = new ImmediateDecoder();
    const encodedBytes = new Uint8Array([0xff, 0xff, 0xff, 0xff]);
    const expectedSigned = -1;
    const expectedUnsigned = 2 ** 32 - 1;

    decoder.setBytes(encodedBytes);

    assert.equal(decoder.getSigned(), expectedSigned);
    assert.equal(decoder.getUnsigned(), expectedUnsigned);
  });

  await t.test("Positive number with elided octets", () => {
    const decoder = new ImmediateDecoder();
    const encodedBytes = new Uint8Array([0x01]);
    const expectedSigned = 1;
    const expectedUnsigned = 1;

    decoder.setBytes(encodedBytes);

    assert.equal(decoder.getSigned(), expectedSigned);
    assert.equal(decoder.getUnsigned(), expectedUnsigned);
  });

  await t.test("Negative number with elided octets", () => {
    const decoder = new ImmediateDecoder();
    const encodedBytes = new Uint8Array([0xff]);
    const expectedSigned = -1;
    const expectedUnsigned = 2 ** 32 - 1;

    decoder.setBytes(encodedBytes);

    assert.equal(decoder.getSigned(), expectedSigned);
    assert.equal(decoder.getUnsigned(), expectedUnsigned);
  });

  await t.test("Large positive number without elided octets", () => {
    const decoder = new ImmediateDecoder();
    const encodedBytes = new Uint8Array([0xff, 0xff, 0x7f, 0x00]);
    const expectedSigned = 0x00_7f_ff_ff;
    const expectedUnsigned = 0x00_7f_ff_ff;

    decoder.setBytes(encodedBytes);

    assert.equal(decoder.getSigned(), expectedSigned);
    assert.equal(decoder.getUnsigned(), expectedUnsigned);
  });

  await t.test("Large negative number without elided octets", () => {
    const decoder = new ImmediateDecoder();

    const encodedBytes = new Uint8Array([0x01, 0x00, 0x80, 0xff]);
    const expectedSigned = -0x00_7f_ff_ff;
    const expectedUnsigned = 0xff_80_00_01;

    decoder.setBytes(encodedBytes);

    assert.equal(decoder.getSigned(), expectedSigned);
    assert.equal(decoder.getUnsigned(), expectedUnsigned);
  });

  await t.test("Maximum positive value", () => {
    const decoder = new ImmediateDecoder();

    const encodedBytes = new Uint8Array([0xff, 0xff, 0xff, 0x7f]);
    const expectedSigned = 0x7f_ff_ff_ff;
    const expectedUnsigned = 0x7f_ff_ff_ff;

    decoder.setBytes(encodedBytes);

    assert.equal(decoder.getSigned(), expectedSigned);
    assert.equal(decoder.getUnsigned(), expectedUnsigned);
  });

  await t.test("Maximum negative value", () => {
    const decoder = new ImmediateDecoder();

    const encodedBytes = new Uint8Array([0x00, 0x00, 0x00, 0x80]);
    const expectedSigned = -(2 ** 31);
    const expectedUnsigned = 0x80_00_00_00;

    decoder.setBytes(encodedBytes);

    assert.equal(decoder.getSigned(), expectedSigned);
    assert.equal(decoder.getUnsigned(), expectedUnsigned);
  });

  await t.test("Empty bytes array", () => {
    const decoder = new ImmediateDecoder();

    const encodedBytes = new Uint8Array([]);
    const expectedSigned = 0;
    const expectedUnsigned = 0;

    decoder.setBytes(encodedBytes);

    assert.equal(decoder.getSigned(), expectedSigned);
    assert.equal(decoder.getUnsigned(), expectedUnsigned);
  });
});
