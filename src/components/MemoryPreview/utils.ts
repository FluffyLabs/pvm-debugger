import { NumeralSystem } from "@/context/NumeralSystem";
import { WorkerState } from "@/store/workers/workersSlice";
import { valueToNumeralSystem } from "../Instructions/utils";
import { block } from "@typeberry/pvm-debugger-adapter";

const codec = block.codec;

export type FindMemoryForWorkerType = (
  worker: WorkerState,
  address: number,
) =>
  | {
      address: number;
      bytes: number[];
    }
  | undefined;

export const findMemoryForWorker: FindMemoryForWorkerType = (worker, address) =>
  worker.memory?.data?.find((mem) => mem.address === address);

export const addressFormatter = (address: number, numeralSystem: NumeralSystem) => {
  const addressDisplay = valueToNumeralSystem(address, numeralSystem, numeralSystem ? 2 : 3, false)
    .toString()
    .padStart(6, "0");

  return numeralSystem ? `0x${addressDisplay}` : addressDisplay;
};

// For decoding i8, i16, i24, i32, i64, u16, u24, u32, u64
function decodeI8At(slice: Uint8Array, offset: number): number | null {
  if (offset + 1 > slice.length) return null;
  const dec = codec.Decoder.fromBlob(slice);
  dec.resetTo(offset);
  return dec.i8();
}
function decodeI16At(slice: Uint8Array, offset: number): number | null {
  if (offset + 2 > slice.length) return null;
  const dec = codec.Decoder.fromBlob(slice);
  dec.resetTo(offset);
  return dec.i16();
}
function decodeI24At(slice: Uint8Array, offset: number): number | null {
  if (offset + 3 > slice.length) return null;
  const dec = codec.Decoder.fromBlob(slice);
  dec.resetTo(offset);
  return dec.i24();
}
function decodeI32At(slice: Uint8Array, offset: number): number | null {
  if (offset + 4 > slice.length) return null;
  const dec = codec.Decoder.fromBlob(slice);
  dec.resetTo(offset);
  return dec.i32();
}
function decodeI64At(slice: Uint8Array, offset: number): bigint | null {
  if (offset + 8 > slice.length) return null;
  const dec = codec.Decoder.fromBlob(slice);
  dec.resetTo(offset);
  return dec.i64();
}
function decodeU16At(slice: Uint8Array, offset: number): number | null {
  if (offset + 2 > slice.length) return null;
  const dec = codec.Decoder.fromBlob(slice);
  dec.resetTo(offset);
  return dec.u16();
}
function decodeU24At(slice: Uint8Array, offset: number): number | null {
  if (offset + 3 > slice.length) return null;
  const dec = codec.Decoder.fromBlob(slice);
  dec.resetTo(offset);
  return dec.u24();
}
function decodeU32At(slice: Uint8Array, offset: number): number | null {
  if (offset + 4 > slice.length) return null;
  const dec = codec.Decoder.fromBlob(slice);
  dec.resetTo(offset);
  return dec.u32();
}
function decodeU64At(slice: Uint8Array, offset: number): bigint | null {
  if (offset + 8 > slice.length) return null;
  const dec = codec.Decoder.fromBlob(slice);
  dec.resetTo(offset);
  return dec.u64();
}

export const getMemoryInterpretations = (bytes: Uint8Array, numeralSystem: NumeralSystem) => {
  if (bytes.length === 0) {
    return null;
  }

  if (bytes.length > 32) {
    return ["Max memory for interpretations is 32 bytes"];
  }

  function fmt(value: number | bigint): string {
    return valueToNumeralSystem(value, numeralSystem, numeralSystem === NumeralSystem.HEXADECIMAL ? 2 : 3);
  }

  function decodeArray(
    label: string,
    itemSize: number,
    maxItems: number,
    decodeFn: (s: Uint8Array, offset: number) => number | bigint | null,
  ): string | null {
    const arr: string[] = [];
    for (let i = 0; i < maxItems; i++) {
      const offset = i * itemSize;
      const val = decodeFn(bytes, offset);
      if (val === null) break;
      arr.push(fmt(val));
    }
    if (arr.length === 0) {
      return null;
    }
    return `${label}: ${arr.join(" ")}`;
  }

  const lines: Array<string> = [];

  // i8 => up to 32 items
  const i8Line = decodeArray("i8 ", 1, 32, decodeI8At);
  if (i8Line) lines.push(i8Line);

  // i16 => up to 16
  const i16Line = decodeArray("i16", 2, 16, decodeI16At);
  if (i16Line) lines.push(i16Line);

  // u16 => up to 16
  const u16Line = decodeArray("u16", 2, 16, decodeU16At);
  if (u16Line) lines.push(u16Line);

  // i24 => up to 10
  const i24Line = decodeArray("i24", 3, 10, decodeI24At);
  if (i24Line) lines.push(i24Line);

  // u24 => up to 10
  const u24Line = decodeArray("u24", 3, 10, decodeU24At);
  if (u24Line) lines.push(u24Line);

  // i32 => up to 8
  const i32Line = decodeArray("i32", 4, 8, decodeI32At);
  if (i32Line) lines.push(i32Line);

  // u32 => up to 8
  const u32Line = decodeArray("u32", 4, 8, decodeU32At);
  if (u32Line) lines.push(u32Line);

  // i64 => up to 4
  const i64Line = decodeArray("i64", 8, 4, decodeI64At);
  if (i64Line) lines.push(i64Line);

  // u64 => up to 4
  const u64Line = decodeArray("u64", 8, 4, decodeU64At);
  if (u64Line) lines.push(u64Line);

  return lines.length > 0 ? lines : null;
};
