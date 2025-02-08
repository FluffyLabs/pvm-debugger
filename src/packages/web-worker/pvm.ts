import { InitialState, Pvm as InternalPvm, Status } from "@/types/pvm";
import {
  createResults,
  instructionArgumentTypeMap,
  ProgramDecoder,
  tryAsMemoryIndex,
  tryAsSbrkIndex,
} from "@typeberry/pvm-debugger-adapter";
import { ArgsDecoder, Registers } from "@typeberry/pvm-debugger-adapter";
import { byteToOpCodeMap } from "../../packages/pvm/pvm/assemblify";
import { Pvm as InternalPvmInstance, MemoryBuilder as InternalPvmMemoryBuilder } from "@typeberry/pvm-debugger-adapter";
export const initPvm = (pvm: InternalPvmInstance, program: Uint8Array, initialState: InitialState) => {
  const initialMemory = initialState.memory ?? [];
  const pageMap = initialState.pageMap ?? [];

  const memoryBuilder = new InternalPvmMemoryBuilder();
  for (const page of pageMap) {
    const startPageIndex = tryAsMemoryIndex(page.address);
    const endPageIndex = tryAsMemoryIndex(startPageIndex + page.length);
    const isWriteable = page["is-writable"];

    if (isWriteable) {
      memoryBuilder.setWriteablePages(startPageIndex, endPageIndex, new Uint8Array(page.length));
    } else {
      memoryBuilder.setReadablePages(startPageIndex, endPageIndex, new Uint8Array(page.length));
    }
  }

  for (const memoryChunk of initialMemory) {
    const idx = tryAsMemoryIndex(memoryChunk.address);
    memoryBuilder.setData(idx, new Uint8Array(memoryChunk.contents));
  }

  const pageSize = 2 ** 12;
  const maxAddressFromPageMap = Math.max(...pageMap.map((page) => page.address + page.length));
  const hasMemoryLayout = maxAddressFromPageMap >= 0;
  const heapStartIndex = tryAsSbrkIndex(hasMemoryLayout ? maxAddressFromPageMap + pageSize : 0);
  const heapEndIndex = tryAsSbrkIndex(2 ** 32 - 2 * 2 ** 16 - 2 ** 24);

  const memory = memoryBuilder.finalize(heapStartIndex, heapEndIndex);

  const registers = new Registers();
  registers.copyFrom(new BigUint64Array(initialState.regs!.map((x) => BigInt(x))));
  pvm.reset(new Uint8Array(program), initialState.pc ?? 0, initialState.gas ?? 0n, registers, memory);
};

export const runAllInstructions = (pvm: InternalPvm, program: Uint8Array) => {
  const programPreviewResult = [];

  do {
    const pc = pvm.getProgramCounter();
    const result = nextInstruction(pc, program);
    programPreviewResult.push(result);
  } while (pvm.nextStep());

  return {
    programRunResult: {
      pc: pvm.getProgramCounter(),
      regs: Array.from(pvm.getRegisters()),
      gas: pvm.getGasLeft(),
      pageMap: [],
      memory: [],
      status: pvm.getStatus() as Status,
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
