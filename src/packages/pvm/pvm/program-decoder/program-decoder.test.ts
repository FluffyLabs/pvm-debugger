import assert from "node:assert";
import { test } from "node:test";

import { Mask } from "./mask";
import { ProgramDecoder } from "./program-decoder";

const code = [4, 7, 246, 4, 8, 10, 41, 135, 4, 0, 4, 7, 239, 190, 173, 222];

const bitMask = [73, 6];

const program = [0, 0, 16, ...code, ...bitMask];

test("ProgramDecoder", async (t) => {
  await t.test("should corectly decode instructions", () => {
    const programDecoder = new ProgramDecoder(new Uint8Array(program));

    const result = programDecoder.getCode();

    assert.deepStrictEqual(result, new Uint8Array(code));
  });

  await t.test("should corectly decode mask", () => {
    const programDecoder = new ProgramDecoder(new Uint8Array(program));

    const result = programDecoder.getMask();

    assert.deepStrictEqual(result, new Mask(new Uint8Array(bitMask)));
  });
});
