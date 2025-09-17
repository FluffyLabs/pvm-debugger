import { pvm } from "@typeberry/lib";
import { CurrentInstruction } from "./pvm";

export function isInstructionError(
  instruction: CurrentInstruction,
): instruction is Extract<CurrentInstruction, { error: string }> {
  return "error" in instruction;
}

export function isOneImmediateArgs(
  args: pvm.Args,
): args is Extract<pvm.Args, { type: typeof pvm.ArgumentType.ONE_IMMEDIATE }> {
  return args.type === pvm.ArgumentType.ONE_IMMEDIATE;
}
