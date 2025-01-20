import { Instruction } from "./instruction";
import { Mask } from "@typeberry/pvm-debugger-adapter";

type Byte = number;
type Gas = number;
type InstructionTuple = [Byte, Gas];

const instructionsWithoutArgs: InstructionTuple[] = [
  [Instruction.TRAP, 1],
  [Instruction.FALLTHROUGH, 1],
];

const instructionsWithOneImmediate: InstructionTuple[] = [[Instruction.ECALLI, 1]];

const instructionsWithOneRegisterAndOneExtendedWidthImmediate: InstructionTuple[] = [[Instruction.LOAD_IMM_64, 1]];

const instructionsWithTwoImmediates: InstructionTuple[] = [
  [Instruction.STORE_IMM_U8, 1],
  [Instruction.STORE_IMM_U16, 1],
  [Instruction.STORE_IMM_U32, 1],
  [Instruction.STORE_IMM_U64, 1],
];

const instructionsWithOneOffset: InstructionTuple[] = [[Instruction.JUMP, 1]];

const instructionsWithOneRegisterAndOneImmediate: InstructionTuple[] = [
  [Instruction.JUMP_IND, 1],
  [Instruction.LOAD_IMM, 1],
  [Instruction.LOAD_U8, 1],
  [Instruction.LOAD_I8, 1],
  [Instruction.LOAD_U16, 1],
  [Instruction.LOAD_I16, 1],
  [Instruction.LOAD_U32, 1],
  [Instruction.LOAD_I32, 1],
  [Instruction.LOAD_U64, 1],
  [Instruction.STORE_U8, 1],
  [Instruction.STORE_U16, 1],
  [Instruction.STORE_U32, 1],
  [Instruction.STORE_U64, 1],
];

const instructionsWithOneRegisterAndTwoImmediate: InstructionTuple[] = [
  [Instruction.STORE_IMM_IND_U8, 1],
  [Instruction.STORE_IMM_IND_U16, 1],
  [Instruction.STORE_IMM_IND_U32, 1],
  [Instruction.STORE_IMM_IND_U64, 1],
];

const instructionsWithOneRegisterOneImmediateAndOneOffset: InstructionTuple[] = [
  [Instruction.LOAD_IMM_JUMP, 1],
  [Instruction.BRANCH_EQ_IMM, 1],
  [Instruction.BRANCH_NE_IMM, 1],
  [Instruction.BRANCH_LT_U_IMM, 1],
  [Instruction.BRANCH_LE_U_IMM, 1],
  [Instruction.BRANCH_GE_U_IMM, 1],
  [Instruction.BRANCH_GT_U_IMM, 1],
  [Instruction.BRANCH_LT_S_IMM, 1],
  [Instruction.BRANCH_LE_S_IMM, 1],
  [Instruction.BRANCH_GE_S_IMM, 1],
  [Instruction.BRANCH_GT_S_IMM, 1],
];

const instructionsWithTwoRegisters: InstructionTuple[] = [
  [Instruction.MOVE_REG, 1],
  [Instruction.SBRK, 1],
  [Instruction.COUNT_SET_BITS_64, 1],
  [Instruction.COUNT_SET_BITS_32, 1],
  [Instruction.LEADING_ZERO_BITS_64, 1],
  [Instruction.LEADING_ZERO_BITS_32, 1],
  [Instruction.TRAILING_ZERO_BITS_64, 1],
  [Instruction.TRAILING_ZERO_BITS_32, 1],
  [Instruction.SIGN_EXTEND_8, 1],
  [Instruction.SIGN_EXTEND_16, 1],
  [Instruction.ZERO_EXTEND_16, 1],
  [Instruction.REVERSE_BYTES, 1],
];

const instructionsWithTwoRegistersAndOneImmediate: InstructionTuple[] = [
  [Instruction.STORE_IND_U8, 1],
  [Instruction.STORE_IND_U16, 1],
  [Instruction.STORE_IND_U32, 1],
  [Instruction.STORE_IND_U64, 1],
  [Instruction.LOAD_IND_U8, 1],
  [Instruction.LOAD_IND_I8, 1],
  [Instruction.LOAD_IND_U16, 1],
  [Instruction.LOAD_IND_I16, 1],
  [Instruction.LOAD_IND_U32, 1],
  [Instruction.LOAD_IND_I32, 1],
  [Instruction.LOAD_IND_U64, 1],
  [Instruction.ADD_IMM_32, 1],
  [Instruction.AND_IMM, 1],
  [Instruction.XOR_IMM, 1],
  [Instruction.OR_IMM, 1],
  [Instruction.MUL_IMM_32, 1],
  [Instruction.SET_LT_U_IMM, 1],
  [Instruction.SET_LT_S_IMM, 1],
  [Instruction.SHLO_L_IMM_32, 1],
  [Instruction.SHLO_R_IMM_32, 1],
  [Instruction.SHAR_R_IMM_32, 1],
  [Instruction.NEG_ADD_IMM_32, 1],
  [Instruction.SET_GT_U_IMM, 1],
  [Instruction.SET_GT_S_IMM, 1],
  [Instruction.SHLO_L_IMM_ALT_32, 1],
  [Instruction.SHLO_R_IMM_ALT_32, 1],
  [Instruction.SHAR_R_IMM_ALT_32, 1],
  [Instruction.CMOV_IZ_IMM, 1],
  [Instruction.CMOV_NZ_IMM, 1],
  [Instruction.ADD_IMM_64, 1],
  [Instruction.MUL_IMM_64, 1],
  [Instruction.SHLO_L_IMM_64, 1],
  [Instruction.SHLO_R_IMM_64, 1],
  [Instruction.SHAR_R_IMM_64, 1],
  [Instruction.NEG_ADD_IMM_64, 1],
  [Instruction.SHLO_L_IMM_ALT_64, 1],
  [Instruction.SHLO_R_IMM_ALT_64, 1],
  [Instruction.SHAR_R_IMM_ALT_64, 1],
  [Instruction.ROT_R_64_IMM, 1],
  [Instruction.ROT_R_64_IMM_ALT, 1],
  [Instruction.ROT_R_32_IMM, 1],
  [Instruction.ROT_R_32_IMM_ALT, 1],
];

const instructionsWithTwoRegistersAndOneOffset: InstructionTuple[] = [
  [Instruction.BRANCH_EQ, 1],
  [Instruction.BRANCH_NE, 1],
  [Instruction.BRANCH_LT_U, 1],
  [Instruction.BRANCH_LT_S, 1],
  [Instruction.BRANCH_GE_U, 1],
  [Instruction.BRANCH_GE_S, 1],
];

const instructionWithTwoRegistersAndTwoImmediates: InstructionTuple[] = [[Instruction.LOAD_IMM_JUMP_IND, 1]];

const instructionsWithThreeRegisters: InstructionTuple[] = [
  [Instruction.ADD_32, 1],
  [Instruction.SUB_32, 1],
  [Instruction.MUL_32, 1],
  [Instruction.DIV_U_32, 1],
  [Instruction.DIV_S_32, 1],
  [Instruction.REM_U_32, 1],
  [Instruction.REM_S_32, 1],
  [Instruction.SHLO_L_32, 1],
  [Instruction.SHLO_R_32, 1],
  [Instruction.SHAR_R_32, 1],
  [Instruction.ADD_64, 1],
  [Instruction.SUB_64, 1],
  [Instruction.MUL_64, 1],
  [Instruction.DIV_U_64, 1],
  [Instruction.DIV_S_64, 1],
  [Instruction.REM_U_64, 1],
  [Instruction.REM_S_64, 1],
  [Instruction.SHLO_L_64, 1],
  [Instruction.SHLO_R_64, 1],
  [Instruction.SHAR_R_64, 1],
  [Instruction.AND, 1],
  [Instruction.XOR, 1],
  [Instruction.OR, 1],
  [Instruction.MUL_UPPER_S_S, 1],
  [Instruction.MUL_UPPER_U_U, 1],
  [Instruction.MUL_UPPER_S_U, 1],
  [Instruction.SET_LT_U, 1],
  [Instruction.SET_LT_S, 1],
  [Instruction.CMOV_IZ, 1],
  [Instruction.CMOV_NZ, 1],
  [Instruction.ROT_L_64, 1],
  [Instruction.ROT_L_32, 1],
  [Instruction.ROT_R_64, 1],
  [Instruction.ROT_R_32, 1],
  [Instruction.AND_INV, 1],
  [Instruction.OR_INV, 1],
  [Instruction.XNOR, 1],
  [Instruction.MAX, 1],
  [Instruction.MAX_U, 1],
  [Instruction.MIN, 1],
  [Instruction.MIN_U, 1],
];

const instructions: InstructionTuple[] = [
  ...instructionsWithoutArgs,
  ...instructionsWithOneImmediate,
  ...instructionsWithTwoImmediates,
  ...instructionsWithOneOffset,
  ...instructionsWithOneRegisterAndOneImmediate,
  ...instructionsWithOneRegisterAndTwoImmediate,
  ...instructionsWithOneRegisterOneImmediateAndOneOffset,
  ...instructionsWithTwoRegisters,
  ...instructionsWithTwoRegistersAndOneImmediate,
  ...instructionsWithTwoRegistersAndOneOffset,
  ...instructionWithTwoRegistersAndTwoImmediates,
  ...instructionsWithThreeRegisters,
  ...instructionsWithOneRegisterAndOneExtendedWidthImmediate,
];

type OpCode = {
  gas: Gas;
};

const createOpCodeEntry = ([byte, gas]: InstructionTuple): [Byte, OpCode] => [byte, { gas }];

type ByteToOpCodeMap = { [key: Byte]: OpCode };

export const byteToOpCodeMap = instructions.reduce((acc, instruction) => {
  const [byte, opCode] = createOpCodeEntry(instruction);
  acc[byte] = opCode;
  return acc;
}, {} as ByteToOpCodeMap);

export function assemblify(program: Uint8Array, mask: Mask) {
  return program.reduce(
    (acc, byte, index) => {
      if (mask.isInstruction(index)) {
        acc.push([Instruction[byte]]);
      } else {
        acc[acc.length - 1].push(byte);
      }
      return acc;
    },
    [] as Array<Array<string | number>>,
  );
}
