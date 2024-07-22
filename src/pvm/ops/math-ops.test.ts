import assert from "node:assert";
import { test } from "node:test";

import { Registers } from "../registers";
import { MAX_VALUE, MIN_VALUE } from "./math-consts";
import { MathOps } from "./math-ops";

const FIRST_REGISTER = 0;
const SECOND_REGISTER = 1;
const RESULT_REGISTER = 12;

const getRegisters = (data: number[]) => {
  const regs = new Registers();

  for (const [i, byte] of data.entries()) {
    regs.asUnsigned[i] = byte;
  }

  return regs;
};

test("MathOps", async (t) => {
  await t.test("add", () => {
    const firstValue = 12;
    const secondValue = 13;
    const resultValue = 25;
    const regs = getRegisters([firstValue, secondValue]);
    const mathOps = new MathOps(regs);

    mathOps.add(FIRST_REGISTER, SECOND_REGISTER, RESULT_REGISTER);

    assert.strictEqual(regs.asUnsigned[RESULT_REGISTER], resultValue);
  });

  await t.test("add with overflow", () => {
    const firstValue = MAX_VALUE;
    const secondValue = 13;
    const resultValue = 12;
    const regs = getRegisters([firstValue, secondValue]);
    const mathOps = new MathOps(regs);

    mathOps.add(FIRST_REGISTER, SECOND_REGISTER, RESULT_REGISTER);

    assert.strictEqual(regs.asUnsigned[RESULT_REGISTER], resultValue);
  });

  await t.test("addImmediate", () => {
    const firstValue = 12;
    const secondValue = 13;
    const resultValue = 25;
    const regs = getRegisters([firstValue]);
    const mathOps = new MathOps(regs);

    mathOps.addImmediate(FIRST_REGISTER, secondValue, RESULT_REGISTER);

    assert.strictEqual(regs.asUnsigned[RESULT_REGISTER], resultValue);
  });

  await t.test("addImmediate with overflow", () => {
    const firstValue = MAX_VALUE;
    const secondValue = 13;
    const resultValue = 12;
    const regs = getRegisters([firstValue]);
    const mathOps = new MathOps(regs);

    mathOps.addImmediate(FIRST_REGISTER, secondValue, RESULT_REGISTER);

    assert.strictEqual(regs.asUnsigned[RESULT_REGISTER], resultValue);
  });

  await t.test("sub", () => {
    const firstValue = 12;
    const secondValue = 13;
    const resultValue = 1;
    const regs = getRegisters([firstValue, secondValue]);
    const mathOps = new MathOps(regs);

    mathOps.sub(FIRST_REGISTER, SECOND_REGISTER, RESULT_REGISTER);

    assert.strictEqual(regs.asUnsigned[RESULT_REGISTER], resultValue);
  });

  await t.test("sub with overflow", () => {
    const firstValue = 13;
    const secondValue = 12;
    const resultValue = MAX_VALUE;
    const regs = getRegisters([firstValue, secondValue]);
    const mathOps = new MathOps(regs);

    mathOps.sub(FIRST_REGISTER, SECOND_REGISTER, RESULT_REGISTER);

    assert.strictEqual(regs.asUnsigned[RESULT_REGISTER], resultValue);
  });

  await t.test("negAddImmediate", () => {
    const firstValue = 12;
    const secondValue = 13;
    const resultValue = 1;
    const regs = getRegisters([firstValue]);
    const mathOps = new MathOps(regs);

    mathOps.negAddImmediate(FIRST_REGISTER, secondValue, RESULT_REGISTER);

    assert.strictEqual(regs.asUnsigned[RESULT_REGISTER], resultValue);
  });

  await t.test("negAddImmediate with overflow", () => {
    const firstValue = 13;
    const secondValue = 12;
    const resultValue = MAX_VALUE;
    const regs = getRegisters([firstValue]);
    const mathOps = new MathOps(regs);

    mathOps.negAddImmediate(FIRST_REGISTER, secondValue, RESULT_REGISTER);

    assert.strictEqual(regs.asUnsigned[RESULT_REGISTER], resultValue);
  });

  await t.test("mul", () => {
    const firstValue = 12;
    const secondValue = 13;
    const resultValue = 156;
    const regs = getRegisters([firstValue, secondValue]);
    const mathOps = new MathOps(regs);

    mathOps.mul(FIRST_REGISTER, SECOND_REGISTER, RESULT_REGISTER);

    assert.strictEqual(regs.asUnsigned[RESULT_REGISTER], resultValue);
  });

  await t.test("mul with overflow", () => {
    const firstValue = 2 ** 17 + 1;
    const secondValue = 2 ** 18;
    const resultValue = 262144;
    const regs = getRegisters([firstValue, secondValue]);
    const mathOps = new MathOps(regs);

    mathOps.mul(FIRST_REGISTER, SECOND_REGISTER, RESULT_REGISTER);

    assert.strictEqual(regs.asUnsigned[RESULT_REGISTER], resultValue);
  });

  await t.test("mulImmediate", () => {
    const firstValue = 12;
    const secondValue = 13;
    const resultValue = 156;
    const regs = getRegisters([firstValue]);
    const mathOps = new MathOps(regs);

    mathOps.mulImmediate(FIRST_REGISTER, secondValue, RESULT_REGISTER);

    assert.strictEqual(regs.asUnsigned[RESULT_REGISTER], resultValue);
  });

  await t.test("mulImmediate with overflow", () => {
    const firstValue = 2 ** 17 + 1;
    const secondValue = 2 ** 18;
    const resultValue = 262144;
    const regs = getRegisters([firstValue]);
    const mathOps = new MathOps(regs);

    mathOps.mulImmediate(FIRST_REGISTER, secondValue, RESULT_REGISTER);

    assert.strictEqual(regs.asUnsigned[RESULT_REGISTER], resultValue);
  });

  await t.test("mulUpperUUImmediate", () => {
    const firstValue = 2 ** 30;
    const secondValue = 2 ** 30;
    const resultValue = 268435456;
    const regs = getRegisters([firstValue]);
    const mathOps = new MathOps(regs);

    mathOps.mulUpperUUImmediate(FIRST_REGISTER, secondValue, RESULT_REGISTER);

    assert.strictEqual(regs.asUnsigned[RESULT_REGISTER], resultValue);
  });

  await t.test("mulUpperUUImmediate (max unsigned value)", () => {
    const firstValue = MAX_VALUE;
    const secondValue = MAX_VALUE;
    const resultValue = MAX_VALUE - 1;
    const regs = getRegisters([firstValue]);
    const mathOps = new MathOps(regs);

    mathOps.mulUpperUUImmediate(FIRST_REGISTER, secondValue, RESULT_REGISTER);

    assert.strictEqual(regs.asUnsigned[RESULT_REGISTER], resultValue);
  });

  await t.test("mulUpperUU", () => {
    const firstValue = 2 ** 30;
    const secondValue = 2 ** 30;
    const resultValue = 268435456;
    const regs = getRegisters([firstValue, secondValue]);
    const mathOps = new MathOps(regs);

    mathOps.mulUpperUU(FIRST_REGISTER, SECOND_REGISTER, RESULT_REGISTER);

    assert.strictEqual(regs.asUnsigned[RESULT_REGISTER], resultValue);
  });

  await t.test("mulUpperUU (max unsigned value)", () => {
    const firstValue = MAX_VALUE;
    const secondValue = MAX_VALUE;
    const resultValue = MAX_VALUE - 1;
    const regs = getRegisters([firstValue, secondValue]);
    const mathOps = new MathOps(regs);

    mathOps.mulUpperUU(FIRST_REGISTER, SECOND_REGISTER, RESULT_REGISTER);

    assert.strictEqual(regs.asUnsigned[RESULT_REGISTER], resultValue);
  });

  await t.test("mulUpperSSImmediate (positive numbers)", () => {
    const firstValue = 2 ** 30;
    const secondValue = 2 ** 30;
    const resultValue = 268435456 | 0;
    const regs = new Registers();
    regs.asSigned[FIRST_REGISTER] = firstValue;

    const mathOps = new MathOps(regs);

    mathOps.mulUpperSSImmediate(FIRST_REGISTER, secondValue, RESULT_REGISTER);

    assert.strictEqual(regs.asSigned[RESULT_REGISTER], resultValue);
  });

  await t.test("mulUpperSSImmediate (negative numbers)", () => {
    const firstValue = -(2 ** 30);
    const secondValue = -(2 ** 30);
    const resultValue = 268435456 | 0;
    const regs = new Registers();
    regs.asSigned[FIRST_REGISTER] = firstValue;

    const mathOps = new MathOps(regs);

    mathOps.mulUpperSSImmediate(FIRST_REGISTER, secondValue, RESULT_REGISTER);

    assert.strictEqual(regs.asSigned[RESULT_REGISTER], resultValue);
  });

  await t.test("mulUpperSSImmediate (positive and negative)", () => {
    const firstValue = 2 ** 30;
    const secondValue = -(2 ** 30);
    const resultValue = -268435456 | 0;
    const regs = new Registers();
    regs.asSigned[FIRST_REGISTER] = firstValue;

    const mathOps = new MathOps(regs);

    mathOps.mulUpperSSImmediate(FIRST_REGISTER, secondValue, RESULT_REGISTER);

    assert.strictEqual(regs.asSigned[RESULT_REGISTER], resultValue);
  });

  await t.test("mulUpperSSImmediate (negative and positive)", () => {
    const firstValue = -(2 ** 30);
    const secondValue = 2 ** 30;
    const resultValue = -268435456 | 0;
    const regs = new Registers();
    regs.asSigned[FIRST_REGISTER] = firstValue;

    const mathOps = new MathOps(regs);

    mathOps.mulUpperSSImmediate(FIRST_REGISTER, secondValue, RESULT_REGISTER);

    assert.strictEqual(regs.asSigned[RESULT_REGISTER], resultValue);
  });

  await t.test("mulUpperSS (positive numbers)", () => {
    const firstValue = 2 ** 30;
    const secondValue = 2 ** 30;
    const resultValue = 268435456 | 0;
    const regs = new Registers();
    regs.asSigned[FIRST_REGISTER] = firstValue;
    regs.asSigned[SECOND_REGISTER] = secondValue;

    const mathOps = new MathOps(regs);

    mathOps.mulUpperSS(FIRST_REGISTER, SECOND_REGISTER, RESULT_REGISTER);

    assert.strictEqual(regs.asSigned[RESULT_REGISTER], resultValue);
  });

  await t.test("mulUpperSS (negative numbers)", () => {
    const firstValue = -(2 ** 30);
    const secondValue = -(2 ** 30);
    const resultValue = 268435456 | 0;
    const regs = new Registers();
    regs.asSigned[FIRST_REGISTER] = firstValue;
    regs.asSigned[SECOND_REGISTER] = secondValue;

    const mathOps = new MathOps(regs);

    mathOps.mulUpperSS(FIRST_REGISTER, SECOND_REGISTER, RESULT_REGISTER);

    assert.strictEqual(regs.asSigned[RESULT_REGISTER], resultValue);
  });

  await t.test("mulUpperSS (positive and negative)", () => {
    const firstValue = 2 ** 30;
    const secondValue = -(2 ** 30);
    const resultValue = -268435456 | 0;
    const regs = new Registers();
    regs.asSigned[FIRST_REGISTER] = firstValue;
    regs.asSigned[SECOND_REGISTER] = secondValue;

    const mathOps = new MathOps(regs);

    mathOps.mulUpperSS(FIRST_REGISTER, SECOND_REGISTER, RESULT_REGISTER);

    assert.strictEqual(regs.asSigned[RESULT_REGISTER], resultValue);
  });

  await t.test("mulUpperSS (negative and positive)", () => {
    const firstValue = -(2 ** 30);
    const secondValue = 2 ** 30;
    const resultValue = -268435456 | 0;
    const regs = new Registers();
    regs.asSigned[FIRST_REGISTER] = firstValue;
    regs.asSigned[SECOND_REGISTER] = secondValue;

    const mathOps = new MathOps(regs);

    mathOps.mulUpperSS(FIRST_REGISTER, SECOND_REGISTER, RESULT_REGISTER);

    assert.strictEqual(regs.asSigned[RESULT_REGISTER], resultValue);
  });

  await t.test("mulUpperSU (positive numbers)", () => {
    const firstValue = 2 ** 30;
    const secondValue = 2 ** 30;
    const resultValue = 268435456 | 0;
    const regs = new Registers();
    regs.asSigned[FIRST_REGISTER] = firstValue;
    regs.asUnsigned[SECOND_REGISTER] = secondValue;

    const mathOps = new MathOps(regs);

    mathOps.mulUpperSU(FIRST_REGISTER, SECOND_REGISTER, RESULT_REGISTER);

    assert.strictEqual(regs.asSigned[RESULT_REGISTER], resultValue);
  });

  await t.test("mulUpperSU (negative and positive)", () => {
    const firstValue = -(2 ** 30);
    const secondValue = 2 ** 30;
    const resultValue = -268435456 | 0;
    const regs = new Registers();
    regs.asSigned[FIRST_REGISTER] = firstValue;
    regs.asUnsigned[SECOND_REGISTER] = secondValue;

    const mathOps = new MathOps(regs);

    mathOps.mulUpperSU(FIRST_REGISTER, SECOND_REGISTER, RESULT_REGISTER);

    assert.strictEqual(regs.asSigned[RESULT_REGISTER], resultValue);
  });

  await t.test("divUnsigned", () => {
    const firstValue = 2;
    const secondValue = 26;
    const resultValue = 13;
    const regs = getRegisters([firstValue, secondValue]);
    const mathOps = new MathOps(regs);

    mathOps.divUnsigned(FIRST_REGISTER, SECOND_REGISTER, RESULT_REGISTER);

    assert.strictEqual(regs.asUnsigned[RESULT_REGISTER], resultValue);
  });

  await t.test("divUnsigned (rounding)", () => {
    const firstValue = 2;
    const secondValue = 25;
    const resultValue = 12;
    const regs = getRegisters([firstValue, secondValue]);
    const mathOps = new MathOps(regs);

    mathOps.divUnsigned(FIRST_REGISTER, SECOND_REGISTER, RESULT_REGISTER);

    assert.strictEqual(regs.asUnsigned[RESULT_REGISTER], resultValue);
  });

  await t.test("divUnsigned (by zero)", () => {
    const firstValue = 0;
    const secondValue = 25;
    const resultValue = MAX_VALUE;
    const regs = getRegisters([firstValue, secondValue]);
    const mathOps = new MathOps(regs);

    mathOps.divUnsigned(FIRST_REGISTER, SECOND_REGISTER, RESULT_REGISTER);

    assert.strictEqual(regs.asUnsigned[RESULT_REGISTER], resultValue);
  });

  await t.test("divSigned (positive numbers)", () => {
    const firstValue = 2;
    const secondValue = 26;
    const resultValue = 13;
    const regs = new Registers();
    regs.asSigned[FIRST_REGISTER] = firstValue;
    regs.asSigned[SECOND_REGISTER] = secondValue;
    const mathOps = new MathOps(regs);

    mathOps.divSigned(FIRST_REGISTER, SECOND_REGISTER, RESULT_REGISTER);

    assert.strictEqual(regs.asSigned[RESULT_REGISTER], resultValue);
  });

  await t.test("divSigned (negative numbers)", () => {
    const firstValue = -2;
    const secondValue = -26;
    const resultValue = 13;
    const regs = new Registers();
    regs.asSigned[FIRST_REGISTER] = firstValue;
    regs.asSigned[SECOND_REGISTER] = secondValue;
    const mathOps = new MathOps(regs);

    mathOps.divSigned(FIRST_REGISTER, SECOND_REGISTER, RESULT_REGISTER);

    assert.strictEqual(regs.asSigned[RESULT_REGISTER], resultValue);
  });

  await t.test("divSigned (positive and negative numbers)", () => {
    const firstValue = 2;
    const secondValue = -26;
    const resultValue = -13;
    const regs = new Registers();
    regs.asSigned[FIRST_REGISTER] = firstValue;
    regs.asSigned[SECOND_REGISTER] = secondValue;
    const mathOps = new MathOps(regs);

    mathOps.divSigned(FIRST_REGISTER, SECOND_REGISTER, RESULT_REGISTER);

    assert.strictEqual(regs.asSigned[RESULT_REGISTER], resultValue);
  });

  await t.test("divSigned (negative and positive numbers)", () => {
    const firstValue = -2;
    const secondValue = 26;
    const resultValue = -13;
    const regs = new Registers();
    regs.asSigned[FIRST_REGISTER] = firstValue;
    regs.asSigned[SECOND_REGISTER] = secondValue;
    const mathOps = new MathOps(regs);

    mathOps.divSigned(FIRST_REGISTER, SECOND_REGISTER, RESULT_REGISTER);

    assert.strictEqual(regs.asSigned[RESULT_REGISTER], resultValue);
  });

  await t.test("divSigned (rounding positive number)", () => {
    const firstValue = 2;
    const secondValue = 25;
    const resultValue = 12;
    const regs = new Registers();
    regs.asSigned[FIRST_REGISTER] = firstValue;
    regs.asSigned[SECOND_REGISTER] = secondValue;
    const mathOps = new MathOps(regs);

    mathOps.divSigned(FIRST_REGISTER, SECOND_REGISTER, RESULT_REGISTER);

    assert.strictEqual(regs.asSigned[RESULT_REGISTER], resultValue);
  });

  await t.test("divSigned (rounding negative number)", () => {
    const firstValue = 2;
    const secondValue = -25;
    const resultValue = -12;
    const regs = new Registers();
    regs.asSigned[FIRST_REGISTER] = firstValue;
    regs.asSigned[SECOND_REGISTER] = secondValue;
    const mathOps = new MathOps(regs);

    mathOps.divSigned(FIRST_REGISTER, SECOND_REGISTER, RESULT_REGISTER);

    assert.strictEqual(regs.asSigned[RESULT_REGISTER], resultValue);
  });

  await t.test("divSigned (by zero)", () => {
    const firstValue = 0;
    const secondValue = 25;
    const resultValue = MAX_VALUE | 0; // -1
    const regs = new Registers();
    regs.asSigned[FIRST_REGISTER] = firstValue;
    regs.asSigned[SECOND_REGISTER] = secondValue;
    const mathOps = new MathOps(regs);

    mathOps.divSigned(FIRST_REGISTER, SECOND_REGISTER, RESULT_REGISTER);

    assert.strictEqual(regs.asSigned[RESULT_REGISTER], resultValue);
  });

  await t.test("divSigned with overflow", () => {
    const firstValue = -1;
    const secondValue = MIN_VALUE;
    const resultValue = secondValue;
    const regs = new Registers();
    regs.asSigned[FIRST_REGISTER] = firstValue;
    regs.asSigned[SECOND_REGISTER] = secondValue;
    const mathOps = new MathOps(regs);

    mathOps.divSigned(FIRST_REGISTER, SECOND_REGISTER, RESULT_REGISTER);

    assert.strictEqual(regs.asSigned[RESULT_REGISTER], resultValue);
  });

  await t.test("remUnsigned", () => {
    const firstValue = 5;
    const secondValue = 26;
    const resultValue = 1;
    const regs = getRegisters([firstValue, secondValue]);
    const mathOps = new MathOps(regs);

    mathOps.remUnsigned(FIRST_REGISTER, SECOND_REGISTER, RESULT_REGISTER);

    assert.strictEqual(regs.asUnsigned[RESULT_REGISTER], resultValue);
  });

  await t.test("remUnsigned (by zero)", () => {
    const firstValue = 0;
    const secondValue = 25;
    const resultValue = secondValue;
    const regs = getRegisters([firstValue, secondValue]);
    const mathOps = new MathOps(regs);

    mathOps.remUnsigned(FIRST_REGISTER, SECOND_REGISTER, RESULT_REGISTER);

    assert.strictEqual(regs.asUnsigned[RESULT_REGISTER], resultValue);
  });
});
