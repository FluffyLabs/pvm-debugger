import type {
  NoArgumentsResult,
  OneImmediateResult,
  OneOffsetResult,
  OneRegisterOneImmediateOneOffsetResult,
  OneRegisterOneImmediateResult,
  OneRegisterTwoImmediatesResult,
  ThreeRegistersResult,
  TwoImmediatesResult,
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
  OneImmediateResult,
  TwoImmediatesResult,
  OneOffsetResult,
  OneRegisterOneImmediateResult,
  OneRegisterTwoImmediatesResult,
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
    noOfBytesToSkip: 1,
  };

  results[ArgumentType.ONE_IMMEDIATE] = {
    type: ArgumentType.ONE_IMMEDIATE,
    noOfBytesToSkip: 1,
    immediateDecoder: new ImmediateDecoder(),
  };

  results[ArgumentType.TWO_REGISTERS] = {
    type: ArgumentType.TWO_REGISTERS,
    noOfBytesToSkip: 1,
    firstRegisterIndex: 0,
    secondRegisterIndex: 0,
  };

  results[ArgumentType.THREE_REGISTERS] = {
    type: ArgumentType.THREE_REGISTERS,
    noOfBytesToSkip: 1,
    firstRegisterIndex: 0,
    secondRegisterIndex: 0,
    thirdRegisterIndex: 0,
  };

  results[ArgumentType.ONE_REGISTER_ONE_IMMEDIATE_ONE_OFFSET] = {
    type: ArgumentType.ONE_REGISTER_ONE_IMMEDIATE_ONE_OFFSET,
    noOfBytesToSkip: 1,
    firstRegisterIndex: 0,
    immediateDecoder: new ImmediateDecoder(),
    nextPc: 0,
  };

  results[ArgumentType.TWO_REGISTERS_ONE_OFFSET] = {
    type: ArgumentType.TWO_REGISTERS_ONE_OFFSET,
    noOfBytesToSkip: 1,
    firstRegisterIndex: 0,
    secondRegisterIndex: 0,
    nextPc: 0,
  };

  results[ArgumentType.TWO_REGISTERS_ONE_IMMEDIATE] = {
    type: ArgumentType.TWO_REGISTERS_ONE_IMMEDIATE,
    noOfBytesToSkip: 1,
    firstRegisterIndex: 0,
    secondRegisterIndex: 0,
    immediateDecoder: new ImmediateDecoder(),
  };

  results[ArgumentType.ONE_REGISTER_ONE_IMMEDIATE] = {
    type: ArgumentType.ONE_REGISTER_ONE_IMMEDIATE,
    noOfBytesToSkip: 1,
    firstRegisterIndex: 0,
    immediateDecoder: new ImmediateDecoder(),
  };

  results[ArgumentType.ONE_REGISTER_TWO_IMMEDIATES] = {
    type: ArgumentType.ONE_REGISTER_TWO_IMMEDIATES,
    noOfBytesToSkip: 1,
    registerIndex: 0,
    firstImmediateDecoder: new ImmediateDecoder(),
    secondImmediateDecoder: new ImmediateDecoder(),
  };

  results[ArgumentType.ONE_OFFSET] = {
    type: ArgumentType.ONE_OFFSET,
    noOfBytesToSkip: 1,
    nextPc: 0,
  };

  results[ArgumentType.TWO_IMMEDIATES] = {
    type: ArgumentType.TWO_IMMEDIATES,
    noOfBytesToSkip: 1,
    firstImmediateDecoder: new ImmediateDecoder(),
    secondImmediateDecoder: new ImmediateDecoder(),
  };

  results[ArgumentType.TWO_REGISTERS_TWO_IMMEDIATES] = {
    type: ArgumentType.TWO_REGISTERS_TWO_IMMEDIATES,
    noOfBytesToSkip: 1,
    firstImmediateDecoder: new ImmediateDecoder(),
    secondImmediateDecoder: new ImmediateDecoder(),
    firstRegisterIndex: 0,
    secondRegisterIndex: 0,
  };

  return results;
};
