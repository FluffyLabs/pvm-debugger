import { NumeralSystem } from "@/context/NumeralSystem";
import { WorkerState } from "@/store/workers/workersSlice";
import { valueToNumeralSystem } from "../Instructions/utils";
import { codec } from "@typeberry/block";

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

export const getMemoryInterpretations = (bytes: Uint8Array, numeralSystem: NumeralSystem) => {
  if (bytes.length === 0 || bytes.length > 32) {
    return null;
  }

  const isHex = numeralSystem === NumeralSystem.HEXADECIMAL;

  function decodeU16At(offset: number): number | null {
    if (offset + 2 > bytes.length) return null;
    const dec = codec.Decoder.fromBlob(bytes);
    dec.resetTo(offset);
    return dec.u16();
  }
  function decodeU32At(offset: number): number | null {
    if (offset + 4 > bytes.length) return null;
    const dec = codec.Decoder.fromBlob(bytes);
    dec.resetTo(offset);
    return dec.u32();
  }
  function decodeU64At(offset: number): bigint | null {
    if (offset + 8 > bytes.length) return null;
    const dec = codec.Decoder.fromBlob(bytes);
    dec.resetTo(offset);
    return dec.u64();
  }

  function fmt(value: number | bigint): string {
    if (isHex) {
      return "0x" + value.toString(16).toUpperCase();
    }
    return value.toString();
  }

  const u16Arr: string[] = [];
  for (let i = 0; i < 16; i++) {
    const offset = i * 2;
    const val = decodeU16At(offset);
    if (val === null) break;
    u16Arr.push(fmt(val));
  }

  const u32Arr: string[] = [];
  for (let i = 0; i < 8; i++) {
    const offset = i * 4;
    const val = decodeU32At(offset);
    if (val === null) break;
    u32Arr.push(fmt(val));
  }

  const u64Arr: string[] = [];
  for (let i = 0; i < 4; i++) {
    const offset = i * 8;
    const val = decodeU64At(offset);
    if (val === null) break;
    u64Arr.push(fmt(val));
  }

  return {
    u16Line: "u16: " + u16Arr.join(" "),
    u32Line: "u32: " + u32Arr.join(" "),
    u64Line: "u64: " + u64Arr.join(" "),
  };
};
