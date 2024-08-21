import { NumeralSystem } from "@/context/NumeralSystem.tsx";
import { ArgumentType } from "@/packages/pvm/pvm/args-decoder/argument-type";
import { Args } from "@/types/pvm";

export const valueToNumeralSystem = (
  value: number | undefined,
  numeralSystem: NumeralSystem,
  padStartVal?: number,
): string => {
  return numeralSystem === NumeralSystem.HEXADECIMAL
    ? `0x${((value ?? 0) >>> 0).toString(16).padStart(padStartVal || 0, "0")}`
    : (value ?? 0).toString().padStart(padStartVal || 0, "0");
};

export const mapInstructionsArgsByType = (args: Args | null, numeralSystem: NumeralSystem) => {
  switch (args?.type) {
    case ArgumentType.NO_ARGUMENTS:
      return "";
    case ArgumentType.ONE_IMMEDIATE:
      return <span>{valueToNumeralSystem(args?.immediate, numeralSystem)}</span>;
    case ArgumentType.TWO_IMMEDIATES:
      return (
        <span>
          {valueToNumeralSystem(args?.immediate1, numeralSystem)},{" "}
          {valueToNumeralSystem(args?.immediate2, numeralSystem)}
        </span>
      );
    case ArgumentType.ONE_OFFSET:
      return <span>{valueToNumeralSystem(args?.offset, numeralSystem)}</span>;
    case ArgumentType.ONE_REGISTER_ONE_IMMEDIATE:
      return (
        <span>
          ω<sub>{args?.firstRegisterIndex}</sub>, {valueToNumeralSystem(args?.immediate, numeralSystem)}
        </span>
      );
    case ArgumentType.ONE_REGISTER_TWO_IMMEDIATES:
      return (
        <span>
          ω<sub>{args?.firstRegisterIndex}</sub>, {valueToNumeralSystem(args?.immediate1, numeralSystem)},{" "}
          {valueToNumeralSystem(args?.immediate2, numeralSystem)}
        </span>
      );
    case ArgumentType.ONE_REGISTER_ONE_IMMEDIATE_ONE_OFFSET:
      return (
        <span>
          ω<sub>{args?.firstRegisterIndex}</sub>, {valueToNumeralSystem(args?.immediate, numeralSystem)},{" "}
          {valueToNumeralSystem(args?.offset, numeralSystem)}
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
          {valueToNumeralSystem(args?.immediate, numeralSystem)}
        </span>
      );
    case ArgumentType.TWO_REGISTERS_ONE_OFFSET:
      return (
        <span>
          ω<sub>{args?.firstRegisterIndex}</sub>, ω<sub>{args?.secondRegisterIndex}</sub>,{" "}
          {valueToNumeralSystem(args?.offset, numeralSystem)}
        </span>
      );
    case ArgumentType.TWO_REGISTERS_TWO_IMMEDIATES:
      return (
        <span>
          ω<sub>{args?.firstRegisterIndex}</sub>, ω<sub>{args?.secondRegisterIndex}</sub>,{" "}
          {valueToNumeralSystem(args?.immediate1, numeralSystem)},{" "}
          {valueToNumeralSystem(args?.immediate2, numeralSystem)}
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
