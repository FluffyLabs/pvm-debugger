import { virtualTrapInstruction } from "@/utils/virtualTrapInstruction";
import { byteToOpCodeMap } from "./assemblify";
import {
  ProgramDecoder,
  ArgsDecoder,
  instructionArgumentTypeMap,
  createResults,
  ArgumentType,
  BasicBlocks,
} from "@typeberry/pvm-debugger-adapter";
import { Instruction } from "./instruction";
import { CurrentInstruction } from "@/types/pvm";

export function disassemblify(rawProgram: Uint8Array): CurrentInstruction[] {
  const programDecoder = new ProgramDecoder(rawProgram);
  const code = programDecoder.getCode();
  const mask = programDecoder.getMask();
  const blocks = new BasicBlocks();
  blocks.reset(code, mask);
  const argsDecoder = new ArgsDecoder();
  argsDecoder.reset(code, mask);
  let i = 0;
  const printableProgram = [];
  let address = 0;
  let currentBlockNumber = -1;

  while (i < code.length) {
    const currentInstruction = code[i];
    const isValidInstruction = Instruction[currentInstruction] !== undefined;
    const argumentType = isValidInstruction
      ? instructionArgumentTypeMap[currentInstruction]
      : ArgumentType.NO_ARGUMENTS;
    const args = createResults()[argumentType];
    const isBlockStart = blocks.isBeginningOfBasicBlock(i);
    const isBlockEnd = blocks.isBeginningOfBasicBlock(i + 1);

    try {
      argsDecoder.fillArgs(i, args);
      address = i;
      i += args.noOfBytesToSkip ?? 0;
    } catch (e) {
      printableProgram.push({
        instructionCode: currentInstruction,
        name: "Error",
        address,
        ...byteToOpCodeMap[currentInstruction],
        error: "Cannot get arguments from args decoder",
        block: {
          isStart: isBlockStart,
          isEnd: isBlockEnd,
          name: "block",
          number: currentBlockNumber,
        },
      });
      return printableProgram;
    }

    if (isBlockStart) {
      currentBlockNumber++;
    }

    const currentInstructionDebug = {
      instructionCode: currentInstruction,
      ...byteToOpCodeMap[currentInstruction],
      name: isValidInstruction ? Instruction[currentInstruction] : `INVALID(${currentInstruction})`,
      instructionBytes: code.slice(i - (args.noOfBytesToSkip ?? 0), i),
      address,
      args,
      block: {
        isStart: isBlockStart,
        isEnd: isBlockEnd,
        name: `block${currentBlockNumber}`,
        number: currentBlockNumber,
      },
    };

    printableProgram.push(currentInstructionDebug);
  }
  printableProgram.push({ ...virtualTrapInstruction, address: code.length });

  return printableProgram;
}
