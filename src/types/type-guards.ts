import { pvm_interpreter as pvm } from "@typeberry/lib";
import { CurrentInstruction } from "./pvm";

export function isInstructionError(
  instruction: CurrentInstruction,
): instruction is Extract<CurrentInstruction, { error: string }> {
  return "error" in instruction;
}

export function isOneImmediateArgs(
  args: pvm.args.Args,
): args is Extract<pvm.args.Args, { type: typeof pvm.args.ArgumentType.ONE_IMMEDIATE }> {
  return args.type === pvm.args.ArgumentType.ONE_IMMEDIATE;
}
