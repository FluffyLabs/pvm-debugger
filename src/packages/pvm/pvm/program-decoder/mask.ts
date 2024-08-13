const MAX_ARGS_LENGTH = 24;

export class Mask {
  constructor(private mask: Uint8Array) {}

  isInstruction(index: number) {
    const byteNumber = Math.floor(index / 8);
    const bitNumber = index % 8;
    const singleBitMask = 1 << bitNumber;
    return (this.mask[byteNumber] & singleBitMask) > 0;
  }

  getNoOfBytesToNextInstruction(index: number) {
    let noOfBytes = 0;
    const maxIndex = Math.min(index + MAX_ARGS_LENGTH, this.mask.length * 8);

    for (let i = index + 1; i <= maxIndex; i++) {
      noOfBytes++;
      if (this.isInstruction(i)) {
        break;
      }
    }

    return noOfBytes;
  }
}
