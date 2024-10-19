declare module "react-json-view-compare";

declare module "@typeberry/pvm-debugger-adapter" {
  export class Mask {
    isInstruction(index: number): boolean;
  }

  export class ProgramDecoder {
    constructor(rawProgram: Uint8Array);
    getCode(): Uint8Array;
    getMask(): Mask;
  }

  export enum ArgumentType {
    NO_ARGUMENTS = 0,
    ONE_IMMEDIATE = 1,
    TWO_IMMEDIATES = 2,
    ONE_OFFSET = 3,
    ONE_REGISTER_ONE_IMMEDIATE = 4,
    ONE_REGISTER_TWO_IMMEDIATES = 5,
    ONE_REGISTER_ONE_IMMEDIATE_ONE_OFFSET = 6,
    TWO_REGISTERS = 7,
    TWO_REGISTERS_ONE_IMMEDIATE = 8,
    TWO_REGISTERS_ONE_OFFSET = 9,
    TWO_REGISTERS_TWO_IMMEDIATES = 10,
    THREE_REGISTERS = 11,
  }

  type ImmediateDecoder = {
    getUnsigned();
    getSigned();
  };

  export type EmptyArgs = {
    type: ArgumentType.NO_ARGUMENTS;
    noOfBytesToSkip: number;
  };

  export type OneImmediateArgs = {
    type: ArgumentType.ONE_IMMEDIATE;
    noOfBytesToSkip: number;
    immediateDecoder: ImmediateDecoder;
  };

  export type ThreeRegistersArgs = {
    type: ArgumentType.THREE_REGISTERS;
    noOfBytesToSkip: number;
    firstRegisterIndex: number;
    secondRegisterIndex: number;
    thirdRegisterIndex: number;
  };

  export type TwoRegistersArgs = {
    type: ArgumentType.TWO_REGISTERS;
    noOfBytesToSkip: number;
    firstRegisterIndex: number;
    secondRegisterIndex: number;
  };

  export type TwoRegistersOneImmediateArgs = {
    type: ArgumentType.TWO_REGISTERS_ONE_IMMEDIATE;
    noOfBytesToSkip: number;
    firstRegisterIndex: number;
    secondRegisterIndex: number;
    immediateDecoder: ImmediateDecoder;
  };

  export type OneRegisterOneImmediateArgs = {
    type: ArgumentType.ONE_REGISTER_ONE_IMMEDIATE;
    noOfBytesToSkip: number;
    registerIndex: number;
    immediateDecoder: ImmediateDecoder;
  };

  export type TwoRegistersTwoImmediatesArgs = {
    type: ArgumentType.TWO_REGISTERS_TWO_IMMEDIATES;
    noOfBytesToSkip: number;
    firstRegisterIndex: number;
    secondRegisterIndex: number;
    firstImmediateDecoder: ImmediateDecoder;
    secondImmediateDecoder: ImmediateDecoder;
  };

  export type TwoImmediatesArgs = {
    type: ArgumentType.TWO_IMMEDIATES;
    noOfBytesToSkip: number;
    firstImmediateDecoder: ImmediateDecoder;
    secondImmediateDecoder: ImmediateDecoder;
  };

  export type TwoRegistersOneOffsetArgs = {
    type: ArgumentType.TWO_REGISTERS_ONE_OFFSET;
    noOfBytesToSkip: number;
    firstRegisterIndex: number;
    secondRegisterIndex: number;
    nextPc: number;
  };

  export type OneRegisterOneImmediateOneOffsetArgs = {
    type: ArgumentType.ONE_REGISTER_ONE_IMMEDIATE_ONE_OFFSET;
    noOfBytesToSkip: number;
    registerIndex: number;
    immediateDecoder: ImmediateDecoder;
    nextPc: number;
  };

  export type OneRegisterTwoImmediatesArgs = {
    type: ArgumentType.ONE_REGISTER_TWO_IMMEDIATES;
    noOfBytesToSkip: number;
    registerIndex: number;
    firstImmediateDecoder: ImmediateDecoder;
    secondImmediateDecoder: ImmediateDecoder;
  };

  export type OneOffsetArgs = {
    type: ArgumentType.ONE_OFFSET;
    noOfBytesToSkip: number;
    nextPc: number;
  };

  export type Args =
    | EmptyArgs
    | OneImmediateArgs
    | TwoRegistersArgs
    | ThreeRegistersArgs
    | TwoRegistersOneImmediateArgs
    | TwoRegistersTwoImmediatesArgs
    | OneRegisterOneImmediateOneOffsetArgs
    | TwoRegistersOneOffsetArgs
    | OneRegisterOneImmediateArgs
    | OneOffsetArgs
    | TwoImmediatesArgs
    | OneRegisterTwoImmediatesArgs;

  export class ArgsDecoder {
    reset(code: Uint8Array, mask: Mask);
    fillArgs<T extends Args>(pc: number, result: T): void;
  }

  export class Registers {
    reset(): void;
    copyFrom(regs: Registers | Uint32Array): void;
  }

  type Results = [
    EmptyArgs,
    OneImmediateArgs,
    TwoImmediatesArgs,
    OneOffsetArgs,
    OneRegisterOneImmediateArgs,
    OneRegisterTwoImmediatesArgs,
    OneRegisterOneImmediateOneOffsetArgs,
    TwoRegistersArgs,
    TwoRegistersOneImmediateArgs,
    TwoRegistersOneOffsetArgs,
    TwoRegistersTwoImmediatesArgs,
    ThreeRegistersArgs,
  ];

  export function createResults(): Results;

  type InitialState = {
    regs?: RegistersArray;
    pc?: number;
    memory?: Memory;
    gas?: number;
  };

  class Memory {}

  enum Status {
    OK = -1,
    HALT = 0,
    PANIC = 1,
    FAULT = 2,
    HOST = 3,
    OUT_OF_GAS = 4,
  }

  export class Pvm {
    reset(program: Uint8Array, pc: number, gas: number, registers: number[], memory: Memory);
    nextStep(): Status;
    getRegisters(): number[];
    getPC(): number;
    getGas(): number;
    getStatus(): Status;
    getMemoryPage(pageNumber: number): null | Uint8Array;
  }

  export class MemoryBuilder {
    setWriteable(startPageIndex: number, endPageIndex: number, data: Uint8Array);
    setReadable(startPageIndex: number, endPageIndex: number, data: Uint8Array);
    setData(address: number, data: Uint8Array);
    finalize(heapStartIndex: number, heapEndIndex: number): Memory;
  }

  export const decodeStandardProgram: (program: Uint8Array, args: Uint8Array) => DecodedProgram;

  export type MemorySegment = {
    start: number;
    end: number;
    data?: Uint8Array | null;
  };

  export type DecodedProgram = {
    code: Uint8Array;
    memory: {
      readable: MemorySegment[];
      writeable: MemorySegment[];
      sbrkIndex: number;
    };
    registers: Uint32Array;
  };

  export const instructionArgumentTypeMap: Array<ArgumentType>;
}

declare module "path-browserify" {
  import path from "path";
  export default path;
}
