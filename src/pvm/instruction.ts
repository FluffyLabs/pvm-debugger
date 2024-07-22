export enum Instruction {
  TRAP = 0,
  FALLTHROUGH = 17,
  JUMP = 5,
  JUMP_IND = 19,
  LOAD_IMM = 4,
  LOAD_U8 = 60,
  LOAD_I8 = 74,
  LOAD_U16 = 76,
  LOAD_I16 = 66,
  LOAD_U32 = 10,
  STORE_U8 = 71,
  STORE_U16 = 69,
  STORE_U32 = 22,
  STORE_IMM_IND_U8 = 26,
  STORE_IMM_IND_U16 = 54,
  STORE_IMM_IND_U32 = 13,
  LOAD_IMM_JUMP = 6,
  BRANCH_EQ_IMM = 7,
  BRANCH_NE_IMM = 15,
  BRANCH_LT_U_IMM = 44,
  BRANCH_LE_U_IMM = 59,
  BRANCH_GE_U_IMM = 52,
  BRANCH_GT_U_IMM = 50,
  BRANCH_LT_S_IMM = 32,
  BRANCH_LE_S_IMM = 46,
  BRANCH_GE_S_IMM = 45,
  BRANCH_GT_S_IMM = 53,
  MOVE_REG = 82,
  SBRK = 87,
  STORE_IND_U8 = 16,
  STORE_IND_U16 = 29,
  STORE_IND_U32 = 3,
  LOAD_IND_U8 = 11,
  LOAD_IND_I8 = 21,
  LOAD_IND_U16 = 37,
  LOAD_IND_I16 = 33,
  LOAD_IND_U32 = 1,
  ADD_IMM = 2,
  AND_IMM = 18,
  XOR_IMM = 31,
  OR_IMM = 49,
  MUL_IMM = 35,
  MUL_UPPER_S_S_IMM = 65,
  MUL_UPPER_U_U_IMM = 63,
  SET_LT_U_IMM = 27,
  SET_LT_S_IMM = 56,
  SHLO_L_IMM = 9,
  SHLO_R_IMM = 14,
  SHAR_R_IMM = 25,
  NEG_ADD_IMM = 40,
  SET_GT_U_IMM = 39,
  SET_GT_S_IMM = 61,
  SHLO_L_IMM_ALT = 75,
  SHLO_R_IMM_ALT = 72,
  SHAR_R_IMM_ALT = 80,
  CMOV_IZ_IMM = 85,
  CMOV_NZ_IMM = 86,
  BRANCH_EQ = 24,
  BRANCH_NE = 30,
  BRANCH_LT_U = 47,
  BRANCH_LT_S = 48,
  BRANCH_GE_U = 41,
  BRANCH_GE_S = 43,
  LOAD_IMM_JUMP_IND = 42,
  ADD = 8,
  SUB = 20,
  AND = 23,
  XOR = 28,
  OR = 12,
  MUL = 34,
  MUL_UPPER_S_S = 67,
  MUL_UPPER_U_U = 57,
  MUL_UPPER_S_U = 81,
  DIV_U = 68,
  DIV_S = 64,
  REM_U = 73,
  REM_S = 70,
  SET_LT_U = 36,
  SET_LT_S = 58,
  SHLO_L = 55,
  SHLO_R = 51,
  SHAR_R = 77,
  CMOV_IZ = 83,
  CMOV_NZ = 84,
  ECALLI = 78,
  STORE_IMM_U8 = 62,
  STORE_IMM_U16 = 79,
  STORE_IMM_U32 = 38,
}

export const HIGHEST_INSTRUCTION_NUMBER = Instruction.SBRK;
