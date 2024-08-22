import assert from "node:assert";
import { describe, it } from "node:test";

import { NibblesDecoder } from "./nibbles-decoder";

describe("NibblesDecoder", () => {
  it("should decode high nibble from 0x79", () => {
    const nibblesDecoder = new NibblesDecoder();

    nibblesDecoder.setByte(0x79);

    const registerValue = nibblesDecoder.getHighNibble();

    assert.strictEqual(registerValue, 7);
  });

  it("should decode low nibble from 0x79", () => {
    const nibblesDecoder = new NibblesDecoder();

    nibblesDecoder.setByte(0x79);

    const registerValue = nibblesDecoder.getLowNibble();

    assert.strictEqual(registerValue, 9);
  });

  it("should not clamp high nibble", () => {
    const nibblesDecoder = new NibblesDecoder();

    nibblesDecoder.setByte(0xde);

    const registerValue = nibblesDecoder.getHighNibble();

    assert.strictEqual(registerValue, 13);
  });

  it("should not clamp low nibble", () => {
    const nibblesDecoder = new NibblesDecoder();

    nibblesDecoder.setByte(0xde);

    const registerValue = nibblesDecoder.getLowNibble();

    assert.strictEqual(registerValue, 14);
  });

  it("should decode high register index from 0x79", () => {
    const nibblesDecoder = new NibblesDecoder();

    nibblesDecoder.setByte(0x79);

    const registerValue = nibblesDecoder.getHighNibbleAsRegisterIndex();

    assert.strictEqual(registerValue, 7);
  });

  it("should decode low register index from 0x79", () => {
    const nibblesDecoder = new NibblesDecoder();

    nibblesDecoder.setByte(0x79);

    const registerValue = nibblesDecoder.getLowNibbleAsRegisterIndex();

    assert.strictEqual(registerValue, 9);
  });

  it("should clamp high register index", () => {
    const nibblesDecoder = new NibblesDecoder();

    nibblesDecoder.setByte(0xed);

    const registerValue = nibblesDecoder.getHighNibbleAsRegisterIndex();

    assert.strictEqual(registerValue, 12);
  });

  it("should clamp low register index", () => {
    const nibblesDecoder = new NibblesDecoder();

    nibblesDecoder.setByte(0xde);

    const registerValue = nibblesDecoder.getLowNibbleAsRegisterIndex();

    assert.strictEqual(registerValue, 12);
  });

  it("decode high length from 0x23", () => {
    const nibblesDecoder = new NibblesDecoder();

    nibblesDecoder.setByte(0x23);

    const registerValue = nibblesDecoder.getHighNibbleAsRegisterIndex();

    assert.strictEqual(registerValue, 2);
  });

  it("should decode low length from 0x23", () => {
    const nibblesDecoder = new NibblesDecoder();

    nibblesDecoder.setByte(0x23);

    const registerValue = nibblesDecoder.getLowNibbleAsRegisterIndex();

    assert.strictEqual(registerValue, 3);
  });

  it("should clamp high length", () => {
    const nibblesDecoder = new NibblesDecoder();

    nibblesDecoder.setByte(0xed);

    const registerValue = nibblesDecoder.getHighNibbleAsLength();

    assert.strictEqual(registerValue, 4);
  });

  it("should clamp low length", () => {
    const nibblesDecoder = new NibblesDecoder();

    nibblesDecoder.setByte(0xde);

    const registerValue = nibblesDecoder.getLowNibbleAsLength();

    assert.strictEqual(registerValue, 4);
  });
});
