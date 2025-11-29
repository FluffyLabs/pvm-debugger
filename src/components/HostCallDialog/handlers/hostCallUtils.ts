import { pvm, utils } from "@typeberry/lib";

type IMemory = pvm.IMemory;
type IGasCounter = pvm.IGasCounter;
type Gas = pvm.Gas;
type U32 = number;

const { Result } = utils;

// OK symbol for Result types
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const OK = Symbol("OK") as any;

// Mock memory implementation that tracks writes
export class MockMemory implements IMemory {
  private data = new Map<number, Uint8Array>();
  public writes: Array<{ address: number; data: Uint8Array }> = [];

  store(address: U32, bytes: Uint8Array) {
    this.data.set(address, new Uint8Array(bytes));
    this.writes.push({ address, data: new Uint8Array(bytes) });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return Result.ok(OK) as any;
  }

  read(address: U32, result: Uint8Array) {
    const stored = this.data.get(address);
    if (stored) {
      result.set(stored.slice(0, result.length));
    }
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
