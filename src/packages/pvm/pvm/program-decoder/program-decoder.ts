import { decodeNaturalNumber } from "../../jam-codec";
import { JumpTable } from "./jump-table";
import { Mask } from "./mask";

export class ProgramDecoder {
  private code: Uint8Array;
  private mask: Mask;
  private jumpTable: JumpTable;

  constructor(rawProgram: Uint8Array) {
    const { code, mask, jumpTable, jumpTableItemLength } = this.decodeProgram(rawProgram);

    this.code = new Uint8Array(code);
    this.mask = new Mask(mask);
    this.jumpTable = new JumpTable(jumpTableItemLength, jumpTable);
  }

  private decodeProgram(program: Uint8Array) {
    const { value: jumpTableLength, bytesToSkip: firstNumberLength } = decodeNaturalNumber(program);
    const jumpTableItemLength = program[firstNumberLength];
    const { value: codeLength, bytesToSkip: thirdNumberLenght } = decodeNaturalNumber(
      program.subarray(firstNumberLength + 1),
    );
    const jumpTableFirstByteIndex = firstNumberLength + 1 + thirdNumberLenght;
    const jumpTableLengthInBytes = Number(jumpTableLength) * jumpTableItemLength;
    const jumpTable = program.subarray(jumpTableFirstByteIndex, jumpTableFirstByteIndex + jumpTableLengthInBytes);
    const codeFirstIndex = jumpTableFirstByteIndex + jumpTableLengthInBytes;
    const code = program.subarray(codeFirstIndex, codeFirstIndex + Number(codeLength));
    const maskFirstIndex = codeFirstIndex + Number(codeLength);
    const maskLengthInBytes = Math.ceil(Number(codeLength) / 8);
    const mask = program.subarray(maskFirstIndex, maskFirstIndex + maskLengthInBytes);

    return {
      mask,
      code,
      jumpTableItemLength,
      jumpTable,
    };
  }

  getMask() {
    return this.mask;
  }

  getCode() {
    return this.code;
  }

  getJumpTable() {
    return this.jumpTable;
  }
}
