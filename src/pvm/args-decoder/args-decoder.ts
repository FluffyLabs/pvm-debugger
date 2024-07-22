import { ArgumentType } from "./argument-type";
import { ImmediateDecoder } from "./decoders/immediate-decoder";
import { RegisterIndexDecoder } from "./decoders/register-index-decoder";
import { instructionArgumentTypeMap } from "./instruction-argument-type-map";

type NullablePartial<T> = { [P in keyof T]?: T[P] | null };

export type NoArgumentsResult = {
  noOfInstructionsToSkip: number;
};
export type ThreeRegistersResult = {
  noOfInstructionsToSkip: number;
  firstRegisterIndex: number;
  secondRegisterIndex: number;
  thirdRegisterIndex: number;
};

export type TwoRegistersOneImmediateResult = {
  noOfInstructionsToSkip: number;
  firstRegisterIndex: number;
  secondRegisterIndex: number;
  immediateDecoder1: ImmediateDecoder;
};

export type TwoRegistersTwoImmediatesResult = {
  noOfInstructionsToSkip: number;
  firstRegisterIndex: number;
  secondRegisterIndex: number;
  immediateDecoder1: ImmediateDecoder;
  immediateDecoder2: ImmediateDecoder;
};

export type OneOffsetResult = {
  noOfInstructionsToSkip: number;
  offset: unknown;
};

type Result = NoArgumentsResult | ThreeRegistersResult | TwoRegistersOneImmediateResult | TwoRegistersTwoImmediatesResult | OneOffsetResult;

type AllResults = NoArgumentsResult & ThreeRegistersResult & TwoRegistersOneImmediateResult & TwoRegistersTwoImmediatesResult & OneOffsetResult;

const createResult = (): NullablePartial<AllResults> => ({
  noOfInstructionsToSkip: 1,

  firstRegisterIndex: null,
  secondRegisterIndex: null,
  thirdRegisterIndex: null,

  immediateDecoder1: null,
  immediateDecoder2: null,

  offset: null,
});

const MAX_ARGS_LENGTH = 24;

export class ArgsDecoder {
  private registerIndexDecoder = new RegisterIndexDecoder();
  private immediateDecoder1 = new ImmediateDecoder();
  // private immediateDecoder2 = new ImmediateDecoder();

  private result = createResult(); // [MaSi] because I don't want to allocate memory for each instruction

  constructor(
    private code: number[],
    private mask: number[],
  ) {}

  private isInstruction(counter: number) {
    const byteNumber = Math.floor(counter / 8);
    const bitNumber = counter % 8;
    const mask = 1 << bitNumber;
    return (this.mask[byteNumber] & mask) > 0;
  }

  private getBytesToNextInstruction(counter: number) {
    let noOfBytes = 0;
    for (let i = counter + 1; i <= counter + MAX_ARGS_LENGTH; i++) {
      if (this.isInstruction(i)) {
        break;
      }

      noOfBytes++;
    }

    return noOfBytes;
  }

  private resetResult() {
    this.result.noOfInstructionsToSkip = 1;

    this.result.firstRegisterIndex = null;
    this.result.secondRegisterIndex = null;
    this.result.thirdRegisterIndex = null;

    this.result.immediateDecoder1 = null;
    this.result.immediateDecoder2 = null;

    this.result.offset = null;
  }

  getArgs(pc: number): Result {
    this.resetResult();

    const instruction = this.code[pc];
    const argsType = instructionArgumentTypeMap[instruction];

    switch (argsType) {
      case ArgumentType.NO_ARGUMENTS:
        return this.result as NoArgumentsResult;
      case ArgumentType.THREE_REGISTERS: {
        const result = this.result as ThreeRegistersResult;
        result.noOfInstructionsToSkip = 3;
        const firstByte = this.code[pc + 1];
        const secondByte = this.code[pc + 2];
        this.registerIndexDecoder.setByte(firstByte);
        result.firstRegisterIndex = this.registerIndexDecoder.getFirstIndex();
        result.secondRegisterIndex = this.registerIndexDecoder.getSecondIndex();
        this.registerIndexDecoder.setByte(secondByte);
        result.thirdRegisterIndex = this.registerIndexDecoder.getSecondIndex();
        return this.result as ThreeRegistersResult;
      }

      case ArgumentType.TWO_REGISTERS_ONE_IMMEDIATE: {
        const result = this.result as TwoRegistersOneImmediateResult;

        const firstByte = this.code[pc + 1];
        this.registerIndexDecoder.setByte(firstByte);
        result.firstRegisterIndex = this.registerIndexDecoder.getFirstIndex();
        result.secondRegisterIndex = this.registerIndexDecoder.getSecondIndex();

        const immediateBytes = this.getBytesToNextInstruction(pc + 1) + 1;
        this.result.noOfInstructionsToSkip = 1 + immediateBytes;

        this.immediateDecoder1.setBytes(
          new Uint8Array(
            this.code.slice(pc + 2, pc + 2 + immediateBytes + 1), // TODO [MaSi] remove allocation
          ),
        );
        result.immediateDecoder1 = this.immediateDecoder1;
        return this.result as TwoRegistersOneImmediateResult;
      }

      default:
        throw new Error("instruction was not matched!");
    }
  }
}
