import { HIGHEST_INSTRUCTION_NUMBER, Instruction } from "../instruction";
import { ArgumentType } from "./argument-type";

export const instructionArgumentTypeMap = new Array<ArgumentType>(
	HIGHEST_INSTRUCTION_NUMBER + 1,
);

instructionArgumentTypeMap[Instruction.TRAP] = ArgumentType.NO_ARGUMENTS;
instructionArgumentTypeMap[Instruction.FALLTHROUGH] = ArgumentType.NO_ARGUMENTS;
instructionArgumentTypeMap[Instruction.ECALLI] = ArgumentType.ONE_IMMEDIATE;
instructionArgumentTypeMap[Instruction.STORE_IMM_U8] =
	ArgumentType.TWO_IMMEDIATE;
instructionArgumentTypeMap[Instruction.STORE_IMM_U16] =
	ArgumentType.TWO_IMMEDIATE;
instructionArgumentTypeMap[Instruction.STORE_IMM_U32] =
	ArgumentType.TWO_IMMEDIATE;
instructionArgumentTypeMap[Instruction.JUMP] = ArgumentType.ONE_OFFSET;
instructionArgumentTypeMap[Instruction.JUMP_IND] =
	ArgumentType.ONE_REGISTER_ONE_IMMEDIATE;
instructionArgumentTypeMap[Instruction.LOAD_IMM] =
	ArgumentType.ONE_REGISTER_ONE_IMMEDIATE;
instructionArgumentTypeMap[Instruction.LOAD_U8] =
	ArgumentType.ONE_REGISTER_ONE_IMMEDIATE;
instructionArgumentTypeMap[Instruction.LOAD_I8] =
	ArgumentType.ONE_REGISTER_ONE_IMMEDIATE;
instructionArgumentTypeMap[Instruction.LOAD_U16] =
	ArgumentType.ONE_REGISTER_ONE_IMMEDIATE;
instructionArgumentTypeMap[Instruction.LOAD_I16] =
	ArgumentType.ONE_REGISTER_ONE_IMMEDIATE;
instructionArgumentTypeMap[Instruction.LOAD_U32] =
	ArgumentType.ONE_REGISTER_ONE_IMMEDIATE;
instructionArgumentTypeMap[Instruction.STORE_U8] =
	ArgumentType.ONE_REGISTER_ONE_IMMEDIATE;
instructionArgumentTypeMap[Instruction.STORE_U16] =
	ArgumentType.ONE_REGISTER_ONE_IMMEDIATE;
instructionArgumentTypeMap[Instruction.STORE_U32] =
	ArgumentType.ONE_REGISTER_ONE_IMMEDIATE;
instructionArgumentTypeMap[Instruction.STORE_IMM_IND_U8] =
	ArgumentType.ONE_REGISTER_TWO_IMMEDIATE;
instructionArgumentTypeMap[Instruction.STORE_IMM_IND_U16] =
	ArgumentType.ONE_REGISTER_TWO_IMMEDIATE;
instructionArgumentTypeMap[Instruction.STORE_IMM_IND_U32] =
	ArgumentType.ONE_REGISTER_TWO_IMMEDIATE;
instructionArgumentTypeMap[Instruction.LOAD_IMM_JUMP] =
	ArgumentType.ONE_REGISTER_ONE_IMMEDIATE_ONE_OFFSET;
instructionArgumentTypeMap[Instruction.BRANCH_EQ_IMM] =
	ArgumentType.ONE_REGISTER_ONE_IMMEDIATE_ONE_OFFSET;
instructionArgumentTypeMap[Instruction.BRANCH_NE_IMM] =
	ArgumentType.ONE_REGISTER_ONE_IMMEDIATE_ONE_OFFSET;
instructionArgumentTypeMap[Instruction.BRANCH_LT_U_IMM] =
	ArgumentType.ONE_REGISTER_ONE_IMMEDIATE_ONE_OFFSET;
instructionArgumentTypeMap[Instruction.BRANCH_LE_U_IMM] =
	ArgumentType.ONE_REGISTER_ONE_IMMEDIATE_ONE_OFFSET;
instructionArgumentTypeMap[Instruction.BRANCH_GE_U_IMM] =
	ArgumentType.ONE_REGISTER_ONE_IMMEDIATE_ONE_OFFSET;
instructionArgumentTypeMap[Instruction.BRANCH_GT_U_IMM] =
	ArgumentType.ONE_REGISTER_ONE_IMMEDIATE_ONE_OFFSET;
instructionArgumentTypeMap[Instruction.BRANCH_LT_S_IMM] =
	ArgumentType.ONE_REGISTER_ONE_IMMEDIATE_ONE_OFFSET;
instructionArgumentTypeMap[Instruction.BRANCH_LE_S_IMM] =
	ArgumentType.ONE_REGISTER_ONE_IMMEDIATE_ONE_OFFSET;
instructionArgumentTypeMap[Instruction.BRANCH_GE_S_IMM] =
	ArgumentType.ONE_REGISTER_ONE_IMMEDIATE_ONE_OFFSET;
instructionArgumentTypeMap[Instruction.BRANCH_GT_S_IMM] =
	ArgumentType.ONE_REGISTER_ONE_IMMEDIATE_ONE_OFFSET;
instructionArgumentTypeMap[Instruction.MOVE_REG] = ArgumentType.TWO_REGISTERS;
instructionArgumentTypeMap[Instruction.SBRK] = ArgumentType.TWO_REGISTERS;
instructionArgumentTypeMap[Instruction.STORE_IND_U8] =
	ArgumentType.TWO_REGISTERS_ONE_IMMEDIATE;
instructionArgumentTypeMap[Instruction.STORE_IND_U16] =
	ArgumentType.TWO_REGISTERS_ONE_IMMEDIATE;
instructionArgumentTypeMap[Instruction.STORE_IND_U32] =
	ArgumentType.TWO_REGISTERS_ONE_IMMEDIATE;
instructionArgumentTypeMap[Instruction.LOAD_IND_U8] =
	ArgumentType.TWO_REGISTERS_ONE_IMMEDIATE;
instructionArgumentTypeMap[Instruction.LOAD_IND_I8] =
	ArgumentType.TWO_REGISTERS_ONE_IMMEDIATE;
instructionArgumentTypeMap[Instruction.LOAD_IND_U16] =
	ArgumentType.TWO_REGISTERS_ONE_IMMEDIATE;
instructionArgumentTypeMap[Instruction.LOAD_IND_I16] =
	ArgumentType.TWO_REGISTERS_ONE_IMMEDIATE;
instructionArgumentTypeMap[Instruction.LOAD_IND_U32] =
	ArgumentType.TWO_REGISTERS_ONE_IMMEDIATE;
instructionArgumentTypeMap[Instruction.ADD_IMM] =
	ArgumentType.TWO_REGISTERS_ONE_IMMEDIATE;
instructionArgumentTypeMap[Instruction.AND_IMM] =
	ArgumentType.TWO_REGISTERS_ONE_IMMEDIATE;
instructionArgumentTypeMap[Instruction.XOR_IMM] =
	ArgumentType.TWO_REGISTERS_ONE_IMMEDIATE;
instructionArgumentTypeMap[Instruction.OR_IMM] =
	ArgumentType.TWO_REGISTERS_ONE_IMMEDIATE;
instructionArgumentTypeMap[Instruction.MUL_IMM] =
	ArgumentType.TWO_REGISTERS_ONE_IMMEDIATE;
instructionArgumentTypeMap[Instruction.MUL_UPPER_S_S_IMM] =
	ArgumentType.TWO_REGISTERS_ONE_IMMEDIATE;
instructionArgumentTypeMap[Instruction.MUL_UPPER_U_U_IMM] =
	ArgumentType.TWO_REGISTERS_ONE_IMMEDIATE;
instructionArgumentTypeMap[Instruction.SET_LT_U_IMM] =
	ArgumentType.TWO_REGISTERS_ONE_IMMEDIATE;
instructionArgumentTypeMap[Instruction.SET_LT_S_IMM] =
	ArgumentType.TWO_REGISTERS_ONE_IMMEDIATE;
instructionArgumentTypeMap[Instruction.SHLO_L_IMM] =
	ArgumentType.TWO_REGISTERS_ONE_IMMEDIATE;
instructionArgumentTypeMap[Instruction.SHLO_R_IMM] =
	ArgumentType.TWO_REGISTERS_ONE_IMMEDIATE;
instructionArgumentTypeMap[Instruction.SHAR_R_IMM] =
	ArgumentType.TWO_REGISTERS_ONE_IMMEDIATE;
instructionArgumentTypeMap[Instruction.NEG_ADD_IMM] =
	ArgumentType.TWO_REGISTERS_ONE_IMMEDIATE;
instructionArgumentTypeMap[Instruction.SET_GT_U_IMM] =
	ArgumentType.TWO_REGISTERS_ONE_IMMEDIATE;
instructionArgumentTypeMap[Instruction.SET_GT_S_IMM] =
	ArgumentType.TWO_REGISTERS_ONE_IMMEDIATE;
instructionArgumentTypeMap[Instruction.SHLO_L_IMM_ALT] =
	ArgumentType.TWO_REGISTERS_ONE_IMMEDIATE;
instructionArgumentTypeMap[Instruction.SHLO_R_IMM_ALT] =
	ArgumentType.TWO_REGISTERS_ONE_IMMEDIATE;
instructionArgumentTypeMap[Instruction.SHAR_R_IMM_ALT] =
	ArgumentType.TWO_REGISTERS_ONE_IMMEDIATE;
instructionArgumentTypeMap[Instruction.CMOV_IZ_IMM] =
	ArgumentType.TWO_REGISTERS_ONE_IMMEDIATE;
instructionArgumentTypeMap[Instruction.CMOV_NZ_IMM] =
	ArgumentType.TWO_REGISTERS_ONE_IMMEDIATE;
instructionArgumentTypeMap[Instruction.BRANCH_EQ] =
	ArgumentType.TWO_REGISTERS_ONE_OFFSET;
instructionArgumentTypeMap[Instruction.BRANCH_NE] =
	ArgumentType.TWO_REGISTERS_ONE_OFFSET;
instructionArgumentTypeMap[Instruction.BRANCH_LT_U] =
	ArgumentType.TWO_REGISTERS_ONE_OFFSET;
instructionArgumentTypeMap[Instruction.BRANCH_LT_S] =
	ArgumentType.TWO_REGISTERS_ONE_OFFSET;
instructionArgumentTypeMap[Instruction.BRANCH_GE_U] =
	ArgumentType.TWO_REGISTERS_ONE_OFFSET;
instructionArgumentTypeMap[Instruction.BRANCH_GE_S] =
	ArgumentType.TWO_REGISTERS_ONE_OFFSET;
instructionArgumentTypeMap[Instruction.LOAD_IMM_JUMP_IND] =
	ArgumentType.TWO_REGISTERS_TWO_IMMEDIATE;
instructionArgumentTypeMap[Instruction.ADD] = ArgumentType.THREE_REGISTERS;
instructionArgumentTypeMap[Instruction.SUB] = ArgumentType.THREE_REGISTERS;
instructionArgumentTypeMap[Instruction.AND] = ArgumentType.THREE_REGISTERS;
instructionArgumentTypeMap[Instruction.XOR] = ArgumentType.THREE_REGISTERS;
instructionArgumentTypeMap[Instruction.OR] = ArgumentType.THREE_REGISTERS;
instructionArgumentTypeMap[Instruction.MUL] = ArgumentType.THREE_REGISTERS;
instructionArgumentTypeMap[Instruction.MUL_UPPER_S_S] =
	ArgumentType.THREE_REGISTERS;
instructionArgumentTypeMap[Instruction.MUL_UPPER_U_U] =
	ArgumentType.THREE_REGISTERS;
instructionArgumentTypeMap[Instruction.MUL_UPPER_S_U] =
	ArgumentType.THREE_REGISTERS;
instructionArgumentTypeMap[Instruction.DIV_U] = ArgumentType.THREE_REGISTERS;
instructionArgumentTypeMap[Instruction.DIV_S] = ArgumentType.THREE_REGISTERS;
instructionArgumentTypeMap[Instruction.REM_U] = ArgumentType.THREE_REGISTERS;
instructionArgumentTypeMap[Instruction.REM_S] = ArgumentType.THREE_REGISTERS;
instructionArgumentTypeMap[Instruction.SET_LT_U] = ArgumentType.THREE_REGISTERS;
instructionArgumentTypeMap[Instruction.SET_LT_S] = ArgumentType.THREE_REGISTERS;
instructionArgumentTypeMap[Instruction.SHLO_L] = ArgumentType.THREE_REGISTERS;
instructionArgumentTypeMap[Instruction.SHLO_R] = ArgumentType.THREE_REGISTERS;
instructionArgumentTypeMap[Instruction.SHAR_R] = ArgumentType.THREE_REGISTERS;
instructionArgumentTypeMap[Instruction.CMOV_IZ] = ArgumentType.THREE_REGISTERS;
instructionArgumentTypeMap[Instruction.CMOV_NZ] = ArgumentType.THREE_REGISTERS;
