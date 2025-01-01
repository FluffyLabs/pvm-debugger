import { Args, ArgumentType } from "@typeberry/pvm-debugger-adapter";
import { CurrentInstruction } from "./pvm";

export function isInstructionError(
  instruction: CurrentInstruction,
): instruction is Extract<CurrentInstruction, { error: string }> {
  return "error" in instruction;
}

export function isOneImmediateArgs(args: Args): args is Extract<Args, { type: ArgumentType.ONE_IMMEDIATE }> {
  return args.type === ArgumentType.ONE_IMMEDIATE;
}
