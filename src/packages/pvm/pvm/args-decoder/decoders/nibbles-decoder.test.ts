import { NibblesDecoder } from "./nibbles-decoder";

import assert from "node:assert";
import { test } from "node:test";

test("NibblesDecoder", async (t) => {
  await t.test("decode high nibble from 0x79", () => {
    const nibblesDecoder = new NibblesDecoder();

    nibblesDecoder.setByte(0x79);

    const registerValue = nibblesDecoder.getHighNibble();

    assert.strictEqual(registerValue, 7);
  });

  await t.test("decode low nibble from 0x79", () => {
    const nibblesDecoder = new NibblesDecoder();

    nibblesDecoder.setByte(0x79);

    const registerValue = nibblesDecoder.getLowNibble();

    assert.strictEqual(registerValue, 9);
  });

  await t.test("should not clamp high nibble", () => {
    const nibblesDecoder = new NibblesDecoder();

    nibblesDecoder.setByte(0xde);

    const registerValue = nibblesDecoder.getHighNibble();

    assert.strictEqual(registerValue, 13);
  });

  await t.test("should not clamp low nibble", () => {
    const nibblesDecoder = new NibblesDecoder();

    nibblesDecoder.setByte(0xde);

    const registerValue = nibblesDecoder.getLowNibble();

    assert.strictEqual(registerValue, 14);
  });

  await t.test("decode high register index from 0x79", () => {
    const nibblesDecoder = new NibblesDecoder();

    nibblesDecoder.setByte(0x79);

    const registerValue = nibblesDecoder.getHighNibbleAsRegisterIndex();

    assert.strictEqual(registerValue, 7);
  });

  await t.test("decode low register index from 0x79", () => {
    const nibblesDecoder = new NibblesDecoder();

    nibblesDecoder.setByte(0x79);

    const registerValue = nibblesDecoder.getLowNibbleAsRegisterIndex();

    assert.strictEqual(registerValue, 9);
  });

  await t.test("should clamp high register index", () => {
    const nibblesDecoder = new NibblesDecoder();

    nibblesDecoder.setByte(0xed);

    const registerValue = nibblesDecoder.getHighNibbleAsRegisterIndex();

    assert.strictEqual(registerValue, 12);
  });

  await t.test("should clamp low register index", () => {
    const nibblesDecoder = new NibblesDecoder();

    nibblesDecoder.setByte(0xde);

    const registerValue = nibblesDecoder.getLowNibbleAsRegisterIndex();

    assert.strictEqual(registerValue, 12);
  });

  await t.test("decode high length from 0x23", () => {
    const nibblesDecoder = new NibblesDecoder();

    nibblesDecoder.setByte(0x23);

    const registerValue = nibblesDecoder.getHighNibbleAsRegisterIndex();

    assert.strictEqual(registerValue, 2);
  });

  await t.test("decode low length from 0x23", () => {
    const nibblesDecoder = new NibblesDecoder();

    nibblesDecoder.setByte(0x23);

    const registerValue = nibblesDecoder.getLowNibbleAsRegisterIndex();

    assert.strictEqual(registerValue, 3);
  });

  await t.test("should clamp high length", () => {
    const nibblesDecoder = new NibblesDecoder();

    nibblesDecoder.setByte(0xed);

    const registerValue = nibblesDecoder.getHighNibbleAsLength();

    assert.strictEqual(registerValue, 4);
  });

  await t.test("should clamp low length", () => {
    const nibblesDecoder = new NibblesDecoder();

    nibblesDecoder.setByte(0xde);

    const registerValue = nibblesDecoder.getLowNibbleAsLength();

    assert.strictEqual(registerValue, 4);
  });
});
