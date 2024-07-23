import assert from "node:assert";
import { test } from "node:test";
import { Instruction } from "../instruction";
import { Mask } from "../program-decoder/mask";
import { ArgsDecoder } from "./args-decoder";
import { ArgumentType } from "./argument-type";
import { ImmediateDecoder } from "./decoders/immediate-decoder";

test("ArgsDecoder", async (t) => {
  await t.test("return empty result for instruction without args", () => {
    const code = new Uint8Array([Instruction.TRAP]);
    const mask = new Mask(new Uint8Array([0b1111_1111]));
    const argsDecoder = new ArgsDecoder(code, mask);
    const expectedResult = {
      noOfInstructionsToSkip: code.length,
      type: ArgumentType.NO_ARGUMENTS,
    };

    const result = argsDecoder.getArgs(0);

    assert.deepStrictEqual(result, expectedResult);
  });

  await t.test("return correct result for instruction with 3 regs", () => {
    const code = new Uint8Array([Instruction.ADD, 0x12, 0x03]);
    const mask = new Mask(new Uint8Array([0b1111_1001]));
    const argsDecoder = new ArgsDecoder(code, mask);
    const expectedResult = {
      noOfInstructionsToSkip: code.length,
      type: ArgumentType.THREE_REGISTERS,

      firstRegisterIndex: 1,
      secondRegisterIndex: 2,
      thirdRegisterIndex: 3,
    };

    const result = argsDecoder.getArgs(0);

    assert.deepStrictEqual(result, expectedResult);
  });

  await t.test("return correct result for instruction with 2 regs and 1 immediate", () => {
    const code = new Uint8Array([Instruction.ADD_IMM, 0x12, 0xff]);
    const mask = new Mask(new Uint8Array([0b1111_1001]));
    const argsDecoder = new ArgsDecoder(code, mask);
    const expectedImmediateDecoder = new ImmediateDecoder();
    expectedImmediateDecoder.setBytes(new Uint8Array([0xff]));
    const expectedResult = {
      noOfInstructionsToSkip: code.length,
      type: ArgumentType.TWO_REGISTERS_ONE_IMMEDIATE,

      firstRegisterIndex: 1,
      secondRegisterIndex: 2,

      immediateDecoder1: expectedImmediateDecoder,
    };

    const result = argsDecoder.getArgs(0);

    assert.deepStrictEqual(result, expectedResult);
  });

  await t.test("return correct result for instruction with 2 regs and 1 immediate", () => {
    const code = new Uint8Array([Instruction.ADD_IMM, 0x12, 0xff]);
    const mask = new Mask(new Uint8Array([0b1111_1001]));
    const argsDecoder = new ArgsDecoder(code, mask);
    const expectedImmediateDecoder = new ImmediateDecoder();
    expectedImmediateDecoder.setBytes(new Uint8Array([0xff]));
    const expectedResult = {
      noOfInstructionsToSkip: code.length,
      type: ArgumentType.TWO_REGISTERS_ONE_IMMEDIATE,

      firstRegisterIndex: 1,
      secondRegisterIndex: 2,

      immediateDecoder1: expectedImmediateDecoder,
    };

    const result = argsDecoder.getArgs(0);

    assert.deepStrictEqual(result, expectedResult);
  });
});
