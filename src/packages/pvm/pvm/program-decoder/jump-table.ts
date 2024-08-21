import { LittleEndianDecoder } from "../../jam-codec/little-endian-decoder";
import { check } from "../../utils";

export class JumpTable {
  private indices: Uint32Array;
  private littleEndianDecoder = new LittleEndianDecoder();

  constructor(jumpTableItemLength: number, bytes: Uint8Array) {
    check(
      jumpTableItemLength === 0 || bytes.length % jumpTableItemLength === 0,
      `Length of jump table (${bytes.length}) should be a multiple of item lenght (${jumpTableItemLength})!`,
    );

    const length = jumpTableItemLength === 0 ? 0 : bytes.length / jumpTableItemLength;

    this.indices = new Uint32Array(length);
    for (let i = 0; i < bytes.length; i += jumpTableItemLength) {
      this.indices[i / jumpTableItemLength] = this.decodeItem(bytes.subarray(i, i + jumpTableItemLength));
    }
  }

  private decodeItem(bytes: Uint8Array) {
    return this.littleEndianDecoder.decodeU32(bytes);
  }

  hasIndex(index: number) {
    return index < this.indices.length && index >= 0;
  }

  getDestination(index: number) {
    return this.indices[index];
  }
}
