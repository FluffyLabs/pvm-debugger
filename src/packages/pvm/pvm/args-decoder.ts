import { ArgumentType, Mask } from "@typeberry/pvm-debugger-adapter";
import { ExtendedWitdthImmediateDecoder } from "@/packages/pvm/decoders/extended-with-immediate-decoder.ts";
import { ImmediateDecoder } from "../decoders/immediate-decoder";
import { NibblesDecoder } from "../decoders/nibbles-decoder";

const IMMEDIATE_AND_OFFSET_MAX_LENGTH = 4;
const BITS_PER_BYTE = 8;
const REGISTER_BITS_LENGTH = 4;

// Add new interfaces for tracking bit lengths separately
export interface ArgumentBitLengths {
  firstRegisterIndexBits?: number;
  secondRegisterIndexBits?: number;
  thirdRegisterIndexBits?: number;
  registerIndexBits?: number;
  immediateDecoderBits?: number;
  firstImmediateDecoderBits?: number;
  secondImmediateDecoderBits?: number;
  firstImmediateLength?: number;
  firstImmediateLengthBits?: number;
  offsetBits?: number;
  totalBits: number;
}

export type EmptyArgs = {
  type: ArgumentType.NO_ARGUMENTS;
  noOfBytesToSkip: number;
};

export type OneImmediateArgs = {
  type: ArgumentType.ONE_IMMEDIATE;
  noOfBytesToSkip: number;
  immediateDecoder: ImmediateDecoder;
};

export type ThreeRegistersArgs = {
  type: ArgumentType.THREE_REGISTERS;
  noOfBytesToSkip: number;
  firstRegisterIndex: number;
  secondRegisterIndex: number;
  thirdRegisterIndex: number;
};

export type TwoRegistersArgs = {
  type: ArgumentType.TWO_REGISTERS;
  noOfBytesToSkip: number;
  firstRegisterIndex: number;
  secondRegisterIndex: number;
};

export type TwoRegistersOneImmediateArgs = {
  type: ArgumentType.TWO_REGISTERS_ONE_IMMEDIATE;
  noOfBytesToSkip: number;
  firstRegisterIndex: number;
  secondRegisterIndex: number;
  immediateDecoder: ImmediateDecoder;
};

export type OneRegisterOneImmediateArgs = {
  type: ArgumentType.ONE_REGISTER_ONE_IMMEDIATE;
  noOfBytesToSkip: number;
  registerIndex: number;
  immediateDecoder: ImmediateDecoder;
};

export type OneRegisterOneExtendedWidthImmediateArgs = {
  type: ArgumentType.ONE_REGISTER_ONE_EXTENDED_WIDTH_IMMEDIATE;
  noOfBytesToSkip: number;
  registerIndex: number;
  immediateDecoder: ExtendedWitdthImmediateDecoder;
};

export type TwoRegistersTwoImmediatesArgs = {
  type: ArgumentType.TWO_REGISTERS_TWO_IMMEDIATES;
  noOfBytesToSkip: number;
  firstRegisterIndex: number;
  secondRegisterIndex: number;
  firstImmediateDecoder: ImmediateDecoder;
  secondImmediateDecoder: ImmediateDecoder;
};

export type TwoImmediatesArgs = {
  type: ArgumentType.TWO_IMMEDIATES;
  noOfBytesToSkip: number;
  firstImmediateDecoder: ImmediateDecoder;
  secondImmediateDecoder: ImmediateDecoder;
};

export type TwoRegistersOneOffsetArgs = {
  type: ArgumentType.TWO_REGISTERS_ONE_OFFSET;
  noOfBytesToSkip: number;
  firstRegisterIndex: number;
  secondRegisterIndex: number;
  nextPc: number;
};

export type OneRegisterOneImmediateOneOffsetArgs = {
  type: ArgumentType.ONE_REGISTER_ONE_IMMEDIATE_ONE_OFFSET;
  noOfBytesToSkip: number;
  registerIndex: number;
  immediateDecoder: ImmediateDecoder;
  nextPc: number;
};

export type OneRegisterTwoImmediatesArgs = {
  type: ArgumentType.ONE_REGISTER_TWO_IMMEDIATES;
  noOfBytesToSkip: number;
  registerIndex: number;
  firstImmediateDecoder: ImmediateDecoder;
  secondImmediateDecoder: ImmediateDecoder;
};

export type OneOffsetArgs = {
  type: ArgumentType.ONE_OFFSET;
  noOfBytesToSkip: number;
  nextPc: number;
};

export type Args =
  | EmptyArgs
  | OneImmediateArgs
  | TwoRegistersArgs
  | ThreeRegistersArgs
  | TwoRegistersOneImmediateArgs
  | TwoRegistersTwoImmediatesArgs
  | OneRegisterOneImmediateOneOffsetArgs
  | TwoRegistersOneOffsetArgs
  | OneRegisterOneImmediateArgs
  | OneOffsetArgs
  | TwoImmediatesArgs
  | OneRegisterTwoImmediatesArgs
  | OneRegisterOneExtendedWidthImmediateArgs;

export class ArgsDecoder {
  private nibblesDecoder = new NibblesDecoder();
  private offsetDecoder = new ImmediateDecoder();
  private code: Uint8Array = new Uint8Array();
  private mask: Mask = Mask.empty();

  reset(code: Uint8Array, mask: Mask) {
    this.code = code;
    this.mask = mask;
  }

  fillArgs<T extends Args>(pc: number, result: T): void {
    const nextInstructionDistance = 1 + this.mask.getNoOfBytesToNextInstruction(pc + 1);
    result.noOfBytesToSkip = nextInstructionDistance;

    switch (result.type) {
      case ArgumentType.NO_ARGUMENTS:
        break;

      case ArgumentType.ONE_IMMEDIATE: {
        const immediateLength = Math.min(IMMEDIATE_AND_OFFSET_MAX_LENGTH, nextInstructionDistance - 1);
        const argsStartIndex = pc + 1;
        result.immediateDecoder.setBytes(this.code.subarray(argsStartIndex, argsStartIndex + immediateLength));
        break;
      }

      case ArgumentType.THREE_REGISTERS: {
        const firstByte = this.code[pc + 1];
        const secondByte = this.code[pc + 2];
        this.nibblesDecoder.setByte(firstByte);
        result.firstRegisterIndex = this.nibblesDecoder.getHighNibbleAsRegisterIndex();
        result.secondRegisterIndex = this.nibblesDecoder.getLowNibbleAsRegisterIndex();
        this.nibblesDecoder.setByte(secondByte);
        result.thirdRegisterIndex = this.nibblesDecoder.getLowNibbleAsRegisterIndex();
        break;
      }

      case ArgumentType.TWO_REGISTERS_ONE_IMMEDIATE: {
        const firstByte = this.code[pc + 1];
        this.nibblesDecoder.setByte(firstByte);
        result.firstRegisterIndex = this.nibblesDecoder.getHighNibbleAsRegisterIndex();
        result.secondRegisterIndex = this.nibblesDecoder.getLowNibbleAsRegisterIndex();

        const immediateLength = Math.min(IMMEDIATE_AND_OFFSET_MAX_LENGTH, Math.max(0, nextInstructionDistance - 2));
        const immediateStartIndex = pc + 2;
        const immediateEndIndex = immediateStartIndex + immediateLength;
        result.immediateDecoder.setBytes(this.code.subarray(immediateStartIndex, immediateEndIndex));
        break;
      }

      case ArgumentType.ONE_REGISTER_ONE_IMMEDIATE_ONE_OFFSET: {
        const firstByte = this.code[pc + 1];
        this.nibblesDecoder.setByte(firstByte);
        result.registerIndex = this.nibblesDecoder.getLowNibbleAsRegisterIndex();

        const immediateLength = this.nibblesDecoder.getHighNibbleAsLength();
        const immediateStartIndex = pc + 2;
        const immediateEndIndex = immediateStartIndex + immediateLength;
        result.immediateDecoder.setBytes(this.code.subarray(immediateStartIndex, immediateEndIndex));

        const offsetLength = Math.min(
          IMMEDIATE_AND_OFFSET_MAX_LENGTH,
          Math.max(0, nextInstructionDistance - 2 - immediateLength),
        );
        const offsetStartIndex = pc + 2 + immediateLength;
        const offsetEndIndex = offsetStartIndex + offsetLength;
        this.offsetDecoder.setBytes(this.code.subarray(offsetStartIndex, offsetEndIndex));

        result.nextPc = pc + this.offsetDecoder.getSigned();
        break;
      }

      case ArgumentType.TWO_REGISTERS_ONE_OFFSET: {
        const firstByte = this.code[pc + 1];
        this.nibblesDecoder.setByte(firstByte);
        result.firstRegisterIndex = this.nibblesDecoder.getLowNibbleAsRegisterIndex();
        result.secondRegisterIndex = this.nibblesDecoder.getHighNibbleAsRegisterIndex();

        const offsetLength = Math.min(IMMEDIATE_AND_OFFSET_MAX_LENGTH, Math.max(0, nextInstructionDistance - 2));
        const offsetStartIndex = pc + 2;
        const offsetEndIndex = offsetStartIndex + offsetLength;
        this.offsetDecoder.setBytes(this.code.subarray(offsetStartIndex, offsetEndIndex));

        result.nextPc = pc + this.offsetDecoder.getSigned();
        break;
      }

      case ArgumentType.TWO_REGISTERS: {
        const firstByte = this.code[pc + 1];
        this.nibblesDecoder.setByte(firstByte);
        result.firstRegisterIndex = this.nibblesDecoder.getHighNibbleAsRegisterIndex();
        result.secondRegisterIndex = this.nibblesDecoder.getLowNibbleAsRegisterIndex();
        break;
      }

      case ArgumentType.ONE_OFFSET: {
        const offsetLength = Math.min(IMMEDIATE_AND_OFFSET_MAX_LENGTH, nextInstructionDistance - 1);
        const offsetStartIndex = pc + 1;
        const offsetEndIndex = offsetStartIndex + offsetLength;
        const offsetBytes = this.code.subarray(offsetStartIndex, offsetEndIndex);
        this.offsetDecoder.setBytes(offsetBytes);
        const offsetValue = this.offsetDecoder.getSigned();
        result.nextPc = pc + offsetValue;
        break;
      }

      case ArgumentType.ONE_REGISTER_ONE_IMMEDIATE: {
        const firstByte = this.code[pc + 1];
        this.nibblesDecoder.setByte(firstByte);
        result.registerIndex = this.nibblesDecoder.getLowNibbleAsRegisterIndex();

        const immediateLength = Math.min(IMMEDIATE_AND_OFFSET_MAX_LENGTH, Math.max(0, nextInstructionDistance - 2));
        const immediateStartIndex = pc + 2;
        const immediateEndIndex = immediateStartIndex + immediateLength;
        const immediateBytes = this.code.subarray(immediateStartIndex, immediateEndIndex);
        result.immediateDecoder.setBytes(immediateBytes);
        break;
      }

      case ArgumentType.TWO_IMMEDIATES: {
        const firstByte = this.code[pc + 1];
        this.nibblesDecoder.setByte(firstByte);
        const firstImmediateLength = this.nibblesDecoder.getLowNibbleAsLength();
        const firstImmediateStartIndex = pc + 2;
        const firstImmediateEndIndex = firstImmediateStartIndex + firstImmediateLength;
        const firstImmediateBytes = this.code.subarray(firstImmediateStartIndex, firstImmediateEndIndex);
        result.firstImmediateDecoder.setBytes(firstImmediateBytes);

        const secondImmediateLength = Math.min(
          IMMEDIATE_AND_OFFSET_MAX_LENGTH,
          Math.max(0, nextInstructionDistance - 2 - firstImmediateLength),
        );
        const secondImmediateStartIndex = firstImmediateEndIndex;
        const secondImmediateEndIndex = secondImmediateStartIndex + secondImmediateLength;
        const secondImmediateBytes = this.code.subarray(secondImmediateStartIndex, secondImmediateEndIndex);
        result.secondImmediateDecoder.setBytes(secondImmediateBytes);
        break;
      }

      case ArgumentType.ONE_REGISTER_TWO_IMMEDIATES: {
        const firstByte = this.code[pc + 1];
        this.nibblesDecoder.setByte(firstByte);
        result.registerIndex = this.nibblesDecoder.getLowNibbleAsRegisterIndex();

        const firstImmediateLength = this.nibblesDecoder.getHighNibbleAsLength();
        const firstImmediateStartIndex = pc + 2;
        const firstImmediateEndIndex = firstImmediateStartIndex + firstImmediateLength;
        const firstImmediateBytes = this.code.subarray(firstImmediateStartIndex, firstImmediateEndIndex);
        result.firstImmediateDecoder.setBytes(firstImmediateBytes);

        const secondImmediateLength = Math.min(
          IMMEDIATE_AND_OFFSET_MAX_LENGTH,
          Math.max(0, nextInstructionDistance - 2 - firstImmediateLength),
        );
        const secondImmediateStartIndex = firstImmediateEndIndex;
        const secondImmediateEndIndex = secondImmediateStartIndex + secondImmediateLength;
        const secondImmediateBytes = this.code.subarray(secondImmediateStartIndex, secondImmediateEndIndex);
        result.secondImmediateDecoder.setBytes(secondImmediateBytes);
        break;
      }

      case ArgumentType.TWO_REGISTERS_TWO_IMMEDIATES: {
        const firstByte = this.code[pc + 1];
        this.nibblesDecoder.setByte(firstByte);
        result.firstRegisterIndex = this.nibblesDecoder.getLowNibbleAsRegisterIndex();
        result.secondRegisterIndex = this.nibblesDecoder.getHighNibbleAsRegisterIndex();

        const secondByte = this.code[pc + 2];
        this.nibblesDecoder.setByte(secondByte);
        const firstImmediateLength = this.nibblesDecoder.getLowNibbleAsLength();
        const firstImmediateStartIndex = pc + 3;
        const firstImmediateEndIndex = firstImmediateStartIndex + firstImmediateLength;
        const firstImmediateBytes = this.code.subarray(firstImmediateStartIndex, firstImmediateEndIndex);
        result.firstImmediateDecoder.setBytes(firstImmediateBytes);

        const secondImmediateLength = Math.min(
          IMMEDIATE_AND_OFFSET_MAX_LENGTH,
          Math.max(0, nextInstructionDistance - 3 - firstImmediateLength),
        );
        const secondImmediateStartIndex = firstImmediateEndIndex;
        const secondImmediateEndIndex = secondImmediateStartIndex + secondImmediateLength;
        const secondImmediateBytes = this.code.subarray(secondImmediateStartIndex, secondImmediateEndIndex);
        result.secondImmediateDecoder.setBytes(secondImmediateBytes);
        break;
      }

      case ArgumentType.ONE_REGISTER_ONE_EXTENDED_WIDTH_IMMEDIATE: {
        const firstByte = this.code[pc + 1];
        this.nibblesDecoder.setByte(firstByte);
        result.registerIndex = this.nibblesDecoder.getLowNibbleAsRegisterIndex();

        const immediateStartIndex = pc + 2;
        const immediateEndIndex = immediateStartIndex + 8;
        const immediateBytes = this.code.subarray(immediateStartIndex, immediateEndIndex);
        result.immediateDecoder.setBytes(immediateBytes);
        break;
      }
    }
  }

  calculateArgumentBitLengths(pc: number, argType: ArgumentType): ArgumentBitLengths {
    const nextInstructionDistance = 1 + this.mask.getNoOfBytesToNextInstruction(pc + 1);
    const totalBits = nextInstructionDistance * BITS_PER_BYTE;

    switch (argType) {
      case ArgumentType.NO_ARGUMENTS:
        return { totalBits };

      case ArgumentType.ONE_IMMEDIATE: {
        const immediateLength = Math.min(IMMEDIATE_AND_OFFSET_MAX_LENGTH, nextInstructionDistance - 1);
        return {
          immediateDecoderBits: immediateLength * BITS_PER_BYTE,
          totalBits,
        };
      }

      case ArgumentType.THREE_REGISTERS: {
        return {
          firstRegisterIndexBits: REGISTER_BITS_LENGTH,
          secondRegisterIndexBits: REGISTER_BITS_LENGTH,
          thirdRegisterIndexBits: REGISTER_BITS_LENGTH,
          totalBits,
        };
      }

      case ArgumentType.TWO_REGISTERS_ONE_IMMEDIATE: {
        const immediateLength = Math.min(IMMEDIATE_AND_OFFSET_MAX_LENGTH, Math.max(0, nextInstructionDistance - 2));
        return {
          firstRegisterIndexBits: REGISTER_BITS_LENGTH,
          secondRegisterIndexBits: REGISTER_BITS_LENGTH,
          immediateDecoderBits: immediateLength * BITS_PER_BYTE,
          totalBits,
        };
      }

      case ArgumentType.ONE_REGISTER_ONE_IMMEDIATE_ONE_OFFSET: {
        const firstByte = this.code[pc + 1];
        this.nibblesDecoder.setByte(firstByte);
        const immediateLength = this.nibblesDecoder.getHighNibbleAsLength();

        const offsetLength = Math.min(
          IMMEDIATE_AND_OFFSET_MAX_LENGTH,
          Math.max(0, nextInstructionDistance - 2 - immediateLength),
        );

        return {
          registerIndexBits: REGISTER_BITS_LENGTH,
          firstImmediateLength: immediateLength,
          firstImmediateLengthBits: 4,
          immediateDecoderBits: immediateLength * BITS_PER_BYTE,
          offsetBits: offsetLength * BITS_PER_BYTE,
          totalBits,
        };
      }

      case ArgumentType.TWO_REGISTERS_ONE_OFFSET: {
        const offsetLength = Math.min(IMMEDIATE_AND_OFFSET_MAX_LENGTH, Math.max(0, nextInstructionDistance - 2));

        return {
          firstRegisterIndexBits: REGISTER_BITS_LENGTH,
          secondRegisterIndexBits: REGISTER_BITS_LENGTH,
          offsetBits: offsetLength * BITS_PER_BYTE,
          totalBits,
        };
      }

      case ArgumentType.TWO_REGISTERS: {
        return {
          firstRegisterIndexBits: REGISTER_BITS_LENGTH,
          secondRegisterIndexBits: REGISTER_BITS_LENGTH,
          totalBits,
        };
      }

      case ArgumentType.ONE_OFFSET: {
        const offsetLength = Math.min(IMMEDIATE_AND_OFFSET_MAX_LENGTH, nextInstructionDistance - 1);

        return {
          offsetBits: offsetLength * BITS_PER_BYTE,
          totalBits,
        };
      }

      case ArgumentType.ONE_REGISTER_ONE_IMMEDIATE: {
        const immediateLength = Math.min(IMMEDIATE_AND_OFFSET_MAX_LENGTH, Math.max(0, nextInstructionDistance - 2));

        return {
          registerIndexBits: REGISTER_BITS_LENGTH,
          immediateDecoderBits: immediateLength * BITS_PER_BYTE,
          totalBits,
        };
      }

      case ArgumentType.TWO_IMMEDIATES: {
        const firstByte = this.code[pc + 1];
        this.nibblesDecoder.setByte(firstByte);
        const firstImmediateLength = this.nibblesDecoder.getLowNibbleAsLength();

        const secondImmediateLength = Math.min(
          IMMEDIATE_AND_OFFSET_MAX_LENGTH,
          Math.max(0, nextInstructionDistance - 2 - firstImmediateLength),
        );

        return {
          firstImmediateLength,
          firstImmediateLengthBits: 4,
          firstImmediateDecoderBits: firstImmediateLength * BITS_PER_BYTE,
          secondImmediateDecoderBits: secondImmediateLength * BITS_PER_BYTE,
          totalBits,
        };
      }

      case ArgumentType.ONE_REGISTER_TWO_IMMEDIATES: {
        const firstByte = this.code[pc + 1];
        this.nibblesDecoder.setByte(firstByte);
        const firstImmediateLength = this.nibblesDecoder.getHighNibbleAsLength();

        const secondImmediateLength = Math.min(
          IMMEDIATE_AND_OFFSET_MAX_LENGTH,
          Math.max(0, nextInstructionDistance - 2 - firstImmediateLength),
        );

        return {
          registerIndexBits: REGISTER_BITS_LENGTH,
          firstImmediateLength,
          firstImmediateLengthBits: 4,
          firstImmediateDecoderBits: firstImmediateLength * BITS_PER_BYTE,
          secondImmediateDecoderBits: secondImmediateLength * BITS_PER_BYTE,
          totalBits,
        };
      }

      case ArgumentType.TWO_REGISTERS_TWO_IMMEDIATES: {
        const secondByte = this.code[pc + 2];
        this.nibblesDecoder.setByte(secondByte);
        const firstImmediateLength = this.nibblesDecoder.getLowNibbleAsLength();

        const secondImmediateLength = Math.min(
          IMMEDIATE_AND_OFFSET_MAX_LENGTH,
          Math.max(0, nextInstructionDistance - 3 - firstImmediateLength),
        );

        return {
          firstRegisterIndexBits: REGISTER_BITS_LENGTH,
          secondRegisterIndexBits: REGISTER_BITS_LENGTH,
          firstImmediateLength,
          firstImmediateLengthBits: 4,
          firstImmediateDecoderBits: firstImmediateLength * BITS_PER_BYTE,
          secondImmediateDecoderBits: secondImmediateLength * BITS_PER_BYTE,
          totalBits,
        };
      }

      case ArgumentType.ONE_REGISTER_ONE_EXTENDED_WIDTH_IMMEDIATE: {
        return {
          registerIndexBits: REGISTER_BITS_LENGTH,
          immediateDecoderBits: 8 * BITS_PER_BYTE, // 8 bytes for extended width immediate
          totalBits,
        };
      }

      default:
        return { totalBits };
    }
  }
}
