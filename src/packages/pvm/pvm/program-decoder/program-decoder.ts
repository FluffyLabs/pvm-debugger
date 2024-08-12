import { decodeNaturalNumber } from "../../jam-codec";
import { Mask } from "./mask";

export class ProgramDecoder {
  private code: Uint8Array;
  private mask: Mask;

  constructor(rawProgram: Uint8Array) {
    const { code, mask } = this.decodeProgram(rawProgram);

    this.code = new Uint8Array(code);
    this.mask = new Mask(mask);
  }

  private decodeProgram(program: Uint8Array) {
    const { value: jumpTableLength, bytesToSkip: firstNumberLength } = decodeNaturalNumber(program);
    const jumpTableItemSize = program[firstNumberLength];
    const { value: codeLength, bytesToSkip: thirdNumberLenght } = decodeNaturalNumber(
      program.subarray(firstNumberLength + 1),
    );
    const jumpTableFirstByteIndex = firstNumberLength + 1 + thirdNumberLenght;
    const jumpTableLengthInBytes = Number(jumpTableLength) * jumpTableItemSize;
    const jumpTable = program.subarray(jumpTableFirstByteIndex, jumpTableFirstByteIndex + jumpTableLengthInBytes);
    const codeFirstIndex = jumpTableFirstByteIndex + jumpTableLengthInBytes;
    const code = program.subarray(codeFirstIndex, codeFirstIndex + Number(codeLength));
    const maskFirstIndex = codeFirstIndex + Number(codeLength);
    const maskLengthInBytes = Math.ceil(Number(codeLength) / 8);
    const mask = program.subarray(maskFirstIndex, maskFirstIndex + maskLengthInBytes);

    return {
      mask,
      code,
      jumpTable,
    };
  }

  getMask() {
    return this.mask;
  }

  getCode() {
    return this.code;
  }
}
