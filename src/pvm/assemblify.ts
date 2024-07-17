import { Instruction } from "./instruction";

type Byte = number;
type Name = string;
type Gas = number;
type InstructionTuple = [Byte, Name, Gas];

const instructionsWithoutArgs: InstructionTuple[] = [
	[Instruction.TRAP, "trap", 1],
	[Instruction.FALLTHROUGH, "fallthrough", 0],
];

const instructionsWithOneImmediate: InstructionTuple[] = [
	[Instruction.ECALLI, "ecalli", 0],
];

const instructionsWithTwoImmediates: InstructionTuple[] = [
	[Instruction.STORE_IMM_U8, "store_imm_u8", 0],
	[Instruction.STORE_IMM_U16, "store_imm_u16", 0],
	[Instruction.STORE_IMM_U32, "store_imm_u32", 0],
];

const instructionsWithOneOffset: InstructionTuple[] = [
	[Instruction.JUMP, "jump", 0],
];

const instructionsWithOneRegisterAndOneImmediate: InstructionTuple[] = [
	[Instruction.JUMP_IND, "jump_ind", 0],
	[Instruction.LOAD_IMM, "load_imm", 0],
	[Instruction.LOAD_U8, "load_u8", 0],
	[Instruction.LOAD_I8, "load_i8", 0],
	[Instruction.LOAD_U16, "load_u16", 0],
	[Instruction.LOAD_I16, "load_i16", 0],
	[Instruction.LOAD_U32, "load_u32", 0],
	[Instruction.STORE_U8, "store_u8", 0],
	[Instruction.STORE_U16, "store_u16", 0],
	[Instruction.STORE_U32, "store_u32", 0],
];

const instructionsWithOneRegisterAndTwoImmediate: InstructionTuple[] = [
	[Instruction.STORE_IMM_IND_U8, "store_imm_ind_u8", 0],
	[Instruction.STORE_IMM_IND_U16, "store_imm_ind_u16", 0],
	[Instruction.STORE_IMM_IND_U32, "store_imm_ind_u32", 0],
];

const instructionsWithOneRegisterOneImmediateAndOneOffset: InstructionTuple[] =
	[
		[Instruction.LOAD_IMM_JUMP, "load_imm_jump", 0],
		[Instruction.BRANCH_EQ_IMM, "branch_eq_imm", 0],
		[Instruction.BRANCH_NE_IMM, "branch_ne_imm", 0],
		[Instruction.BRANCH_LT_U_IMM, "branch_lt_u_imm", 0],
		[Instruction.BRANCH_LE_U_IMM, "branch_le_u_imm", 0],
		[Instruction.BRANCH_GE_U_IMM, "branch_ge_u_imm", 0],
		[Instruction.BRANCH_GT_U_IMM, "branch_gt_u_imm", 0],
		[Instruction.BRANCH_LT_S_IMM, "branch_lt_s_imm", 0],
		[Instruction.BRANCH_LE_S_IMM, "branch_le_s_imm", 0],
		[Instruction.BRANCH_GE_S_IMM, "branch_ge_s_imm", 0],
		[Instruction.BRANCH_GT_S_IMM, "branch_gt_s_imm", 0],
	];

const instructionsWithTwoRegisters: InstructionTuple[] = [
	[Instruction.MOVE_REG, "move_reg", 0],
	[Instruction.SBRK, "sbrk", 0],
];

const instructionsWithTwoRegistersAndOneImmediate: InstructionTuple[] = [
	[Instruction.STORE_IND_U8, "store_ind_u8", 0],
	[Instruction.STORE_IND_U16, "store_ind_u16", 0],
	[Instruction.STORE_IND_U32, "store_ind_u32", 0],
	[Instruction.LOAD_IND_U8, "load_ind_u8", 0],
	[Instruction.LOAD_IND_I8, "load_ind_i8", 0],
	[Instruction.LOAD_IND_U16, "load_ind_u16", 0],
	[Instruction.LOAD_IND_I16, "load_ind_i16", 0],
	[Instruction.LOAD_IND_U32, "load_ind_u32", 0],
	[Instruction.ADD_IMM, "add_imm", 2],
	[Instruction.AND_IMM, "and_imm", 2],
	[Instruction.XOR_IMM, "xor_imm", 2],
	[Instruction.OR_IMM, "or_imm", 2],
	[Instruction.MUL_IMM, "mul_imm", 2],
	[Instruction.MUL_UPPER_S_S_IMM, "mul_upper_s_s_imm", 0],
	[Instruction.MUL_UPPER_U_U_IMM, "mul_upper_u_u_imm", 0],
	[Instruction.SET_LT_U_IMM, "set_lt_u_imm", 0],
	[Instruction.SET_LT_S_IMM, "set_lt_s_imm", 0],
	[Instruction.SHLO_L_IMM, "shlo_l_imm", 2],
	[Instruction.SHLO_R_IMM, "shlo_r_imm", 2],
	[Instruction.SHAR_R_IMM, "shar_r_imm", 2],
	[Instruction.NEG_ADD_IMM, "neg_add_imm", 2],
	[Instruction.SET_GT_U_IMM, "set_gt_u_imm", 0],
	[Instruction.SET_GT_S_IMM, "set_gt_s_imm", 0],
	[Instruction.SHLO_L_IMM_ALT, "shlo_l_imm_alt", 2],
	[Instruction.SHLO_R_IMM_ALT, "shlo_r_imm_alt", 2],
	[Instruction.SHAR_R_IMM_ALT, "shar_r_imm_alt", 2],
	[Instruction.CMOV_IZ_IMM, "cmov_iz_imm", 0],
	[Instruction.CMOV_NZ_IMM, "cmov_nz_imm", 0],
];

const instructionsWithTwoRegistersAndOneOffset: InstructionTuple[] = [
	[Instruction.BRANCH_EQ, "branch_eq", 0],
	[Instruction.BRANCH_NE, "branch_ne", 0],
	[Instruction.BRANCH_LT_U, "branch_lt_u", 0],
	[Instruction.BRANCH_LT_S, "branch_lt_s", 0],
	[Instruction.BRANCH_GE_U, "branch_ge_u", 0],
	[Instruction.BRANCH_GE_S, "branch_ge_s", 0],
];

const instructionWithTwoRegistersAndTwoImmediates: InstructionTuple[] = [
	[Instruction.LOAD_IMM_JUMP_IND, "load_imm_jump_ind", 0],
];

const instructionsWithThreeRegisters: InstructionTuple[] = [
	[Instruction.ADD, "add", 2],
	[Instruction.SUB, "sub", 2],
	[Instruction.AND, "and", 2],
	[Instruction.XOR, "xor", 2],
	[Instruction.OR, "or", 2],
	[Instruction.MUL, "mul", 2],
	[Instruction.MUL_UPPER_S_S, "mul_upper_s_s", 0],
	[Instruction.MUL_UPPER_U_U, "mul_upper_u_u", 0],
	[Instruction.MUL_UPPER_S_U, "mul_upper_s_u", 0],
	[Instruction.DIV_U, "div_u", 2],
	[Instruction.DIV_S, "div_s", 2],
	[Instruction.REM_U, "rem_u", 2],
	[Instruction.REM_S, "rem_s", 2],
	[Instruction.SET_LT_U, "set_lt_u", 0],
	[Instruction.SET_LT_S, "set_lt_s", 0],
	[Instruction.SHLO_L, "shlo_l", 2],
	[Instruction.SHLO_R, "shlo_r", 2],
	[Instruction.SHAR_R, "shar_r", 2],
	[Instruction.CMOV_IZ, "cmov_iz", 0],
	[Instruction.CMOV_NZ, "cmov_nz", 0],
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
];

type OpCode = {
	name: Name;
	gas: Gas;
};

const createOpCodeEntry = ([byte, name, gas]: InstructionTuple): [
	Byte,
	OpCode,
] => [byte, { name, gas }];

type ByteToOpCodeMap = { [key: Byte]: OpCode };

export const byteToOpCodeMap = instructions.reduce((acc, instruction) => {
	const [byte, opCode] = createOpCodeEntry(instruction);
	acc[byte] = opCode;
	return acc;
}, {} as ByteToOpCodeMap);

export function assemblify(program: number[], k: number[]) {
	const printableProgram = program.reduce(
		(acc, byte, index) => {
			const byteNumber = Math.floor(index / 8);
			const bitNumber = index % 8;
			const mask = 1 << bitNumber;
			const isOpCode = (k[byteNumber] & mask) > 0;
			if (isOpCode) {
				const instruction = byteToOpCodeMap[byte];
				acc.push([instruction.name]);
			} else {
				acc[acc.length - 1].push(byte);
			}
			return acc;
		},
		[] as Array<Array<string | number>>,
	);

	console.log(printableProgram);

  return printableProgram
}
