export interface InstructionKnowledgeBaseEntry {
  name: string;
  description?: string;
  latex?: string;
}

export const instructionsKnowledgeBase: InstructionKnowledgeBaseEntry[] = [

  { 
    name: "TRAP",
    opcode: "0",
    description: "Halts program execution by entering a trap state and setting the exit state to an error condition, effectively terminating further processing",
    latex: "\\varepsilon = \panic$"
  },

  { 
    name: "FALLTHROUGH",
    opcode: "17",
    description: "Transfers control to the next sequential instruction without altering the program state or causing a jump.",
    latex: "\\"
  },

  { 
    name: "ECALLI",
    opcode: "78",
    description: "Transfers control to the next sequential instruction without altering the program state or causing a jump.",
    latex: "\\varepsilon = \host \times \immed_X$"
  },  

 { 
    name: "STORE_IMM_U8",
    opcode: "62",
    description: "Stores an 8-bit immediate value into the specified memory address.",
    latex: "\\{\mem'}^\circlearrowleft_{\immed_X} = \immed_Y \bmod 2^8"
  },

 { 
    name: "STORE_IMM_U16",
    opcode: "79",
    description: "Stores a 16-bit immediate value into the specified memory address.",
    latex: "\\{\mem'}^\circlearrowleft_{\immed_X\dots+2} = \se_2(\immed_Y \bmod 2^{16})"
  }, 

  { 
    name: "STORE_IMM_U32",
    opcode: "38",
    description: "Stores an 32-bit immediate value into the specified memory address.",
    latex: "\\{\mem'}^\circlearrowleft_{\immed_X\dots+4} = \se_4(\immed_Y)"
  },  

  { 
    name: "JUMP",
    opcode: "38",
    description: "Transfers control to the instruction located at the target address specified by the immediate argument.",
    latex: "\\token{branch}(\immed_X, \top)"
  },  

  {
    name: "JUMP_IND",
    opcode: "19",
    description: "Transfers control to the instruction at the address contained in the specified register, effectively performing an indirect jump.",
    latex: "\\token{djump}((\reg_A + \immed_X) \bmod 2^{32})"
  },  

  {
    name: "LOAD_IMM",
    opcode: "4",
    description": "Loads an immediate value into a specified register.",
    latex: "\\reg'_A = \immed_X$"
  },

{  
  name: "LOAD_U8",
  opcode: "20",
  description: "Loads an 8-bit value from memory into a specified register.",
  latex: "\\token{load_u8}(\\reg_A, \\mem[\\reg_B])"
},

{  
  name: "LOAD_I8",
  opcode: "74",
  description: "Loads an 8-bit signed integer from memory into a specified register, extending the sign to fit the register's size.",
  latex: "\\reg'_A = \unsigned{\signedn{1}{\mem_{\immed_X}}}"
},
  
{
  name: "LOAD_U16",
  opcode: "76",
  description: "Loads a 16-bit unsigned value from memory into a specified register.",
  latex: "\\reg'_A = \\de_2(\\memr_{\\immed_X\\dots+2})"
},

{
  name: "LOAD_I16",
  opcode: "66",
  description: "Loads a 16-bit signed integer from memory into a specified register, sign-extending it to fit the register's size.",
  latex: "\\reg'_A = \\unsigned{\\signedn{2}{\\de_2(\\memr_{\\immed_X\\dots+2})}}"
},

{
  name: "LOAD_U32",
  opcode: "10",
  description: "Loads a 32-bit unsigned value from memory into a specified register.",
  latex: "\\reg'_A = \\de_4(\\memr_{\\immed_X\\dots+4})"
}
  
  

  
  
  {
    name: "ADD",
    opcode: "", 8,
    description: "Add ωA and ωB and store the result in ωD modulo 2^32.",
    latex: "\\omega'_D = (\\omega_A + \\omega_B) \\mod 2^{32}",
  },
  {
    name: "SUB",
    description: "Subtract ωB from ωA and store the result in ωD modulo 2^32.",
    latex: "\\omega'_D = (\\omega_A - \\omega_B) \\mod 2^{32}",
  },
  {
    name: "AND",
    description: "Perform a bitwise AND on each bit of ωA and ωB, storing the result in ωD.",
    latex: "\\omega'_D = \\omega_A \\land \\omega_B",
  },
  {
    name: "XOR",
    description: "Perform a bitwise XOR on each bit of ωA and ωB, storing the result in ωD.",
    latex: "\\omega'_D = \\omega_A \\oplus \\omega_B",
  },
  {
    name: "OR",
    description: "Perform a bitwise OR on each bit of ωA and ωB, storing the result in ωD.",
    latex: "\\omega'_D = \\omega_A \\lor \\omega_B",
  },
  {
    name: "MUL",
    description: "Multiply ωA by ωB and store the result in ωD modulo 2^32.",
    latex: "\\omega'_D = (\\omega_A \\times \\omega_B) \\mod 2^{32}",
  },
  {
    name: "MUL_UPPER_S_S",
    description: "Compute the scaled product of Z4(ωA) and Z4(ωB), store in ωD.",
    latex: "\\omega'_D = \\left(\\frac{\\omega_A \\times \\omega_B}{2^{32}}\\right) \\text{ (signed)}",
  },
  {
    name: "MUL_UPPER_U_U",
    description: "Compute the upper 32 bits of the product of ωA and ωB, store in ωD.",
    latex: "\\omega'_D = \\left(\\frac{\\omega_A \\times \\omega_B}{2^{32}}\\right) \\text{ (unsigned)}",
  },
  {
    name: "MUL_UPPER_S_U",
    description: "Compute the scaled product of Z4(ωA) and ωB, store in ωD.",
    latex: "\\omega'_D = \\left(\\frac{\\omega_A \\times \\omega_B}{2^{32}}\\right) \\text{ (signed/unsigned)}",
  },
  {
    name: "DIV_U",
    description: "Divide ωA by ωB and store the result in ωD, with special handling for zero.",
    latex: "\\omega'_D = \\left\\lfloor \\frac{\\omega_A}{\\omega_B} \\right\\rfloor \\text{ (unsigned)}",
  },
  {
    name: "DIV_S",
    description: "Divide ωA by ωB and store the result in ωD, considering signed values and zero.",
    latex: "\\omega'_D = \\left\\lfloor \\frac{\\omega_A}{\\omega_B} \\right\\rfloor \\text{ (signed)}",
  },
  {
    name: "REM_U",
    description: "Compute the remainder of ωA divided by ωB, store in ωD, with special handling for zero.",
    latex: "\\omega'_D = \\omega_A \\mod \\omega_B \\text{ (unsigned)}",
  },
  {
    name: "REM_S",
    description: "Compute the signed remainder of ωA divided by ωB, store in ωD, with special handling for zero.",
    latex: "\\omega'_D = \\omega_A \\mod \\omega_B \\text{ (signed)}",
  },
  {
    name: "SET_LT_U",
    description: "Set ωD to 1 if ωA < ωB, otherwise set ωD to 0.",
    latex: "\\omega'_A = (\\omega_B < \\omega_C) \\text{ (unsigned)}",
  },
  {
    name: "SET_LT_S",
    description: "Set ωD to 1 if signed ωA < ωB, otherwise set ωD to 0.",
    latex: "\\omega'_A = (\\omega_B < \\omega_C) \\text{ (signed)}",
  },
  {
    name: "SHLO_L",
    description: "Shift ωA left by ωB bits and store the result in ωD, modulo 2^32.",
    latex: "\\omega'_D = \\omega_A \\ll \\omega_B",
  },
  {
    name: "SHLO_R",
    description: "Shift ωA left by ωB bits and store the result in ωD.",
    latex: "\\omega'_D = \\omega_A \\gg \\omega_B",
  },
  {
    name: "SHAR_R",
    description: "Shift ωA right by ωB bits and store the result in ωD.",
    latex: "\\omega'_D = \\omega_A \\gg \\omega_B \\text{ (arithmetic)}",
  },
  {
    name: "CMOV_IZ",
    description: "Move ωB to ωD if ωA is zero, otherwise move ωA to ωD.",
    latex: "\\omega'_A = (\\omega_B \\text{ if } \\omega_C == 0 \\text{ else } \\omega_A)",
  },
  {
    name: "MUL_IMM",
    description: "Multiply the value in register ωA by the immediate value νX and store the result in register ωB modulo 2^32.",
    latex: "\\omega'_A = \\omega_B \\times \\nu_X",
  },
  {
    name: "DIV_IMM",
    description: "Divide the value in register ωA by the immediate value νX and store the result in register ωB.",
    latex: "\\omega'_A = \\left\\lfloor \\frac{\\omega_B}{\\nu_X} \\right\\rfloor",
  },
  {
    name: "REM_IMM",
    description: "Compute the remainder of the value in register ωA divided by the immediate value νX and store the result in register ωB.",
    latex: "\\omega'_A = \\omega_B \\mod \\nu_X",
  },
  {
    name: "AND_IMM",
    description: "Perform a bitwise AND between the value in register ωA and the immediate value νX, storing the result in register ωB.",
    latex: "\\omega'_A = \\omega_B \\land \\nu_X",
  },
  {
    name: "OR_IMM",
    description: "Perform a bitwise OR between the value in register ωA and the immediate value νX, storing the result in register ωB.",
    latex: "\\omega'_A = \\omega_B \\lor \\nu_X",
  },
  {
    name: "XOR_IMM",
    description: "Perform a bitwise XOR between the value in register ωA and the immediate value νX, storing the result in register ωB.",
    latex: "\\omega'_A = \\omega_B \\oplus \\nu_X",
  },
  {
    name: "ADD_IMM",
    description: "Add the value in register ωA to the immediate value νX and store the result in register ωB.",
    latex: "\\omega'_A = \\omega_B + \\nu_X",
  },
  {
    name: "SUB_IMM",
    description: "Subtract the immediate value νX from the value in register ωA and store the result in register ωB.",
    latex: "\\omega'_A = \\omega_B - \\nu_X",
  },
  {
    name: "SET_EQ",
    description: "Set ωD to 1 if ωA is equal to ωB, otherwise set ωD to 0.",
    latex: "\\omega'_A = (\\omega_B == \\omega_C)",
  },
  {
    name: "SET_NE",
    description: "Set ωD to 1 if ωA is not equal to ωB, otherwise set ωD to 0.",
    latex: "\\omega'_A = (\\omega_B != \\omega_C)",
  },
  {
    name: "SET_GT_U",
    description: "Set ωD to 1 if unsigned ωA is greater than ωB, otherwise set ωD to 0.",
    latex: "\\omega'_A = (\\omega_B > \\nu_X)",
  },
  {
    name: "SET_LE_U",
    description: "Set ωD to 1 if unsigned ωA is less than or equal to ωB, otherwise set ωD to 0.",
    latex: "\\omega'_A = (\\omega_B <= \\omega_C)",
  },
  {
    name: "SET_GT_S",
    description: "Set ωD to 1 if signed ωA is greater than ωB, otherwise set ωD to 0.",
    latex: "\\omega'_A = (\\omega_B > \\nu_X) \\text{ (signed)}",
  },
  {
    name: "SET_LE_S",
    description: "Set ωD to 1 if signed ωA is less than or equal to ωB, otherwise set ωD to 0.",
    latex: "\\omega'_A = (\\omega_B <= \\omega_C) \\text{ (signed)}",
  },
  {
    name: "JMP",
    description: "Jump to the instruction at address νX.",
    latex: "\token{branch}(\immed_X, \top)$\\",
  },
  {
    name: "JMP_IF_ZERO",
    description: "Jump to the instruction at address νX if ωA is zero.",
    latex: "\\iota = \\omega_A \\text{ if } \\omega_B = 0",
  },
  {
    name: "JMP_IF_NOT_ZERO",
    description: "Jump to the instruction at address νX if ωA is not zero.",
    latex: "\\iota = \\omega_A \\text{ if } \\omega_B \\neq 0",
  },
  {
    name: "JMP_IF_EQ",
    description: "Jump to the instruction at address νX if ωA is equal to ωB.",
    latex: "\\iota = \\omega_A \\text{ if } \\omega_B = \\omega_C",
  },
  {
    name: "JMP_IF_NE",
    description: "Jump to the instruction at address νX if ωA is not equal to ωB.",
    latex: "\\iota = \\omega_A \\text{ if } \\omega_B \\neq \\omega_C",
  },
  {
    name: "CALL",
    description: "Call the subroutine at address νX.",
    latex: "\\iota = \\omega_A",
  },
  {
    name: "RETURN",
    description: "Return from the current subroutine.",
    latex: "\\iota = \\omega_A",
  },
  {
    name: "SYSCALL",
    description: "Perform a system call with the code νX.",
    latex: "\\iota = \\omega_A",
  },
  {
    name: "BREAK",
    description: "Trigger a breakpoint.",
    latex: "\\iota = \\omega_A",
  },
  {
    name: "NOP",
    description: "No operation.",
    latex: "\\iota = \\omega_A",
  },
  { name: "FALLTHROUGH", latex: "Continues execution to the next instruction" },
  { name: "ECALLI", latex: "System call interface" },
  { name: "STORE_IMM_U8", latex: "\\mu[\\omega_A] = \\nu_X \\mod 2^8" },
  { name: "STORE_IMM_U16", latex: "\\mu[\\omega_A] = \\nu_X \\mod 2^{16}" },
  { name: "STORE_IMM_U32", latex: "\\mu[\\omega_A] = \\nu_X \\mod 2^{32}" },
  { name: "JUMP", latex: "\\iota = \\omega_A" },
  { name: "JUMP_IND", latex: "\\iota = \\mu[\\omega_A]" },
  { name: "LOAD_IMM", latex: "\\omega'_A = \\nu_X" },
  { name: "LOAD_U8", latex: "\\omega'_A = \\mu[\\omega_B] \\mod 2^8" },
  { name: "LOAD_I8", latex: "\\omega'_A = (\\mu[\\omega_B] \\mod 2^8) \\text{ as signed}" },
  { name: "LOAD_U16", latex: "\\omega'_A = \\mu[\\omega_B] \\mod 2^{16}" },
  { name: "LOAD_I16", latex: "\\omega'_A = (\\mu[\\omega_B] \\mod 2^{16}) \\text{ as signed}" },
  { name: "LOAD_U32", latex: "\\omega'_A = \\mu[\\omega_B] \\mod 2^{32}" },
  { name: "STORE_U8", latex: "\\mu[\\omega_A] = \\omega_B \\mod 2^8" },
  { name: "STORE_U16", latex: "\\mu[\\omega_A] = \\omega_B \\mod 2^{16}" },
  { name: "STORE_U32", latex: "\\mu[\\omega_A] = \\omega_B \\mod 2^{32}" },
  { name: "STORE_IMM_IND_U8", latex: "\\mu[\\mu[\\omega_A]] = \\nu_X \\mod 2^8" },
  { name: "STORE_IMM_IND_U16", latex: "\\mu[\\mu[\\omega_A]] = \\nu_X \\mod 2^{16}" },
  { name: "STORE_IMM_IND_U32", latex: "\\mu[\\mu[\\omega_A]] = \\nu_X \\mod 2^{32}" },
  { name: "LOAD_IMM_JUMP", latex: "\\omega'_A = \\nu_X; \\iota = \\nu_Y" },
  { name: "BRANCH_EQ_IMM", latex: "\\iota = \\omega_A \\text{ if } \\omega_B = \\nu_X" },
  { name: "BRANCH_NE_IMM", latex: "\\iota = \\omega_A \\text{ if } \\omega_B \\neq \\nu_X" },
  { name: "BRANCH_LT_U_IMM", latex: "\\iota = \\omega_A \\text{ if } \\omega_B < \\nu_X" },
  { name: "BRANCH_LE_U_IMM", latex: "\\iota = \\omega_A \\text{ if } \\omega_B \\leq \\nu_X" },
  { name: "BRANCH_GE_U_IMM", latex: "\\iota = \\omega_A \\text{ if } \\omega_B \\geq \\nu_X" },
  { name: "BRANCH_GT_U_IMM", latex: "\\iota = \\omega_A \\text{ if } \\omega_B > \\nu_X" },
  { name: "BRANCH_LT_S_IMM", latex: "\\iota = \\omega_A \\text{ if } \\omega_B < \\nu_X \\text{ (signed)}" },
  { name: "BRANCH_LE_S_IMM", latex: "\\iota = \\omega_A \\text{ if } \\omega_B \\leq \\nu_X \\text{ (signed)}" },
  { name: "BRANCH_GE_S_IMM", latex: "\\iota = \\omega_A \\text{ if } \\omega_B \\geq \\nu_X \\text{ (signed)}" },
  { name: "BRANCH_GT_S_IMM", latex: "\\iota = \\omega_A \\text{ if } \\omega_B > \\nu_X \\text{ (signed)}" },
  { name: "MOVE_REG", latex: "\\omega'_A = \\omega_B" },
  { name: "SBRK", latex: "Increase program break (memory allocation)" },
  { name: "STORE_IND_U8", latex: "\\mu[\\mu[\\omega_A]] = \\omega_B \\mod 2^8" },
  { name: "STORE_IND_U16", latex: "\\mu[\\mu[\\omega_A]] = \\omega_B \\mod 2^{16}" },
  { name: "STORE_IND_U32", latex: "\\mu[\\mu[\\omega_A]] = \\omega_B \\mod 2^{32}" },
  { name: "LOAD_IND_U8", latex: "\\omega'_A = \\mu[\\mu[\\omega_B]] \\mod 2^8" },
  { name: "LOAD_IND_I8", latex: "\\omega'_A = (\\mu[\\mu[\\omega_B]] \\mod 2^8) \\text{ as signed}" },
  { name: "LOAD_IND_U16", latex: "\\omega'_A = \\mu[\\mu[\\omega_B]] \\mod 2^{16}" },
  { name: "LOAD_IND_I16", latex: "\\omega'_A = (\\mu[\\mu[\\omega_B]] \\mod 2^{16}) \\text{ as signed}" },
  { name: "LOAD_IND_U32", latex: "\\omega'_A = \\mu[\\mu[\\omega_B]] \\mod 2^{32}" },
  { name: "ADD_IMM", latex: "\\omega'_A = (\\omega_B + \\nu_X) \\mod 2^{32}" },
  { name: "AND_IMM", latex: "\\omega'_A = \\omega_B \\land \\nu_X" },
  { name: "XOR_IMM", latex: "\\omega'_A = \\omega_B \\oplus \\nu_X" },
  { name: "OR_IMM", latex: "\\omega'_A = \\omega_B \\lor \\nu_X" },
  { name: "MUL_IMM", latex: "\\omega'_A = (\\omega_B \\times \\nu_X) \\mod 2^{32}" },
  { name: "MUL_UPPER_S_S_IMM", latex: "\\omega'_A = ((\\omega_B \\times \\nu_X) \\gg 32) \\mod 2^{32}$ \\text{ (signed)}" },
  { name: "MUL_UPPER_U_U_IMM", latex: "\\omega'_A = ((\\omega_B \\times \\nu_X) \\gg 32) \\mod 2^{32}$ \\text{ (unsigned)}" },
  { name: "SET_LT_U_IMM", latex: "\\omega'_A = (\\omega_B < \\nu_X)" },
  { name: "SET_LT_S_IMM", latex: "\\omega'_A = (\\omega_B < \\nu_X) \\text{ (signed)}" },
  { name: "SHLO_L_IMM", latex: "\\omega'_A = \\omega_B \\ll \\nu_X" },
  { name: "SHLO_R_IMM", latex: "\\omega'_A = \\omega_B \\gg \\nu_X" },
  { name: "SHAR_R_IMM", latex: "\\omega'_A = \\omega_B \\gg \\nu_X \\text{ (signed)}" },
  { name: "NEG_ADD_IMM", latex: "\\omega'_A = -\\omega_B + \\nu_X" },
  { name: "SET_GT_U_IMM", latex: "\\omega'_A = (\\omega_B > \\nu_X)" },
  { name: "SET_GT_S_IMM", latex: "\\omega'_A = (\\omega_B > \\nu_X) \\text{ (signed)}" },
  { name: "SHLO_L_IMM_ALT", latex: "\\omega'_A = \\omega_B \\ll \\nu_X" },
  { name: "SHLO_R_IMM_ALT", latex: "\\omega'_A = \\omega_B \\gg \\nu_X" },
  { name: "SHAR_R_IMM_ALT", latex: "\\omega'_A = \\omega_B \\gg \\nu_X \\text{ (signed)}" },
  { name: "CMOV_IZ_IMM", latex: "\\omega'_A = \\nu_X \\text{ if } \\omega_B = 0" },
  { name: "CMOV_NZ_IMM", latex: "\\omega'_A = \\nu_X \\text{ if } \\omega_B \\neq 0" },
  { name: "BRANCH_EQ", latex: "\\iota = \\omega_A \\text{ if } \\omega_B = \\omega_C" },
  { name: "BRANCH_NE", latex: "\\iota = \\omega_A \\text{ if } \\omega_B \\neq \\omega_C" },
  { name: "BRANCH_LT_U", latex: "\\iota = \\omega_A \\text{ if } \\omega_B < \\omega_C" },
  { name: "BRANCH_LT_S", latex: "\\iota = \\omega_A \\text{ if } \\omega_B < \\omega_C \\text{ (signed)}" },
  { name: "BRANCH_GE_U", latex: "\\iota = \\omega_A \\text{ if } \\omega_B \\geq \\omega_C" },
  { name: "BRANCH_GE_S", latex: "\\iota = \\omega_A \\text{ if } \\omega_B \\geq \\omega_C \\text{ (signed)}" },
  { name: "LOAD_IMM_JUMP_IND", latex: "\\omega'_A = \\nu_X; \\iota = \\mu[\\omega_B]" },
  { name: "ADD", latex: "\\omega'_D = (\\omega_A + \\omega_B) \\mod 2^{32}" },
  // { name: "SUB", latex: "\\omega'_D = (\\omega_A - \\omega_B) \\mod 2^{32}" },
  { name: "AND", latex: "\\omega'_D = \\omega_A \\land \\omega_B" },
  { name: "XOR", latex: "\\omega'_D = \\omega_A \\oplus \\omega_B" },
  { name: "OR", latex: "\\omega'_D = \\omega_A \\lor \\omega_B" },
  { name: "MUL", latex: "\\omega'_D = (\\omega_A \\times \\omega_B) \\mod 2^{32}" },
  { name: "MUL_UPPER_S_S", latex: "\\omega'_D = \\left(\\frac{\\omega_A \\times \\omega_B}{2^{32}}\\right) \\text{ (signed)}" },
  { name: "MUL_UPPER_U_U", latex: "\\omega'_D = \\left(\\frac{\\omega_A \\times \\omega_B}{2^{32}}\\right) \\text{ (unsigned)}" },
  { name: "MUL_UPPER_S_U", latex: "\\omega'_D = \\left(\\frac{\\omega_A \\times \\omega_B}{2^{32}}\\right) \\text{ (signed/unsigned)}" },
  { name: "DIV_U", latex: "\\omega'_D = \\left\\lfloor \\frac{\\omega_A}{\\omega_B} \\right\\rfloor \\text{ (unsigned)}" },
  { name: "DIV_S", latex: "\\omega'_D = \\left\\lfloor \\frac{\\omega_A}{\\omega_B} \\right\\rfloor \\text{ (signed)}" },
  { name: "REM_U", latex: "\\omega'_D = \\omega_A \\mod \\omega_B \\text{ (unsigned)}" },
  { name: "REM_S", latex: "\\omega'_D = \\omega_A \\mod \\omega_B \\text{ (signed)}" },
  { name: "SET_LT_U", latex: "\\omega'_A = (\\omega_B < \\omega_C) \\text{ (unsigned)}" },
  { name: "SET_LT_S", latex: "\\omega'_A = (\\omega_B < \\omega_C) \\text{ (signed)}" },
  { name: "SHLO_L", latex: "\\omega'_D = \\omega_A \\ll \\omega_B" },
  { name: "SHLO_R", latex: "\\omega'_D = \\omega_A \\gg \\omega_B" },
  { name: "SHAR_R", latex: "\\omega'_D = \\omega_A \\gg \\omega_B \\text{ (arithmetic)}" },
  { name: "CMOV_IZ", latex: "\\omega'_A = (\\omega_B \\text{ if } \\omega_C == 0 \\text{ else } \\omega_A)" },
  { name: "CMOV_NZ", latex: "\\omega'_A = (\\omega_B \\text{ if } \\omega_C \\neq 0 \\text{ else } \\omega_A)" },
];
