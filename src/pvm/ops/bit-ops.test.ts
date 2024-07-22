import assert from "node:assert";
import { test } from "node:test";

import { Registers } from "../registers";
import { BitOps } from "./bit-ops";

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

test("BitOps", async (t) => {
  await t.test("or", () => {
    const firstValue = 0b01;
    const secondValue = 0b10;
    const resultValue = 0b11;
    const regs = getRegisters([firstValue, secondValue]);
    const bitOps = new BitOps(regs);

    bitOps.or(FIRST_REGISTER, SECOND_REGISTER, RESULT_REGISTER);

    assert.strictEqual(regs.asUnsigned[RESULT_REGISTER], resultValue);
  });

  await t.test("orImmediate", () => {
    const firstValue = 0b01;
    const secondValue = 0b10;
    const resultValue = 0b11;
    const regs = getRegisters([firstValue]);
    const bitOps = new BitOps(regs);

    bitOps.orImmediate(FIRST_REGISTER, secondValue, RESULT_REGISTER);

    assert.strictEqual(regs.asUnsigned[RESULT_REGISTER], resultValue);
  });

  await t.test("and", () => {
    const firstValue = 0b101;
    const secondValue = 0b011;
    const resultValue = 0b001;
    const regs = getRegisters([firstValue, secondValue]);
    const bitOps = new BitOps(regs);

    bitOps.and(FIRST_REGISTER, SECOND_REGISTER, RESULT_REGISTER);

    assert.strictEqual(regs.asUnsigned[RESULT_REGISTER], resultValue);
  });

  await t.test("andImmediate", () => {
    const firstValue = 0b101;
    const secondValue = 0b011;
    const resultValue = 0b001;
    const regs = getRegisters([firstValue]);
    const bitOps = new BitOps(regs);

    bitOps.andImmediate(FIRST_REGISTER, secondValue, RESULT_REGISTER);

    assert.strictEqual(regs.asUnsigned[RESULT_REGISTER], resultValue);
  });

  await t.test("xor", () => {
    const firstValue = 0b101;
    const secondValue = 0b110;
    const resultValue = 0b011;
    const regs = getRegisters([firstValue, secondValue]);
    const bitOps = new BitOps(regs);

    bitOps.xor(FIRST_REGISTER, SECOND_REGISTER, RESULT_REGISTER);

    assert.strictEqual(regs.asUnsigned[RESULT_REGISTER], resultValue);
  });

  await t.test("xorImmediate", () => {
    const firstValue = 0b101;
    const secondValue = 0b110;
    const resultValue = 0b011;
    const regs = getRegisters([firstValue]);
    const bitOps = new BitOps(regs);

    bitOps.xorImmediate(FIRST_REGISTER, secondValue, RESULT_REGISTER);

    assert.strictEqual(regs.asUnsigned[RESULT_REGISTER], resultValue);
  });
});
