import { NumeralSystem } from "@/context/NumeralSystem.tsx";
import { ArgumentType, Args } from "@typeberry/pvm-debugger-adapter";

export const valueToNumeralSystem = (
  value: number | bigint | undefined,
  numeralSystem: NumeralSystem,
  padStartVal?: number,
): string => {
  const stringValue =
    typeof value === "bigint" ? BigInt.asUintN(32, value).toString(16) : ((value ?? 0) >>> 0).toString(16);

  return numeralSystem === NumeralSystem.HEXADECIMAL
    ? `0x${stringValue.padStart(padStartVal || 0, "0")}`
    : (value ?? 0).toString().padStart(padStartVal || 0, "0");
};

export const mapInstructionsArgsByType = (args: Args | null, numeralSystem: NumeralSystem, counter: number) => {
  switch (args?.type) {
    case ArgumentType.NO_ARGUMENTS:
      return "";
    case ArgumentType.ONE_IMMEDIATE:
      return <span>{valueToNumeralSystem(args.immediateDecoder.getUnsigned(), numeralSystem)}</span>;
    case ArgumentType.TWO_IMMEDIATES:
      return (
        <span>
          {valueToNumeralSystem(args?.firstImmediateDecoder.getUnsigned(), numeralSystem)},{" "}
          {valueToNumeralSystem(args?.secondImmediateDecoder.getUnsigned(), numeralSystem)}
        </span>
      );
    case ArgumentType.ONE_OFFSET:
      return <span>{valueToNumeralSystem(args?.nextPc - counter, numeralSystem)}</span>;
    case ArgumentType.ONE_REGISTER_ONE_IMMEDIATE:
      return (
        <span>
          ω<sub>{args?.registerIndex}</sub>, {valueToNumeralSystem(args.immediateDecoder.getUnsigned(), numeralSystem)}
        </span>
      );
    case ArgumentType.ONE_REGISTER_TWO_IMMEDIATES:
      return (
        <span>
          ω<sub>{args?.registerIndex}</sub>,{" "}
          {valueToNumeralSystem(args?.firstImmediateDecoder.getUnsigned(), numeralSystem)},{" "}
          {valueToNumeralSystem(args?.secondImmediateDecoder.getUnsigned(), numeralSystem)}
        </span>
      );
    case ArgumentType.ONE_REGISTER_ONE_IMMEDIATE_ONE_OFFSET:
      return (
        <span>
          ω<sub>{args?.registerIndex}</sub>, {valueToNumeralSystem(args?.immediateDecoder.getUnsigned(), numeralSystem)}
          , {valueToNumeralSystem(args?.nextPc - counter, numeralSystem)}
        </span>
      );
    case ArgumentType.TWO_REGISTERS:
      return (
        <span>
          ω<sub>{args?.firstRegisterIndex}</sub>, ω<sub>{args?.secondRegisterIndex}</sub>
        </span>
      );
    case ArgumentType.TWO_REGISTERS_ONE_IMMEDIATE:
      return (
        <span>
          ω<sub>{args?.firstRegisterIndex}</sub>, ω<sub>{args?.secondRegisterIndex}</sub>,{" "}
          {valueToNumeralSystem(args?.immediateDecoder.getUnsigned(), numeralSystem)}
        </span>
      );
    case ArgumentType.TWO_REGISTERS_ONE_OFFSET:
      return (
        <span>
          ω<sub>{args?.firstRegisterIndex}</sub>, ω<sub>{args?.secondRegisterIndex}</sub>,{" "}
          {valueToNumeralSystem(args?.nextPc - counter, numeralSystem)}
        </span>
      );
    case ArgumentType.TWO_REGISTERS_TWO_IMMEDIATES:
      return (
        <span>
          ω<sub>{args?.firstRegisterIndex}</sub>, ω<sub>{args?.secondRegisterIndex}</sub>,{" "}
          {valueToNumeralSystem(args?.firstImmediateDecoder.getUnsigned(), numeralSystem)},{" "}
          {valueToNumeralSystem(args?.secondImmediateDecoder.getUnsigned(), numeralSystem)}
        </span>
      );
    case ArgumentType.THREE_REGISTERS:
      return (
        <span>
          ω<sub>{args?.firstRegisterIndex}</sub>, ω<sub>{args?.secondRegisterIndex}</sub>, ω
          <sub>{args?.thirdRegisterIndex}</sub>
        </span>
      );

    default:
      return "err";
  }
};
