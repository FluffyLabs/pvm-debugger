import { NumeralSystem } from "@/context/NumeralSystem.tsx";
import { ArgumentType, Args } from "@typeberry/pvm-debugger-adapter";
import { ArgumentBitLengths, ArgsDecoder } from "@/packages/pvm/pvm/args-decoder";

export const valueToNumeralSystem = (
  value: number | bigint | undefined,
  numeralSystem: NumeralSystem,
  padStartVal: number = 0,
  withPrefix: boolean = true,
): string => {
  const stringValue =
    typeof value === "bigint" ? BigInt.asUintN(64, value).toString(16) : ((value ?? 0) >>> 0).toString(16);

  return numeralSystem === NumeralSystem.HEXADECIMAL
    ? `${withPrefix ? "0x" : ""}${stringValue.padStart(padStartVal, "0")}`
    : (value ?? 0).toString().padStart(padStartVal, "0");
};

export const valueToBinary = (value?: number | bigint | string, padStartVal: number = 0): string => {
  return ((Number(value) ?? 0) >>> 0).toString(2).padStart(padStartVal, "0");
};

export enum argType {
  IMMEDIATE = "IMMEDIATE",
  OFFSET = "OFFSET",
  REGISTER = "REGISTER",
  EXTENDED_WIDTH_IMMEDIATE = "EXTENDED_WIDTH_IMMEDIATE",
}

export const getArgumentBitLengths = (
  argsDecoder: ArgsDecoder,
  pc: number,
  argType: ArgumentType,
): ArgumentBitLengths => {
  return argsDecoder.calculateArgumentBitLengths(pc, argType);
};

export const mapInstructionsArgsByType = (
  args: Args | null,
  numeralSystem: NumeralSystem,
  counter: number,
):
  | {
      type: argType;
      value: string | number;
      valueFormatted?: string | number;
      argumentBitLength?: number;
    }[]
  | null => {
  if (!args) return null;

  // Create an instance of ArgsDecoder to calculate bit lengths
  const argsDecoder = new ArgsDecoder();
  // Calculate bit lengths for the current instruction
  const bitLengths =
    args.type !== ArgumentType.NO_ARGUMENTS ? getArgumentBitLengths(argsDecoder, counter, args.type) : undefined;

  switch (args.type) {
    case ArgumentType.NO_ARGUMENTS:
      return [];
    case ArgumentType.ONE_IMMEDIATE:
      return [
        {
          type: argType.IMMEDIATE,
          value: valueToNumeralSystem(args.immediateDecoder.getI64(), numeralSystem),
          argumentBitLength: bitLengths?.immediateDecoderBits,
        },
      ];
    case ArgumentType.TWO_IMMEDIATES:
      return [
        {
          type: argType.IMMEDIATE,
          value: valueToNumeralSystem(args?.firstImmediateDecoder.getI64(), numeralSystem),
          argumentBitLength: bitLengths?.firstImmediateDecoderBits,
        },
        {
          type: argType.IMMEDIATE,
          value: valueToNumeralSystem(args?.secondImmediateDecoder.getI64(), numeralSystem),
          argumentBitLength: bitLengths?.secondImmediateDecoderBits,
        },
      ];
    case ArgumentType.ONE_OFFSET:
      return [
        {
          type: argType.OFFSET,
          value: valueToNumeralSystem(args?.nextPc - counter, numeralSystem),
          argumentBitLength: bitLengths?.nextPcBits,
        },
      ];
    case ArgumentType.ONE_REGISTER_ONE_IMMEDIATE:
      return [
        {
          type: argType.REGISTER,
          value: args?.registerIndex,
          valueFormatted: `ω<sub>${args?.registerIndex}</sub>`,
          argumentBitLength: bitLengths?.registerIndexBits || 4,
        },
        {
          type: argType.IMMEDIATE,
          value: valueToNumeralSystem(args.immediateDecoder.getI64(), numeralSystem),
          argumentBitLength: bitLengths?.immediateDecoderBits,
        },
      ];
    case ArgumentType.ONE_REGISTER_TWO_IMMEDIATES:
      return [
        {
          type: argType.REGISTER,
          value: args?.registerIndex,
          valueFormatted: `ω<sub>${args?.registerIndex}</sub>`,
          argumentBitLength: bitLengths?.registerIndexBits || 4,
        },
        {
          type: argType.IMMEDIATE,
          value: valueToNumeralSystem(args?.firstImmediateDecoder.getI64(), numeralSystem),
          argumentBitLength: bitLengths?.firstImmediateDecoderBits,
        },
        {
          type: argType.IMMEDIATE,
          value: valueToNumeralSystem(args?.secondImmediateDecoder.getI64(), numeralSystem),
          argumentBitLength: bitLengths?.secondImmediateDecoderBits,
        },
      ];
    case ArgumentType.ONE_REGISTER_ONE_IMMEDIATE_ONE_OFFSET:
      return [
        {
          type: argType.REGISTER,
          value: args?.registerIndex,
          valueFormatted: `ω<sub>${args?.registerIndex}</sub>`,
          argumentBitLength: bitLengths?.registerIndexBits || 4,
        },
        {
          type: argType.IMMEDIATE,
          value: valueToNumeralSystem(args?.immediateDecoder.getI64(), numeralSystem),
          argumentBitLength: bitLengths?.immediateDecoderBits,
        },
        {
          type: argType.OFFSET,
          value: valueToNumeralSystem(args?.nextPc - counter, numeralSystem),
          argumentBitLength: bitLengths?.nextPcBits,
        },
      ];
    case ArgumentType.ONE_REGISTER_ONE_EXTENDED_WIDTH_IMMEDIATE:
      return [
        {
          type: argType.REGISTER,
          value: args?.registerIndex,
          valueFormatted: `ω<sub>${args?.registerIndex}</sub>`,
          argumentBitLength: bitLengths?.registerIndexBits || 4,
        },
        {
          type: argType.EXTENDED_WIDTH_IMMEDIATE,
          value: valueToNumeralSystem(args?.immediateDecoder.getValue(), numeralSystem),
          argumentBitLength: bitLengths?.immediateDecoderBits,
        },
      ];
    case ArgumentType.TWO_REGISTERS:
      return [
        {
          type: argType.REGISTER,
          value: args?.firstRegisterIndex,
          valueFormatted: `ω<sub>${args?.firstRegisterIndex}</sub>`,
          argumentBitLength: bitLengths?.firstRegisterIndexBits || 4,
        },
        {
          type: argType.REGISTER,
          value: args?.secondRegisterIndex,
          valueFormatted: `ω<sub>${args?.secondRegisterIndex}</sub>`,
          argumentBitLength: bitLengths?.secondRegisterIndexBits || 4,
        },
      ];
    case ArgumentType.TWO_REGISTERS_ONE_IMMEDIATE:
      return [
        {
          type: argType.REGISTER,
          value: args?.firstRegisterIndex,
          valueFormatted: `ω<sub>${args?.firstRegisterIndex}</sub>`,
          argumentBitLength: bitLengths?.firstRegisterIndexBits || 4,
        },
        {
          type: argType.REGISTER,
          value: args?.secondRegisterIndex,
          valueFormatted: `ω<sub>${args?.secondRegisterIndex}</sub>`,
          argumentBitLength: bitLengths?.secondRegisterIndexBits || 4,
        },
        {
          type: argType.IMMEDIATE,
          value: valueToNumeralSystem(args?.immediateDecoder.getI64(), numeralSystem),
          argumentBitLength: bitLengths?.immediateDecoderBits,
        },
      ];
    case ArgumentType.TWO_REGISTERS_ONE_OFFSET:
      return [
        {
          type: argType.REGISTER,
          value: args?.firstRegisterIndex,
          valueFormatted: `ω<sub>${args?.firstRegisterIndex}</sub>`,
          argumentBitLength: bitLengths?.firstRegisterIndexBits || 4,
        },
        {
          type: argType.REGISTER,
          value: args?.secondRegisterIndex,
          valueFormatted: `ω<sub>${args?.secondRegisterIndex}</sub>`,
          argumentBitLength: bitLengths?.secondRegisterIndexBits || 4,
        },
        {
          type: argType.OFFSET,
          value: valueToNumeralSystem(args?.nextPc - counter, numeralSystem),
          argumentBitLength: bitLengths?.nextPcBits,
        },
      ];
    case ArgumentType.TWO_REGISTERS_TWO_IMMEDIATES:
      return [
        {
          type: argType.REGISTER,
          value: args?.firstRegisterIndex,
          valueFormatted: `ω<sub>${args?.firstRegisterIndex}</sub>`,
          argumentBitLength: bitLengths?.firstRegisterIndexBits || 4,
        },
        {
          type: argType.REGISTER,
          value: args?.secondRegisterIndex,
          valueFormatted: `ω<sub>${args?.secondRegisterIndex}</sub>`,
          argumentBitLength: bitLengths?.secondRegisterIndexBits || 4,
        },
        {
          type: argType.IMMEDIATE,
          value: valueToNumeralSystem(args?.firstImmediateDecoder.getI64(), numeralSystem),
          argumentBitLength: bitLengths?.firstImmediateDecoderBits,
        },
        {
          type: argType.IMMEDIATE,
          value: valueToNumeralSystem(args?.secondImmediateDecoder.getI64(), numeralSystem),
          argumentBitLength: bitLengths?.secondImmediateDecoderBits,
        },
      ];
    case ArgumentType.THREE_REGISTERS:
      return [
        {
          type: argType.REGISTER,
          value: args?.firstRegisterIndex,
          valueFormatted: `ω<sub>${args?.firstRegisterIndex}</sub>`,
          argumentBitLength: bitLengths?.firstRegisterIndexBits || 4,
        },
        {
          type: argType.REGISTER,
          value: args?.secondRegisterIndex,
          valueFormatted: `ω<sub>${args?.secondRegisterIndex}</sub>`,
          argumentBitLength: bitLengths?.secondRegisterIndexBits || 4,
        },
        {
          type: argType.REGISTER,
          value: args?.thirdRegisterIndex,
          valueFormatted: `ω<sub>${args?.thirdRegisterIndex}</sub>`,
          argumentBitLength: bitLengths?.thirdRegisterIndexBits || 4,
        },
      ];
    default:
      return null;
  }
};
