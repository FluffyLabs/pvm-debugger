import { Args, InitialState, Pvm as InternalPvm, Status } from "@/types/pvm";
// The only files we need from PVM repo:
import { ProgramDecoder } from "../../packages/pvm/pvm/program-decoder/program-decoder";
import { ArgsDecoder } from "../../packages/pvm/pvm/args-decoder/args-decoder";
import { byteToOpCodeMap } from "../../packages/pvm/pvm/assemblify";
import { Pvm as InternalPvmInstance, MemoryBuilder as InternalPvmMemoryBuilder } from "@typeberry/pvm";
export const initPvm = (program: number[], initialState: InitialState) => {
  const initialMemory = initialState.memory ?? [];
  const pageMap = initialState.pageMap ?? [];

  const memoryBuilder = new InternalPvmMemoryBuilder();
  for (const page of pageMap) {
    const startPageIndex = page.address;
    const endPageIndex = startPageIndex + page.length;
    const isWriteable = page["is-writable"];

    if (isWriteable) {
      memoryBuilder.setWriteable(startPageIndex, endPageIndex, new Uint8Array(page.length));
    } else {
      memoryBuilder.setReadable(startPageIndex, endPageIndex, new Uint8Array(page.length));
    }
  }

  for (const memoryChunk of initialMemory) {
    memoryBuilder.setData(memoryChunk.address, memoryChunk.contents);
  }

  const HEAP_START_PAGE = 4 * 2 ** 16;
  const HEAP_END_PAGE = 2 ** 32 - 2 * 2 ** 16 - 2 ** 24;

  const memory = memoryBuilder.finalize(HEAP_START_PAGE, HEAP_END_PAGE);
  const pvm = new InternalPvmInstance(new Uint8Array(program), {
    ...initialState,
    memory,
  });
  return pvm;
};

export const runAllInstructions = (pvm: InternalPvm, program: number[]) => {
  const programPreviewResult = [];

  do {
    const pc = pvm.getPC();
    const result = nextInstruction(pc, program);
    programPreviewResult.push(result);
  } while (pvm.nextStep() === Status.OK);

  return {
    programRunResult: {
      pc: pvm.getPC(),
      regs: Array.from(pvm.getRegisters()),
      gas: pvm.getGas(),
      pageMap: [],
      memory: [],
      status: pvm.getStatus(),
    },
    programPreviewResult,
  };
};

export const nextInstruction = (programCounter: number, program: number[]) => {
  const programDecoder = new ProgramDecoder(new Uint8Array(program));
  const code = programDecoder.getCode();
  const mask = programDecoder.getMask();
  const argsDecoder = new ArgsDecoder(code, mask);
  const currentInstruction = code[programCounter];

  let args;

  try {
    args = argsDecoder.getArgs(programCounter) as Args;

    const currentInstructionDebug = {
      instructionCode: currentInstruction,
      ...byteToOpCodeMap[currentInstruction],
      args: {
        ...args,
        immediate: "immediateDecoder" in args ? args.immediateDecoder?.getUnsigned() : undefined,
      },
    };
    return currentInstructionDebug;
  } catch (e) {
    // The last iteration goes here since there's no instruction to proces and we didn't check if there's a next operation
    return null;
  }
};
