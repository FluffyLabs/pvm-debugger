import assert from "node:assert";
import { test } from "node:test";

import { Registers } from "../registers";
import { MoveOps } from "./move-ops";

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

test("MoveOps", async (t) => {
  await t.test("moveRegister", () => {
    const firstValue = 5;
    const resultValue = firstValue;
    const regs = getRegisters([firstValue]);
    const moveOps = new MoveOps(regs);

    moveOps.moveRegister(FIRST_REGISTER, RESULT_REGISTER);

    assert.strictEqual(regs.asUnsigned[RESULT_REGISTER], resultValue);
  });

  await t.test("cmovIfZero (condition satisfied)", () => {
    const firstValue = 0;
    const secondValue = 5;
    const resultValue = secondValue;
    const regs = getRegisters([firstValue, secondValue]);
    const moveOps = new MoveOps(regs);

    moveOps.cmovIfZero(FIRST_REGISTER, SECOND_REGISTER, RESULT_REGISTER);

    assert.strictEqual(regs.asUnsigned[RESULT_REGISTER], resultValue);
  });

  await t.test("cmovIfZero (condition not satisfied)", () => {
    const firstValue = 3;
    const secondValue = 5;
    const resultValue = 0;
    const regs = getRegisters([firstValue, secondValue]);
    const moveOps = new MoveOps(regs);

    moveOps.cmovIfZero(FIRST_REGISTER, SECOND_REGISTER, RESULT_REGISTER);

    assert.strictEqual(regs.asUnsigned[RESULT_REGISTER], resultValue);
  });

  await t.test("cmovIfNotZero (condition satisfied)", () => {
    const firstValue = 3;
    const secondValue = 5;
    const resultValue = secondValue;
    const regs = getRegisters([firstValue, secondValue]);
    const moveOps = new MoveOps(regs);

    moveOps.cmovIfNotZero(FIRST_REGISTER, SECOND_REGISTER, RESULT_REGISTER);

    assert.strictEqual(regs.asUnsigned[RESULT_REGISTER], resultValue);
  });

  await t.test("cmovIfNotZero (condition not satisfied)", () => {
    const firstValue = 0;
    const secondValue = 5;
    const resultValue = 0;
    const regs = getRegisters([firstValue, secondValue]);
    const moveOps = new MoveOps(regs);

    moveOps.cmovIfNotZero(FIRST_REGISTER, SECOND_REGISTER, RESULT_REGISTER);

    assert.strictEqual(regs.asUnsigned[RESULT_REGISTER], resultValue);
  });

  await t.test("cmovIfZeroImmediate (condition satisfied)", () => {
    const firstValue = 0;
    const secondValue = 5;
    const resultValue = secondValue;
    const regs = getRegisters([firstValue]);
    const moveOps = new MoveOps(regs);

    moveOps.cmovIfZeroImmediate(FIRST_REGISTER, secondValue, RESULT_REGISTER);

    assert.strictEqual(regs.asUnsigned[RESULT_REGISTER], resultValue);
  });

  await t.test("cmovIfZeroImmediate (condition not satisfied)", () => {
    const firstValue = 3;
    const secondValue = 5;
    const resultValue = 0;
    const regs = getRegisters([firstValue]);
    const moveOps = new MoveOps(regs);

    moveOps.cmovIfZeroImmediate(FIRST_REGISTER, secondValue, RESULT_REGISTER);

    assert.strictEqual(regs.asUnsigned[RESULT_REGISTER], resultValue);
  });

  await t.test("cmovIfNotZeroImmediate (condition satisfied)", () => {
    const firstValue = 3;
    const secondValue = 5;
    const resultValue = secondValue;
    const regs = getRegisters([firstValue]);
    const moveOps = new MoveOps(regs);

    moveOps.cmovIfNotZeroImmediate(FIRST_REGISTER, secondValue, RESULT_REGISTER);

    assert.strictEqual(regs.asUnsigned[RESULT_REGISTER], resultValue);
  });

  await t.test("cmovIfNotZeroImmediate (condition not satisfied)", () => {
    const firstValue = 0;
    const secondValue = 5;
    const resultValue = 0;
    const regs = getRegisters([firstValue]);
    const moveOps = new MoveOps(regs);

    moveOps.cmovIfNotZeroImmediate(FIRST_REGISTER, secondValue, RESULT_REGISTER);

    assert.strictEqual(regs.asUnsigned[RESULT_REGISTER], resultValue);
  });
});
