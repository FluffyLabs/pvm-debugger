import { Args, InitialState, Pvm, Status } from "@/types/pvm";
// The only files we need from PVM repo:
import { ProgramDecoder } from "../../packages/pvm/pvm/program-decoder/program-decoder";
import { ArgsDecoder } from "../../packages/pvm/pvm/args-decoder/args-decoder";
import { byteToOpCodeMap } from "../../packages/pvm/pvm/assemblify";
import { Pvm as PvmInstance } from "@typeberry/pvm";

export const initPvm = (program: number[], initialState: InitialState) => {
  const pvm = new PvmInstance(new Uint8Array(program), initialState);

  return pvm;
};

export const runAllInstructions = (pvm: Pvm, program: number[]) => {
  const programPreviewResult = [];

  do {
    const result = nextInstruction(pvm, program);
    programPreviewResult.push(result);
  } while (pvm.nextStep() === Status.OK);

  return {
    programRunResult: {
      pc: pvm.getPC(),
      regs: Array.from(pvm.getRegisters()),
      gas: pvm.getGas(),
      pageMap: pvm.getMemory(),
      memory: pvm.getMemory(),
      status: pvm.getStatus(),
    },
    programPreviewResult,
  };
};

export const nextInstruction = (pvm: Pvm, program: number[]) => {
  const programDecoder = new ProgramDecoder(new Uint8Array(program));
  const code = programDecoder.getCode();
  const mask = programDecoder.getMask();
  const argsDecoder = new ArgsDecoder(code, mask);
  const currentInstruction = code[pvm.getPC()];

  let args;

  try {
    args = argsDecoder.getArgs(pvm.getPC()) as Args;

    const currentInstructionDebug = {
      instructionCode: currentInstruction,
      ...byteToOpCodeMap[currentInstruction],
      args: {
        ...args,
        immediate: args.immediateDecoder?.getUnsigned(),
      },
    };
    return currentInstructionDebug;
  } catch (e) {
    // The last iteration goes here since there's no instruction to proces and we didn't check if there's a next operation
    return null;
  }
};
