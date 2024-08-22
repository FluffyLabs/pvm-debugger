import { virtualTrapInstruction } from "@/utils/virtualTrapInstruction";
import { ArgsDecoder } from "./args-decoder/args-decoder";
import { byteToOpCodeMap } from "./assemblify";
import { ProgramDecoder } from "./program-decoder/program-decoder";
import { Instruction } from "./instruction";

export function disassemblify(rawProgram: Uint8Array) {
  const programDecoder = new ProgramDecoder(rawProgram);
  const code = programDecoder.getCode();
  const mask = programDecoder.getMask();
  const argsDecoder = new ArgsDecoder(code, mask);
  let i = 0;
  const printableProgram = [];
  let address = 0;

  while (i < code.length) {
    const currentInstruction = code[i];
    let args;

    try {
      args = argsDecoder.getArgs(i);
      address = i;
      i += args.noOfBytesToSkip ?? 0;
    } catch (e) {
      printableProgram.push({
        instructionCode: currentInstruction,
        name: "Error",
        address,
        ...byteToOpCodeMap[currentInstruction],
        error: "Cannot get arguments from args decoder",
      });
      return printableProgram;
    }

    const currentInstructionDebug = {
      instructionCode: currentInstruction,
      ...byteToOpCodeMap[currentInstruction],
      name: Instruction[currentInstruction],
      instructionBytes: code.slice(i - (args.noOfBytesToSkip ?? 0), i),
      address,
      // TODO remove object casting when PVM changed
      args: JSON.parse(JSON.stringify(args)),
    };

    printableProgram.push(currentInstructionDebug);
  }
  printableProgram.push({ ...virtualTrapInstruction, address: code.length });

  return printableProgram;
}
