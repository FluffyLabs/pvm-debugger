import { check } from "../../utils";
export class Mask {
  /**
   * The lookup table will have `0` at the index which corresponds to an instruction on the same index in the bytecode.
   * In case the value is non-zero it signifies the offset to the index with next instruction.
   *
   * Example:
   * ```
   * 0..1..2..3..4..5..6..7..8..9 # Indices
   * 0..2..1..0..1..0..3..2..1..0 # lookupTable forward values
   * 0..1..2..0..1..0..1..2..3..0 # lookupTable backward values
   * ```
   * There are instructions at indices `0, 3, 5, 9`.
   */
  private lookupTableForward: Uint8Array;
  private lookupTableBackward: Uint8Array;

  constructor(mask: Uint8Array) {
    this.lookupTableForward = this.buildLookupTableForward(mask);
    this.lookupTableBackward = this.buildLookupTableBackward(mask);
  }

  isInstruction(index: number) {
    return this.lookupTableForward[index] === 0;
  }

  getNoOfBytesToNextInstruction(index: number) {
    check(index >= 0, "index cannot be a negative number");
    check(index < this.lookupTableForward.length, `index cannot be bigger than ${this.lookupTableForward.length}`);
    return this.lookupTableForward[index];
  }

  getNoOfBytesToPreviousInstruction(index: number) {
    check(index >= 0, "index cannot be a negative number");
    check(index < this.lookupTableBackward.length, `index cannot be bigger than ${this.lookupTableBackward.length}`);
    return this.lookupTableBackward[index];
  }

  private buildLookupTableForward(mask: Uint8Array) {
    const table = new Uint8Array(mask.length * 8);
    let lastInstructionOffset = 0;
    for (let i = mask.length - 1; i >= 0; i--) {
      let singleBitMask = 0x80;
      for (let j = 7; j >= 0; j--) {
        if ((mask[i] & singleBitMask) > 0) {
          lastInstructionOffset = 0;
        } else {
          lastInstructionOffset++;
        }
        table[i * 8 + j] = lastInstructionOffset;
        singleBitMask >>>= 1;
      }
    }
    return table;
  }

  private buildLookupTableBackward(mask: Uint8Array) {
    const table = new Uint8Array(mask.length * 8);
    let lastInstructionOffset = 0;
    for (let i = 0; i < mask.length; i++) {
      let singleBitMask = 0x01;
      for (let j = 0; j < 8; j++) {
        if ((mask[i] & singleBitMask) > 0) {
          lastInstructionOffset = 0;
        } else {
          lastInstructionOffset++;
        }
        table[i * 8 + j] = lastInstructionOffset;
        singleBitMask <<= 1;
      }
    }
    return table;
  }
}
