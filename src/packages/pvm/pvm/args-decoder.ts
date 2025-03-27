import { ArgumentType, Mask } from "@typeberry/pvm-debugger-adapter";
import { NibblesDecoder, ArgsDecoder as TypeberryArgsDecoder } from "@typeberry/pvm-debugger-adapter";

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

export class ArgsDecoder {
  private nibblesDecoder = new NibblesDecoder();
  private code: Uint8Array = new Uint8Array();
  private mask: Mask = Mask.empty();
  private typeberryArgsDecoder = new TypeberryArgsDecoder();

  reset(code: Uint8Array, mask: Mask) {
    this.typeberryArgsDecoder.reset(code, mask);
    this.code = code;
    this.mask = mask;
  }

  fillArgs: typeof this.typeberryArgsDecoder.fillArgs = (pc, result): void => {
    this.typeberryArgsDecoder.fillArgs(pc, result);
  };

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
