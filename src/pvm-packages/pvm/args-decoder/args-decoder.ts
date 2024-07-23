import type { Instruction } from "../instruction";
import type { Mask } from "../program-decoder/mask";
import { createResults } from "./args-decoding-results";
import { ArgumentType } from "./argument-type";
import { ImmediateDecoder } from "./decoders/immediate-decoder";
import { RegisterIndexDecoder } from "./decoders/register-index-decoder";
import { instructionArgumentTypeMap } from "./instruction-argument-type-map";

export type NoArgumentsResult = {
  type: ArgumentType.NO_ARGUMENTS;
  noOfInstructionsToSkip: number;
};

export type ThreeRegistersResult = {
  type: ArgumentType.THREE_REGISTERS;
  noOfInstructionsToSkip: number;
  firstRegisterIndex: number;
  secondRegisterIndex: number;
  thirdRegisterIndex: number;
};

export type TwoRegistersResult = {
  type: ArgumentType.TWO_REGISTERS;
  noOfInstructionsToSkip: number;
  firstRegisterIndex: number;
  secondRegisterIndex: number;
};

export type TwoRegistersOneImmediateResult = {
  type: ArgumentType.TWO_REGISTERS_ONE_IMMEDIATE;
  noOfInstructionsToSkip: number;
  firstRegisterIndex: number;
  secondRegisterIndex: number;
  immediateDecoder1: ImmediateDecoder;
};

export type TwoRegistersTwoImmediatesResult = {
  type: ArgumentType.TWO_REGISTERS_TWO_IMMEDIATE;
  noOfInstructionsToSkip: number;
  firstRegisterIndex: number;
  secondRegisterIndex: number;
  immediateDecoder1: ImmediateDecoder;
  immediateDecoder2: ImmediateDecoder;
};

export type OneOffsetResult = {
  type: ArgumentType.ONE_OFFSET;
  noOfInstructionsToSkip: number;
  offset: unknown;
};

type Result = NoArgumentsResult | TwoRegistersResult | ThreeRegistersResult | TwoRegistersOneImmediateResult | TwoRegistersTwoImmediatesResult | OneOffsetResult;

export class ArgsDecoder {
  private registerIndexDecoder = new RegisterIndexDecoder();
  private immediateDecoder1 = new ImmediateDecoder();
  // private immediateDecoder2 = new ImmediateDecoder();

  private results = createResults(); // [MaSi] because I don't want to allocate memory for each instruction

  constructor(
    private code: Uint8Array,
    private mask: Mask,
  ) {}

  getArgs(pc: number): Result {
    const instruction: Instruction = this.code[pc];
    const argsType = instructionArgumentTypeMap[instruction];

    switch (argsType) {
      case ArgumentType.NO_ARGUMENTS:
        return this.results[argsType];
      case ArgumentType.THREE_REGISTERS: {
        const result = this.results[argsType];
        result.type = ArgumentType.THREE_REGISTERS;
        result.noOfInstructionsToSkip = 3;
        const firstByte = this.code[pc + 1];
        const secondByte = this.code[pc + 2];
        this.registerIndexDecoder.setByte(firstByte);
        result.firstRegisterIndex = this.registerIndexDecoder.getFirstIndex();
        result.secondRegisterIndex = this.registerIndexDecoder.getSecondIndex();
        this.registerIndexDecoder.setByte(secondByte);
        result.thirdRegisterIndex = this.registerIndexDecoder.getSecondIndex();
        return result;
      }

      case ArgumentType.TWO_REGISTERS_ONE_IMMEDIATE: {
        const result = this.results[argsType];
        result.type = ArgumentType.TWO_REGISTERS_ONE_IMMEDIATE;
        const firstByte = this.code[pc + 1];
        this.registerIndexDecoder.setByte(firstByte);
        result.firstRegisterIndex = this.registerIndexDecoder.getFirstIndex();
        result.secondRegisterIndex = this.registerIndexDecoder.getSecondIndex();

        const immediateBytes = this.mask.getNoOfBytesToNextInstruction(pc + 1);
        result.noOfInstructionsToSkip = 1 + immediateBytes;

        this.immediateDecoder1.setBytes(this.code.subarray(pc + 2, pc + 2 + immediateBytes + 1));
        result.immediateDecoder1 = this.immediateDecoder1;
        return result;
      }

      case ArgumentType.TWO_REGISTERS: {
        const result = this.results[argsType];
        result.type = ArgumentType.TWO_REGISTERS;
        result.noOfInstructionsToSkip = 2;
        const firstByte = this.code[pc + 1];
        this.registerIndexDecoder.setByte(firstByte);
        result.firstRegisterIndex = this.registerIndexDecoder.getFirstIndex();
        result.secondRegisterIndex = this.registerIndexDecoder.getSecondIndex();
        return result;
      }

      default:
        throw new Error("instruction was not matched!");
    }
  }
}
