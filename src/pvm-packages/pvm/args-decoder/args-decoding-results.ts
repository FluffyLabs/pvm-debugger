import type { NoArgumentsResult, OneOffsetResult, ThreeRegistersResult, TwoRegistersOneImmediateResult, TwoRegistersResult, TwoRegistersTwoImmediatesResult } from "./args-decoder";
import { ArgumentType } from "./argument-type";
import type { ImmediateDecoder } from "./decoders/immediate-decoder";

const ARGUMENT_TYPE_LENGTH = Object.keys(ArgumentType).length / 2;

type Results = [
  NoArgumentsResult,
  undefined, // 1 imm
  undefined, // 2 imms
  OneOffsetResult,
  undefined, // 1 reg 1 imm
  undefined, // 1 reg 2 imms
  undefined, // 1 reg 1 imm 1 offset
  TwoRegistersResult,
  TwoRegistersOneImmediateResult,
  undefined, // 2 regs 1 offset
  TwoRegistersTwoImmediatesResult,
  ThreeRegistersResult,
];

export const createResults = () => {
  const results = new Array(ARGUMENT_TYPE_LENGTH) as Results;

  results[ArgumentType.NO_ARGUMENTS] = {
    type: ArgumentType.NO_ARGUMENTS,
    noOfInstructionsToSkip: 1,
  };

  results[ArgumentType.TWO_REGISTERS] = {
    type: ArgumentType.TWO_REGISTERS,
    noOfInstructionsToSkip: 1,
    firstRegisterIndex: 0,
    secondRegisterIndex: 0,
  };

  results[ArgumentType.THREE_REGISTERS] = {
    type: ArgumentType.THREE_REGISTERS,
    noOfInstructionsToSkip: 1,
    firstRegisterIndex: 0,
    secondRegisterIndex: 0,
    thirdRegisterIndex: 0,
  };

  results[ArgumentType.TWO_REGISTERS_ONE_IMMEDIATE] = {
    type: ArgumentType.TWO_REGISTERS_ONE_IMMEDIATE,
    noOfInstructionsToSkip: 1,
    firstRegisterIndex: 0,
    secondRegisterIndex: 0,
    immediateDecoder1: null as unknown as ImmediateDecoder,
  };

  return results;
};
