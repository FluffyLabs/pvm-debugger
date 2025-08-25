import { NumeralSystem } from "@/context/NumeralSystem.tsx";
import { ArgumentType, Args, ProgramDecoder, BasicBlocks } from "@typeberry/pvm-debugger-adapter";
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
  return (Number(value ?? 0) >>> 0).toString(2).padStart(padStartVal, "0");
};

export enum argType {
  IMMEDIATE = "IMMEDIATE",
  IMMEDIATE_LENGTH = "IMMEDIATE_LENGTH",
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

export const decodeAndGetArgsDecoder = (program: number[]) => {
  // Create an instance of ArgsDecoder to calculate bit lengths
  const programDecoder = new ProgramDecoder(new Uint8Array(program));
  const code = programDecoder.getCode();
  const mask = programDecoder.getMask();
  const blocks = new BasicBlocks();
  blocks.reset(code, mask);
  const argsDecoder = new ArgsDecoder();
  argsDecoder.reset(code, mask);
  return argsDecoder;
};

export const mapInstructionsArgsByType = (
  args: Args | null,
  numeralSystem: NumeralSystem,
  counter: number,
  argsDecoder: ArgsDecoder,
):
  | {
      type: argType;
      value: string | number;
      valueDecimal?: string | number;
      valueFormatted?: string | number;
      argumentBitLength?: number;
      hidden?: boolean;
      hiddenFromDetails?: boolean;
    }[]
  | null => {
  if (!args) return null;

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
          valueDecimal: Number(args.immediateDecoder.getI64()),
          argumentBitLength: bitLengths?.immediateDecoderBits,
          hiddenFromDetails: bitLengths?.immediateDecoderBits === 0,
        },
      ];
    case ArgumentType.TWO_IMMEDIATES:
      return [
        {
          type: argType.IMMEDIATE_LENGTH,
          value: valueToNumeralSystem(bitLengths?.firstImmediateLength, numeralSystem),
          valueDecimal: bitLengths?.firstImmediateLength,
          argumentBitLength: bitLengths?.firstImmediateLengthBits,
          hidden: true,
        },
        {
          type: argType.IMMEDIATE,
          value: valueToNumeralSystem(args?.firstImmediateDecoder.getI64(), numeralSystem),
          valueDecimal: args?.firstImmediateDecoder.getI64()?.toString(),
          argumentBitLength: bitLengths?.firstImmediateDecoderBits,
          hiddenFromDetails: bitLengths?.firstImmediateDecoderBits === 0,
        },
        {
          type: argType.IMMEDIATE,
          value: valueToNumeralSystem(args?.secondImmediateDecoder.getI64(), numeralSystem),
          valueDecimal: args?.secondImmediateDecoder.getI64()?.toString(),
          argumentBitLength: bitLengths?.secondImmediateDecoderBits,
          hiddenFromDetails: bitLengths?.secondImmediateDecoderBits === 0,
        },
      ];
    case ArgumentType.ONE_OFFSET:
      return [
        {
          type: argType.OFFSET,
          value: valueToNumeralSystem(args?.nextPc - counter, numeralSystem),
          valueDecimal: args?.nextPc - counter,
          argumentBitLength: bitLengths?.offsetBits,
          hiddenFromDetails: bitLengths?.offsetBits === 0,
        },
      ];
    case ArgumentType.ONE_REGISTER_ONE_IMMEDIATE:
      return [
        {
          type: argType.REGISTER,
          value: args?.registerIndex,
          valueDecimal: args?.registerIndex,
          valueFormatted: `ω<sub>A=${args?.registerIndex}</sub>`,
          argumentBitLength: bitLengths?.registerIndexBits || 4,
        },
        {
          type: argType.IMMEDIATE,
          value: valueToNumeralSystem(args.immediateDecoder.getI64(), numeralSystem),
          valueDecimal: args.immediateDecoder.getI64()?.toString(),
          argumentBitLength: bitLengths?.immediateDecoderBits,
          hiddenFromDetails: bitLengths?.immediateDecoderBits === 0,
        },
      ];
    case ArgumentType.ONE_REGISTER_TWO_IMMEDIATES:
      return [
        {
          type: argType.REGISTER,
          value: args?.registerIndex,
          valueDecimal: args?.registerIndex,
          valueFormatted: `ω<sub>A=${args?.registerIndex}</sub>`,
          argumentBitLength: bitLengths?.registerIndexBits || 4,
        },
        {
          type: argType.IMMEDIATE_LENGTH,
          value: valueToNumeralSystem(bitLengths?.firstImmediateLength, numeralSystem),
          valueDecimal: bitLengths?.firstImmediateLength,
          argumentBitLength: bitLengths?.firstImmediateLengthBits,
          hidden: true,
        },
        {
          type: argType.IMMEDIATE,
          value: valueToNumeralSystem(args?.firstImmediateDecoder.getI64(), numeralSystem),
          valueDecimal: args?.firstImmediateDecoder.getI64()?.toString(),
          argumentBitLength: bitLengths?.firstImmediateDecoderBits,
          hiddenFromDetails: bitLengths?.firstImmediateDecoderBits === 0,
        },
        {
          type: argType.IMMEDIATE,
          value: valueToNumeralSystem(args?.secondImmediateDecoder.getI64(), numeralSystem),
          valueDecimal: args?.secondImmediateDecoder.getI64()?.toString(),
          argumentBitLength: bitLengths?.secondImmediateDecoderBits,
          hiddenFromDetails: bitLengths?.secondImmediateDecoderBits === 0,
        },
      ];
    case ArgumentType.ONE_REGISTER_ONE_IMMEDIATE_ONE_OFFSET:
      return [
        {
          type: argType.REGISTER,
          value: args?.registerIndex,
          valueDecimal: args?.registerIndex,
          valueFormatted: `ω<sub>A=${args?.registerIndex}</sub>`,
          argumentBitLength: bitLengths?.registerIndexBits || 4,
        },
        {
          type: argType.IMMEDIATE_LENGTH,
          value: valueToNumeralSystem(bitLengths?.firstImmediateLength, numeralSystem),
          valueDecimal: bitLengths?.firstImmediateLength,
          argumentBitLength: bitLengths?.firstImmediateLengthBits,
          hidden: true,
        },
        {
          type: argType.IMMEDIATE,
          value: valueToNumeralSystem(args?.immediateDecoder.getI64(), numeralSystem),
          valueDecimal: args?.immediateDecoder.getI64()?.toString(),
          argumentBitLength: bitLengths?.immediateDecoderBits,
          hiddenFromDetails: bitLengths?.immediateDecoderBits === 0,
        },
        {
          type: argType.OFFSET,
          value: valueToNumeralSystem(args?.nextPc - counter, numeralSystem),
          valueDecimal: args?.nextPc - counter,
          argumentBitLength: bitLengths?.offsetBits,
          hiddenFromDetails: bitLengths?.offsetBits === 0,
        },
      ];
    case ArgumentType.ONE_REGISTER_ONE_EXTENDED_WIDTH_IMMEDIATE:
      return [
        {
          type: argType.REGISTER,
          value: args?.registerIndex,
          valueDecimal: args?.registerIndex,
          valueFormatted: `ω<sub>A=${args?.registerIndex}</sub>`,
          argumentBitLength: bitLengths?.registerIndexBits || 4,
        },
        {
          type: argType.EXTENDED_WIDTH_IMMEDIATE,
          value: valueToNumeralSystem(args?.immediateDecoder.getValue(), numeralSystem),
          valueDecimal: args?.immediateDecoder.getValue()?.toString(),
          argumentBitLength: bitLengths?.immediateDecoderBits,
          hiddenFromDetails: bitLengths?.immediateDecoderBits === 0,
        },
      ];
    case ArgumentType.TWO_REGISTERS:
      return [
        {
          type: argType.REGISTER,
          value: args?.firstRegisterIndex,
          valueDecimal: args?.firstRegisterIndex,
          valueFormatted: `ω<sub>A=${args?.firstRegisterIndex}</sub>`,
          argumentBitLength: bitLengths?.firstRegisterIndexBits || 4,
        },
        {
          type: argType.REGISTER,
          value: args?.secondRegisterIndex,
          valueDecimal: args?.secondRegisterIndex,
          valueFormatted: `ω<sub>D=${args?.secondRegisterIndex}</sub>`,
          argumentBitLength: bitLengths?.secondRegisterIndexBits || 4,
        },
      ];
    case ArgumentType.TWO_REGISTERS_ONE_IMMEDIATE:
      return [
        {
          type: argType.REGISTER,
          value: args?.firstRegisterIndex,
          valueDecimal: args?.firstRegisterIndex,
          valueFormatted: `ω<sub>A=${args?.firstRegisterIndex}</sub>`,
          argumentBitLength: bitLengths?.firstRegisterIndexBits || 4,
        },
        {
          type: argType.REGISTER,
          value: args?.secondRegisterIndex,
          valueDecimal: args?.secondRegisterIndex,
          valueFormatted: `ω<sub>B=${args?.secondRegisterIndex}</sub>`,
          argumentBitLength: bitLengths?.secondRegisterIndexBits || 4,
        },
        {
          type: argType.IMMEDIATE,
          value: valueToNumeralSystem(args?.immediateDecoder.getI64(), numeralSystem),
          valueDecimal: args?.immediateDecoder.getI64()?.toString(),
          argumentBitLength: bitLengths?.immediateDecoderBits,
          hiddenFromDetails: bitLengths?.immediateDecoderBits === 0,
        },
      ];
    case ArgumentType.TWO_REGISTERS_ONE_OFFSET:
      return [
        {
          type: argType.REGISTER,
          value: args?.firstRegisterIndex,
          valueDecimal: args?.firstRegisterIndex,
          valueFormatted: `ω<sub>A=${args?.firstRegisterIndex}</sub>`,
          argumentBitLength: bitLengths?.firstRegisterIndexBits || 4,
        },
        {
          type: argType.REGISTER,
          value: args?.secondRegisterIndex,
          valueDecimal: args?.secondRegisterIndex,
          valueFormatted: `ω<sub>B=${args?.secondRegisterIndex}</sub>`,
          argumentBitLength: bitLengths?.secondRegisterIndexBits || 4,
        },
        {
          type: argType.OFFSET,
          value: valueToNumeralSystem(args?.nextPc - counter, numeralSystem),
          valueDecimal: args?.nextPc - counter,
          argumentBitLength: bitLengths?.offsetBits,
          hiddenFromDetails: bitLengths?.offsetBits === 0,
        },
      ];
    case ArgumentType.TWO_REGISTERS_TWO_IMMEDIATES:
      return [
        {
          type: argType.REGISTER,
          value: args?.firstRegisterIndex,
          valueDecimal: args?.firstRegisterIndex,
          valueFormatted: `ω<sub>A=${args?.firstRegisterIndex}</sub>`,
          argumentBitLength: bitLengths?.firstRegisterIndexBits || 4,
        },
        {
          type: argType.REGISTER,
          value: args?.secondRegisterIndex,
          valueDecimal: args?.secondRegisterIndex,
          valueFormatted: `ω<sub>B=${args?.secondRegisterIndex}</sub>`,
          argumentBitLength: bitLengths?.secondRegisterIndexBits || 4,
        },
        {
          type: argType.IMMEDIATE_LENGTH,
          value: valueToNumeralSystem(bitLengths?.firstImmediateLength, numeralSystem),
          valueDecimal: bitLengths?.firstImmediateLength,
          argumentBitLength: bitLengths?.firstImmediateLengthBits,
          hidden: true,
        },
        {
          type: argType.IMMEDIATE,
          value: valueToNumeralSystem(args?.firstImmediateDecoder.getI64(), numeralSystem),
          valueDecimal: args?.firstImmediateDecoder.getI64()?.toString(),
          argumentBitLength: bitLengths?.firstImmediateDecoderBits,
          hiddenFromDetails: bitLengths?.firstImmediateDecoderBits === 0,
        },
        {
          type: argType.IMMEDIATE,
          value: valueToNumeralSystem(args?.secondImmediateDecoder.getI64(), numeralSystem),
          valueDecimal: args?.secondImmediateDecoder.getI64()?.toString(),
          argumentBitLength: bitLengths?.secondImmediateDecoderBits,
          hiddenFromDetails: bitLengths?.secondImmediateDecoderBits === 0,
        },
      ];
    case ArgumentType.THREE_REGISTERS:
      return [
        {
          type: argType.REGISTER,
          value: args?.firstRegisterIndex,
          valueDecimal: args?.firstRegisterIndex,
          valueFormatted: `ω<sub>A=${args?.firstRegisterIndex}</sub>`,
          argumentBitLength: bitLengths?.firstRegisterIndexBits || 4,
        },
        {
          type: argType.REGISTER,
          value: args?.secondRegisterIndex,
          valueDecimal: args?.secondRegisterIndex,
          valueFormatted: `ω<sub>B=${args?.secondRegisterIndex}</sub>`,
          argumentBitLength: bitLengths?.secondRegisterIndexBits || 4,
        },
        {
          type: argType.REGISTER,
          value: args?.thirdRegisterIndex,
          valueDecimal: args?.thirdRegisterIndex,
          valueFormatted: `ω<sub>D=${args?.thirdRegisterIndex}</sub>`,
          argumentBitLength: bitLengths?.thirdRegisterIndexBits || 4,
        },
      ];
    default:
      return null;
  }
};

export const getASMInstructionValueHtml = (
  args: Args,
  numeralSystem: number,
  counter: number,
  argsDecoder: ArgsDecoder,
) =>
  mapInstructionsArgsByType(args, numeralSystem, counter, argsDecoder)
    ?.filter((instruction) => !instruction.hidden)
    ?.map((instruction) => instruction.valueFormatted ?? instruction.value)
    .join(", ") ?? "";
