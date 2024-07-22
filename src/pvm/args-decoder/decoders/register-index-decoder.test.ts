import { RegisterIndexDecoder } from "./register-index-decoder";

import assert from "node:assert";
import { test } from "node:test";

test("RegisterIndexDecoder", async (t) => {
  await t.test("decode first index from 0x79", () => {
    const registerIndexDecoder = new RegisterIndexDecoder();

    registerIndexDecoder.setByte(0x79);

    const registerValue = registerIndexDecoder.getFirstIndex();

    assert.strictEqual(registerValue, 7);
  });

  await t.test("decode second index from 0x79", () => {
    const registerIndexDecoder = new RegisterIndexDecoder();

    registerIndexDecoder.setByte(0x79);

    const registerValue = registerIndexDecoder.getSecondIndex();

    assert.strictEqual(registerValue, 9);
  });

  await t.test("should clamp first index", () => {
    const registerIndexDecoder = new RegisterIndexDecoder();

    registerIndexDecoder.setByte(0xdd);

    const registerValue = registerIndexDecoder.getFirstIndex();

    assert.strictEqual(registerValue, 12);
  });

  await t.test("should clamp second index", () => {
    const registerIndexDecoder = new RegisterIndexDecoder();

    registerIndexDecoder.setByte(0xde);

    const registerValue = registerIndexDecoder.getSecondIndex();

    assert.strictEqual(registerValue, 12);
  });
});
