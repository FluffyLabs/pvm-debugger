import assert from "node:assert";
import { describe, it } from "node:test";
import { Instruction } from "../instruction";
import { Mask } from "../program-decoder/mask";
import { ArgsDecoder } from "./args-decoder";
import { ArgumentType } from "./argument-type";
import { ImmediateDecoder } from "./decoders/immediate-decoder";

describe("ArgsDecoder", () => {
  it("return empty result for instruction without args", () => {
    const code = new Uint8Array([Instruction.TRAP]);
    const mask = new Mask(new Uint8Array([0b1111_1111]));
    const argsDecoder = new ArgsDecoder(code, mask);
    const expectedResult = {
      noOfBytesToSkip: code.length,
      type: ArgumentType.NO_ARGUMENTS,
    };

    const result = argsDecoder.getArgs(0);

    assert.deepStrictEqual(result, expectedResult);
  });

  it("return correct result for instruction with 1 immediate", () => {
    const code = new Uint8Array([Instruction.ECALLI, 0xff]);
    const mask = new Mask(new Uint8Array([0b1111_1101]));
    const argsDecoder = new ArgsDecoder(code, mask);
    const expectedImmediateDecoder = new ImmediateDecoder();
    expectedImmediateDecoder.setBytes(new Uint8Array([0xff]));
    const expectedResult = {
      noOfBytesToSkip: code.length,
      type: ArgumentType.ONE_IMMEDIATE,
      immediateDecoder: expectedImmediateDecoder,
    };
    const result = argsDecoder.getArgs(0);

    assert.deepStrictEqual(result, expectedResult);
  });

  it("return correct result for instruction with 3 regs", () => {
    const code = new Uint8Array([Instruction.ADD, 0x12, 0x03]);
    const mask = new Mask(new Uint8Array([0b1111_1001]));
    const argsDecoder = new ArgsDecoder(code, mask);
    const expectedResult = {
      noOfBytesToSkip: code.length,
      type: ArgumentType.THREE_REGISTERS,

      firstRegisterIndex: 1,
      secondRegisterIndex: 2,
      thirdRegisterIndex: 3,
    };

    const result = argsDecoder.getArgs(0);

    assert.deepStrictEqual(result, expectedResult);
  });

  it("return correct result for instruction with 2 regs and 1 immediate", () => {
    const code = new Uint8Array([Instruction.ADD_IMM, 0x12, 0xff]);
    const mask = new Mask(new Uint8Array([0b1111_1001]));
    const argsDecoder = new ArgsDecoder(code, mask);
    const expectedImmediateDecoder = new ImmediateDecoder();
    expectedImmediateDecoder.setBytes(new Uint8Array([0xff]));
    const expectedResult = {
      noOfBytesToSkip: code.length,
      type: ArgumentType.TWO_REGISTERS_ONE_IMMEDIATE,

      firstRegisterIndex: 1,
      secondRegisterIndex: 2,

      immediateDecoder: expectedImmediateDecoder,
    };

    const result = argsDecoder.getArgs(0);

    assert.deepStrictEqual(result, expectedResult);
  });

  it("return correct result for instruction with 2 regs and 1 immediate", () => {
    const code = new Uint8Array([Instruction.ADD_IMM, 0x12, 0xff]);
    const mask = new Mask(new Uint8Array([0b1111_1001]));
    const argsDecoder = new ArgsDecoder(code, mask);
    const expectedImmediateDecoder = new ImmediateDecoder();
    expectedImmediateDecoder.setBytes(new Uint8Array([0xff]));
    const expectedResult = {
      noOfBytesToSkip: code.length,
      type: ArgumentType.TWO_REGISTERS_ONE_IMMEDIATE,

      firstRegisterIndex: 1,
      secondRegisterIndex: 2,

      immediateDecoder: expectedImmediateDecoder,
    };

    const result = argsDecoder.getArgs(0);

    assert.deepStrictEqual(result, expectedResult);
  });

  it("return correct result for instruction with 1 reg, 1 immediate and 1 offset", () => {
    const code = new Uint8Array([Instruction.BRANCH_EQ_IMM, 39, 210, 4, 6]);
    const mask = new Mask(new Uint8Array([0b1110_0001]));
    const argsDecoder = new ArgsDecoder(code, mask);
    const expectedImmediateDecoder = new ImmediateDecoder();
    expectedImmediateDecoder.setBytes(new Uint8Array([210, 4]));
    const expectedResult = {
      noOfBytesToSkip: code.length,
      type: ArgumentType.ONE_REGISTER_ONE_IMMEDIATE_ONE_OFFSET,

      firstRegisterIndex: 7,
      immediateDecoder: expectedImmediateDecoder,
      nextPc: 6,
    };

    const result = argsDecoder.getArgs(0);

    assert.deepStrictEqual(result, expectedResult);
  });

  it("return correct result for instruction with 2 regs and 1 offset", () => {
    const code = new Uint8Array([Instruction.BRANCH_EQ, 135, 4]);
    const mask = new Mask(new Uint8Array([0b1111_1001]));
    const argsDecoder = new ArgsDecoder(code, mask);
    const expectedImmediateDecoder = new ImmediateDecoder();
    expectedImmediateDecoder.setBytes(new Uint8Array([0xff]));
    const expectedResult = {
      noOfBytesToSkip: code.length,
      type: ArgumentType.TWO_REGISTERS_ONE_OFFSET,

      firstRegisterIndex: 7,
      secondRegisterIndex: 8,

      nextPc: 4,
    };

    const result = argsDecoder.getArgs(0);

    assert.deepStrictEqual(result, expectedResult);
  });

  it("return correct result for instruction with 2 regs and 2 immediates", () => {
    const code = new Uint8Array([Instruction.LOAD_IMM_JUMP_IND, 135, 2, 1, 2, 3, 4]);
    const mask = new Mask(new Uint8Array([0b1000_0001]));
    const argsDecoder = new ArgsDecoder(code, mask);
    const expectedfirstImmediateDecoder = new ImmediateDecoder();
    expectedfirstImmediateDecoder.setBytes(new Uint8Array([0x01, 0x02]));
    const expectedsecondImmediateDecoder = new ImmediateDecoder();
    expectedsecondImmediateDecoder.setBytes(new Uint8Array([0x03, 0x04]));

    const expectedResult = {
      noOfBytesToSkip: code.length,
      type: ArgumentType.TWO_REGISTERS_TWO_IMMEDIATES,

      firstRegisterIndex: 7,
      secondRegisterIndex: 8,

      firstImmediateDecoder: expectedfirstImmediateDecoder,
      secondImmediateDecoder: expectedsecondImmediateDecoder,
    };

    const result = argsDecoder.getArgs(0);

    assert.deepStrictEqual(result, expectedResult);
  });
});
