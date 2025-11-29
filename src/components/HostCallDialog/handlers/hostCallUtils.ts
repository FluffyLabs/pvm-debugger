import { pvm, utils } from "@typeberry/lib";

type IMemory = pvm.IMemory;
type IGasCounter = pvm.IGasCounter;
type Gas = pvm.Gas;
type U32 = number;

const { Result } = utils;

// OK symbol for Result types
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const OK = Symbol("OK") as any;

// Mock memory implementation that tracks writes and can be pre-populated
export class MockMemory implements IMemory {
  // Store memory as contiguous regions for proper partial reads
  private regions: Array<{ start: number; data: Uint8Array }> = [];
  public writes: Array<{ address: number; data: Uint8Array }> = [];

  /**
   * Pre-populate memory with data from actual PVM memory.
   * Call this before executing host calls that need to read from memory.
   */
  preload(address: number, data: Uint8Array) {
    this.regions.push({ start: address, data: new Uint8Array(data) });
  }

  store(address: U32, bytes: Uint8Array) {
    // Store as a new region (overwrites are handled by read order)
    this.regions.push({ start: address, data: new Uint8Array(bytes) });
    this.writes.push({ address, data: new Uint8Array(bytes) });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return Result.ok(OK) as any;
  }

  read(address: U32, result: Uint8Array) {
    const length = result.length;
    // Search regions in reverse order (latest writes take precedence)
    for (let i = this.regions.length - 1; i >= 0; i--) {
      const region = this.regions[i];
      const regionEnd = region.start + region.data.length;
      const requestEnd = address + length;

      // Check if this region contains the requested range
      if (address >= region.start && requestEnd <= regionEnd) {
        const offset = address - region.start;
        result.set(region.data.slice(offset, offset + length));
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return Result.ok(OK) as any;
      }
    }
    // If not found, return zeros (result is already zeroed by caller typically)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return Result.ok(OK) as any;
  }
}

// Mock gas counter
export class MockGasCounter implements IGasCounter {
  initialGas: Gas;
  private gasValue: bigint;

  constructor(gas: bigint) {
    this.initialGas = gas as Gas;
    this.gasValue = gas;
  }

  get(): Gas {
    return this.gasValue as Gas;
  }

  set(g: Gas): void {
    this.gasValue = BigInt(g);
  }

  sub(g: Gas): boolean {
    const amount = BigInt(g);
    if (this.gasValue < amount) {
      this.gasValue = 0n;
      return true;
    }
    this.gasValue -= amount;
    return false;
  }

  used(): Gas {
    return (BigInt(this.initialGas) - this.gasValue) as Gas;
  }
}

// Helper to convert bigint array to register bytes
export function regsToBytes(regs: bigint[]): Uint8Array {
  const bytes = new Uint8Array(13 * 8);
  const view = new DataView(bytes.buffer);
  for (let i = 0; i < 13; i++) {
    view.setBigUint64(i * 8, regs[i] ?? 0n, true); // little-endian
  }
  return bytes;
}

// Helper to convert register bytes to bigint array
export function bytesToRegs(bytes: Uint8Array): bigint[] {
  const regs: bigint[] = [];
  const view = new DataView(bytes.buffer);
  for (let i = 0; i < 13; i++) {
    regs.push(view.getBigUint64(i * 8, true)); // little-endian
  }
  return regs;
}

// Helper to convert hex string to Uint8Array
export function hexToBytes(hex: string): Uint8Array {
  const clean = hex.replace(/^0x/i, "").replace(/\s/g, "");
  if (clean.length % 2 !== 0) {
    throw new Error("Invalid hex string length");
  }
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < clean.length; i += 2) {
    bytes[i / 2] = parseInt(clean.slice(i, i + 2), 16);
  }
  return bytes;
}

// Helper to convert Uint8Array to hex string
export function bytesToHex(bytes: Uint8Array): string {
  return "0x" + Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}
