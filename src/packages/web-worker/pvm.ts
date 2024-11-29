import { InitialState, Pvm as InternalPvm, Status } from "@/types/pvm";
import { createResults, instructionArgumentTypeMap, ProgramDecoder } from "@typeberry/pvm-debugger-adapter";
import { ArgsDecoder, Registers } from "@typeberry/pvm-debugger-adapter";
import { byteToOpCodeMap } from "../../packages/pvm/pvm/assemblify";
import { Pvm as InternalPvmInstance, MemoryBuilder as InternalPvmMemoryBuilder } from "@typeberry/pvm-debugger-adapter";
export const initPvm = (pvm: InternalPvmInstance, program: Uint8Array, initialState: InitialState) => {
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
    memoryBuilder.setData(memoryChunk.address, new Uint8Array(memoryChunk.contents));
  }

  //const HEAP_START_PAGE = 4 * 2 ** 16;
  const HEAP_END_PAGE = 2 ** 32 - 2 * 2 ** 16 - 2 ** 24;

  // TODO [ToDr] [#216] Since we don't have examples yet of the
  // PVM program allocating more memory, we disallow expanding
  // the memory completely by setting `sbrkIndex` to the same value
  // as the end page.
  const memory = memoryBuilder.finalize(HEAP_END_PAGE, HEAP_END_PAGE);

  const registers = new Registers();
  registers.copyFrom(new Uint32Array(initialState.regs!));
  pvm.reset(new Uint8Array(program), initialState.pc ?? 0, initialState.gas ?? 0n, registers, memory);
};

export const runAllInstructions = (pvm: InternalPvm, program: Uint8Array) => {
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

export const nextInstruction = (programCounter: number, program: Uint8Array) => {
  const programDecoder = new ProgramDecoder(new Uint8Array(program));
  const code = programDecoder.getCode();
  const mask = programDecoder.getMask();
  const argsDecoder = new ArgsDecoder();
  argsDecoder.reset(code, mask);
  const currentInstruction = code[programCounter];
  const argumentType = instructionArgumentTypeMap[currentInstruction];
  const args = createResults()[argumentType];

  try {
    argsDecoder.fillArgs(programCounter, args);

    const currentInstructionDebug = {
      instructionCode: currentInstruction,
      ...byteToOpCodeMap[currentInstruction],
      args,
    };
    return currentInstructionDebug;
  } catch (e) {
    // The last iteration goes here since there's no instruction to proces and we didn't check if there's a next operation
    return null;
  }
};
