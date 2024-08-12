import type {
  NoArgumentsResult,
  OneOffsetResult,
  OneRegisterOneImmediateOneOffsetResult,
  OneRegisterOneImmediateResult,
  ThreeRegistersResult,
  TwoRegistersOneImmediateResult,
  TwoRegistersOneOffsetResult,
  TwoRegistersResult,
  TwoRegistersTwoImmediatesResult,
} from "./args-decoder";
import { ArgumentType } from "./argument-type";
import { ImmediateDecoder } from "./decoders/immediate-decoder";

const ARGUMENT_TYPE_LENGTH = Object.keys(ArgumentType).length / 2;

type Results = [
  NoArgumentsResult,
  undefined, // 1 imm
  undefined, // 2 imms
  OneOffsetResult,
  OneRegisterOneImmediateResult,
  undefined, // 1 reg 2 imms
  OneRegisterOneImmediateOneOffsetResult,
  TwoRegistersResult,
  TwoRegistersOneImmediateResult,
  TwoRegistersOneOffsetResult,
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

  results[ArgumentType.ONE_REGISTER_ONE_IMMEDIATE_ONE_OFFSET] = {
    type: ArgumentType.ONE_REGISTER_ONE_IMMEDIATE_ONE_OFFSET,
    noOfInstructionsToSkip: 1,
    firstRegisterIndex: 0,
    immediateDecoder: new ImmediateDecoder(),
    offset: 0,
  };

  results[ArgumentType.TWO_REGISTERS_ONE_OFFSET] = {
    type: ArgumentType.TWO_REGISTERS_ONE_OFFSET,
    noOfInstructionsToSkip: 1,
    firstRegisterIndex: 0,
    secondRegisterIndex: 0,
    offset: 0,
  };

  results[ArgumentType.TWO_REGISTERS_ONE_IMMEDIATE] = {
    type: ArgumentType.TWO_REGISTERS_ONE_IMMEDIATE,
    noOfInstructionsToSkip: 1,
    firstRegisterIndex: 0,
    secondRegisterIndex: 0,
    immediateDecoder: new ImmediateDecoder(),
  };

  results[ArgumentType.ONE_REGISTER_ONE_IMMEDIATE] = {
    type: ArgumentType.ONE_REGISTER_ONE_IMMEDIATE,
    noOfInstructionsToSkip: 1,
    firstRegisterIndex: 0,
    immediateDecoder: new ImmediateDecoder(),
  };

  results[ArgumentType.ONE_OFFSET] = {
    type: ArgumentType.ONE_OFFSET,
    noOfInstructionsToSkip: 1,
    offset: 0,
  };

  return results;
};
