import { InitialState } from "@/types/pvm";
import * as pvm from "@typeberry/lib/pvm-interpreter";

const { tryAsMemoryIndex, tryAsSbrkIndex, MemoryBuilder: InternalPvmMemoryBuilder, Registers } = pvm;

export const initPvm = async (pvm: pvm.DebuggerAdapter, program: Uint8Array, initialState: InitialState) => {
  const initialMemory = initialState.memory ?? [];
  const pageMap = initialState.pageMap ?? [];
  const regs = initialState.regs ?? Array.from<bigint>({ length: 13 }).fill(0n);

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

  const tryFinalize = (heapStartIndex: number, heapEndIndex: number) => {
    try {
      return memoryBuilder.finalize(tryAsMemoryIndex(heapStartIndex), tryAsSbrkIndex(heapEndIndex));
    } catch {
      return null;
    }
  };
  // const SPI_HEAP_START = 302117864; // heap start when max input data
  const SPI_HEAP_START = 139264; // tmp

  // const SPI_HEAP_END = 4261281792; // heap end when max stack
  const SPI_HEAP_END = 4278050816; // tmp
  const maybeMemory = tryFinalize(SPI_HEAP_START, SPI_HEAP_END);

  const pageSize = 2 ** 12;
  const maxAddressFromPageMap = Math.max(...pageMap.map((page) => page.address + page.length));
  const hasMemoryLayout = maxAddressFromPageMap >= 0;
  const heapStartIndex = tryAsMemoryIndex(hasMemoryLayout ? maxAddressFromPageMap + pageSize : 0);
  const heapEndIndex = tryAsSbrkIndex(2 ** 32 - 2 * 2 ** 16 - 2 ** 24);
  const memory = maybeMemory ?? memoryBuilder.finalize(heapStartIndex, heapEndIndex);
  const registers = new Registers();
  registers.copyFrom(new BigUint64Array(regs));
  pvm.reset(new Uint8Array(program), initialState.pc ?? 0, initialState.gas ?? 10_000n, registers, memory);
};
