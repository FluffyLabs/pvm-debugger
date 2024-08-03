import { ArgumentType } from "@/pvm-packages/pvm/args-decoder/argument-type.ts";

export const mapInstructionsArgsByType = (args: any) => {
  switch (args?.type) {
    case ArgumentType.NO_ARGUMENTS:
      return "";
    case ArgumentType.ONE_IMMEDIATE:
      return <span>${args?.immediate}</span>;
    case ArgumentType.TWO_IMMEDIATE:
      // return `imm1: ${args?.immediate1}, imm2: ${args?.immediate2}`;
      return (
        <span>
          {args?.immediate1}, {args?.immediate2}
        </span>
      );
    case ArgumentType.ONE_OFFSET:
      return <span>{args?.offset}</span>;
    case ArgumentType.ONE_REGISTER_ONE_IMMEDIATE:
      return (
        <span>
          ω<sub>{args?.firstRegisterIndex}</sub>, {args?.immediate}
        </span>
      );
    case ArgumentType.ONE_REGISTER_TWO_IMMEDIATE:
      return (
        <span>
          ω<sub>{args?.firstRegisterIndex}</sub>, {args?.immediate1}, {args?.immediate2}
        </span>
      );
    case ArgumentType.ONE_REGISTER_ONE_IMMEDIATE_ONE_OFFSET:
      return (
        <span>
          ω<sub>{args?.firstRegisterIndex}</sub>, {args?.immediate}, {args?.offset}
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
          ω<sub>{args?.firstRegisterIndex}</sub>, ω<sub>{args?.secondRegisterIndex}</sub>, {args?.immediate}
        </span>
      );
    case ArgumentType.TWO_REGISTERS_ONE_OFFSET:
      return (
        <span>
          ω<sub>{args?.firstRegisterIndex}</sub>, ω<sub>{args?.secondRegisterIndex}</sub>, {args?.offset}
        </span>
      );
    case ArgumentType.TWO_REGISTERS_TWO_IMMEDIATE:
      return (
        <span>
          ω<sub>{args?.firstRegisterIndex}</sub>, ω<sub>{args?.secondRegisterIndex}</sub>, {args?.immediate1}, {args?.immediate2}
        </span>
      );
    case ArgumentType.THREE_REGISTERS:
      return (
        <span>
          ω<sub>{args?.firstRegisterIndex}</sub>, ω<sub>{args?.secondRegisterIndex}</sub>, ω<sub>{args?.thirdRegisterIndex}</sub>
        </span>
      );

    default:
      return "err";
  }
};
