export interface InstructionKnowledgeBaseEntry {
  name: string;
  opcode?: string | number;
  description?: string;
  latex?: string;
  linkInGrayPaperReader?: string;
}

export const instructionsKnowledgeBase: InstructionKnowledgeBaseEntry[] = [
  {
    name: "trap",
    opcode: 0,
    description: "Trigger a trap, setting the error state.",
    latex: "\\varepsilon = \\text{⚡}",
    linkInGrayPaperReader: "https://graypaper.fluffylabs.dev/#/439ca37/233a02233a02",
  },
  {
    name: "fallthrough",
    opcode: 17,
    description: "Proceed with the next instruction without any modifications.",
    latex: "",
    linkInGrayPaperReader: "https://graypaper.fluffylabs.dev/#/439ca37/233a02233a02",
  },

  {
    name: "ecalli",
    opcode: 78,
    description: "Execute a call with an external operation, setting the error state based on the result.",
    latex: "\\varepsilon = \\hbar \\times \\nu_X",
    linkInGrayPaperReader: "https://graypaper.fluffylabs.dev/#/439ca37/245c00245c00",
  },

  {
    name: "store_imm_u8",
    opcode: 62,
    description: "Store the immediate value νY into memory at the address νX modulo 2^8.",
    latex: "\\mu'_{\\nu_X} = \\nu_Y \\mod 2^8",
    linkInGrayPaperReader: "https://graypaper.fluffylabs.dev/#/439ca37/24b90024b900",
  },
  {
    name: "store_imm_u16",
    opcode: 79,
    description: "Store the immediate value νY into memory at the address νX as a 16-bit value.",
    latex: "\\mu'_{\\nu_X...+2} = \\mathcal{E}_2(\\nu_Y \\mod 2^{16})",
    linkInGrayPaperReader: "https://graypaper.fluffylabs.dev/#/439ca37/24b90024b900",
  },
  {
    name: "store_imm_u32",
    opcode: 38,
    description: "Store the immediate value νY into memory at the address νX as a 32-bit value.",
    latex: "\\mu'_{\\nu_X...+4} = \\mathcal{E}_4(\\nu_Y)",
    linkInGrayPaperReader: "https://graypaper.fluffylabs.dev/#/439ca37/24b90024b900",
  },

  {
    name: "jump",
    opcode: 5,
    description: "Perform a jump to the address specified by νX.",
    latex: "branch(\\nu_X, \\top)",
    linkInGrayPaperReader: "https://graypaper.fluffylabs.dev/#/439ca37/248101248101",
  },

  {
    name: "jump_ind",
    opcode: 19,
    description: "Indirect jump to the address calculated as (ωA + νX) modulo 2^32.",
    latex: "djump((\\omega_A + \\nu_X) \\mod 2^{32})",
    linkInGrayPaperReader: "https://graypaper.fluffylabs.dev/#/439ca37/24dd0124dd01",
  },
  {
    name: "load_imm",
    opcode: 4,
    description: "Load the immediate value νX into register ω'A.",
    latex: "\\omega'_A = \\nu_X",
    linkInGrayPaperReader: "https://graypaper.fluffylabs.dev/#/439ca37/24dd0124dd01",
  },
  {
    name: "load_u8",
    opcode: 60,
    description: "Load an 8-bit unsigned value from memory at address μνX into register ω'A.",
    latex: "\\omega'_A = \\mu_{\\nu_X}",
    linkInGrayPaperReader: "https://graypaper.fluffylabs.dev/#/439ca37/24dd0124dd01",
  },
  {
    name: "load_i8",
    opcode: 74,
    description: "Load an 8-bit signed value from memory at address μνX into register ω'A.",
    latex: "\\omega'_A = \\mathbb{Z}_4^{-1}(\\mathbb{Z}_1(\\mu_{\\nu_X}))",
    linkInGrayPaperReader: "https://graypaper.fluffylabs.dev/#/439ca37/24dd0124dd01",
  },
  {
    name: "load_u16",
    opcode: 76,
    description: "Load a 16-bit unsigned value from memory at address μνX into register ω'A.",
    latex: "\\omega'_A = \\mathcal{E}_2^{-1}(\\mu_{\\nu_X...+2})",
    linkInGrayPaperReader: "https://graypaper.fluffylabs.dev/#/439ca37/24dd0124dd01",
  },
  {
    name: "load_i16",
    opcode: 66,
    description: "Load a 16-bit signed value from memory at address μνX into register ω'A.",
    latex: "\\omega'_A = \\mathbb{Z}_4^{-1}(\\mathbb{Z}_2(\\mathcal{E}_2^{-1}(\\mu_{\\nu_X...+2})))",
    linkInGrayPaperReader: "https://graypaper.fluffylabs.dev/#/439ca37/24dd0124dd01",
  },
  {
    name: "load_u32",
    opcode: 10,
    description: "Load a 32-bit unsigned value from memory at address μνX into register ω'A.",
    latex: "\\omega'_A = \\mathcal{E}_4^{-1}(\\mu_{\\nu_X...+4})",
    linkInGrayPaperReader: "https://graypaper.fluffylabs.dev/#/439ca37/24dd0124dd01",
  },
  {
    name: "store_u8",
    opcode: 71,
    description: "Store an 8-bit unsigned value from register ωA into memory at address μνX.",
    latex: "\\mu'_{\\nu_X} = \\omega_A \\mod 2^8",
    linkInGrayPaperReader: "https://graypaper.fluffylabs.dev/#/439ca37/24dd0124dd01",
  },
  {
    name: "store_u16",
    opcode: 69,
    description: "Store a 16-bit unsigned value from register ωA into memory at address μνX.",
    latex: "\\mu'_{\\nu_X...+2} = \\mathcal{E}_2(\\omega_A \\mod 2^{16})",
    linkInGrayPaperReader: "https://graypaper.fluffylabs.dev/#/439ca37/24dd0124dd01",
  },
  {
    name: "store_u32",
    opcode: 22,
    description: "Store a 32-bit unsigned value from register ωA into memory at address μνX.",
    latex: "\\mu'_{\\nu_X...+4} = \\mathcal{E}_4(\\omega_A)",
    linkInGrayPaperReader: "https://graypaper.fluffylabs.dev/#/439ca37/24dd0124dd01",
  },

  {
    name: "store_imm_ind_u8",
    opcode: 26,
    description: "Store the immediate value νY into memory at the address (ωA + νX) modulo 2^8.",
    latex: "\\mu'_{\\omega_A + \\nu_X} = \\nu_Y \\mod 2^8",
    linkInGrayPaperReader: "https://graypaper.fluffylabs.dev/#/439ca37/251000251000",
  },
  {
    name: "store_imm_ind_u16",
    opcode: 54,
    description: "Store the immediate value νY into memory at the address (ωA + νX) as a 16-bit value.",
    latex: "\\mu'_{\\omega_A + \\nu_X...+2} = \\mathcal{E}_2(\\nu_Y \\mod 2^{16})",
    linkInGrayPaperReader: "https://graypaper.fluffylabs.dev/#/439ca37/251000251000",
  },
  {
    name: "store_imm_ind_u32",
    opcode: 13,
    description: "Store the immediate value νY into memory at the address (ωA + νX) as a 32-bit value.",
    latex: "\\mu'_{\\omega_A + \\nu_X...+4} = \\mathcal{E}_4(\\nu_Y)",
    linkInGrayPaperReader: "https://graypaper.fluffylabs.dev/#/439ca37/251000251000",
  },

  {
    name: "load_imm_jump",
    opcode: 6,
    description: "Load immediate value νX into register ω'A and perform a branch to address νY.",
    latex: "branch(\\nu_Y, \\top), \\omega'_A = \\nu_X",
    linkInGrayPaperReader: "https://graypaper.fluffylabs.dev/#/439ca37/250401250401",
  },
  {
    name: "branch_eq_imm",
    opcode: 7,
    description: "Branch to νY if ωA equals νX.",
    latex: "branch(\\nu_Y, \\omega_A = \\nu_X)",
    linkInGrayPaperReader: "https://graypaper.fluffylabs.dev/#/439ca37/250401250401",
  },
  {
    name: "branch_ne_imm",
    opcode: 15,
    description: "Branch to νY if ωA does not equal νX.",
    latex: "branch(\\nu_Y, \\omega_A \\neq \\nu_X)",
    linkInGrayPaperReader: "https://graypaper.fluffylabs.dev/#/439ca37/250401250401",
  },
  {
    name: "branch_lt_u_imm",
    opcode: 44,
    description: "Branch to νY if ωA is less than νX (unsigned comparison).",
    latex: "branch(\\nu_Y, \\omega_A < \\nu_X)",
    linkInGrayPaperReader: "https://graypaper.fluffylabs.dev/#/439ca37/250401250401",
  },
  {
    name: "branch_le_u_imm",
    opcode: 59,
    description: "Branch to νY if ωA is less than or equal to νX (unsigned comparison).",
    latex: "branch(\\nu_Y, \\omega_A \\leq \\nu_X)",
    linkInGrayPaperReader: "https://graypaper.fluffylabs.dev/#/439ca37/250401250401",
  },
  {
    name: "branch_ge_u_imm",
    opcode: 52,
    description: "Branch to νY if ωA is greater than or equal to νX (unsigned comparison).",
    latex: "branch(\\nu_Y, \\omega_A \\geq \\nu_X)",
    linkInGrayPaperReader: "https://graypaper.fluffylabs.dev/#/439ca37/250401250401",
  },
  {
    name: "branch_gt_u_imm",
    opcode: 50,
    description: "Branch to νY if ωA is greater than νX (unsigned comparison).",
    latex: "branch(\\nu_Y, \\omega_A > \\nu_X)",
    linkInGrayPaperReader: "https://graypaper.fluffylabs.dev/#/439ca37/250401250401",
  },
  {
    name: "branch_lt_s_imm",
    opcode: 32,
    description: "Branch to νY if ωA is less than νX (signed comparison).",
    latex: "branch(\\nu_Y, \\mathbb{Z}_4(\\omega_A) < \\mathbb{Z}_4(\\nu_X))",
    linkInGrayPaperReader: "https://graypaper.fluffylabs.dev/#/439ca37/250401250401",
  },
  {
    name: "branch_le_s_imm",
    opcode: 46,
    description: "Branch to νY if ωA is less than or equal to νX (signed comparison).",
    latex: "branch(\\nu_Y, \\mathbb{Z}_4(\\omega_A) \\leq \\mathbb{Z}_4(\\nu_X))",
    linkInGrayPaperReader: "https://graypaper.fluffylabs.dev/#/439ca37/250401250401",
  },
  {
    name: "branch_ge_s_imm",
    opcode: 45,
    description: "Branch to νY if ωA is greater than or equal to νX (signed comparison).",
    latex: "branch(\\nu_Y, \\mathbb{Z}_4(\\omega_A) \\geq \\mathbb{Z}_4(\\nu_X))",
    linkInGrayPaperReader: "https://graypaper.fluffylabs.dev/#/439ca37/250401250401",
  },
  {
    name: "branch_gt_s_imm",
    opcode: 53,
    description: "Branch to νY if ωA is greater than νX (signed comparison).",
    latex: "branch(\\nu_Y, \\mathbb{Z}_4(\\omega_A) > \\mathbb{Z}_4(\\nu_X))",
    linkInGrayPaperReader: "https://graypaper.fluffylabs.dev/#/439ca37/250401250401",
  },

  {
    name: "move_reg",
    opcode: 82,
    description:
      "Move the value from register ωA to register ω'D. Optionally, set ω'D to the minimum value in the set of natural numbers NR that is greater than or equal to h.",
    latex: "\\omega'_D = \\omega_A \\text{ or } \\omega'_D \\equiv \\min(x \\in \\mathbb{N}_R) : x \\geq h",
    linkInGrayPaperReader: "https://graypaper.fluffylabs.dev/#/439ca37/259902259902",
  },
  {
    name: "sbrk",
    opcode: 87,
    description: "Adjust the program's data space by moving the break value.",
    latex:
      "\\mathbb{N}_{x...+\\omega_A} \\notin \\mathbb{V}_\\mu \\text{ or } \\mathbb{N}_{x...+\\omega_A} \\in \\mathbb{V}^*_{\\mu'}",
    linkInGrayPaperReader: "https://graypaper.fluffylabs.dev/#/439ca37/259902259902",
  },

  {
    name: "store_ind_u8",
    opcode: 16,
    description: "Store an 8-bit unsigned value from register ωA into memory at the address (ωB + νX).",
    latex: "\\mu'_{\\omega_B + \\nu_X} = \\omega_A \\mod 2^8",
    linkInGrayPaperReader: "https://graypaper.fluffylabs.dev/#/439ca37/261000261000",
  },
  {
    name: "store_ind_u16",
    opcode: 29,
    description: "Store a 16-bit unsigned value from register ωA into memory at the address (ωB + νX).",
    latex: "\\mu'_{\\omega_B + \\nu_X...+2} = \\mathcal{E}_2(\\omega_A \\mod 2^{16})",
    linkInGrayPaperReader: "https://graypaper.fluffylabs.dev/#/439ca37/261000261000",
  },
  {
    name: "store_ind_u32",
    opcode: 3,
    description: "Store a 32-bit unsigned value from register ωA into memory at the address (ωB + νX).",
    latex: "\\mu'_{\\omega_B + \\nu_X...+4} = \\mathcal{E}_4(\\omega_A)",
    linkInGrayPaperReader: "https://graypaper.fluffylabs.dev/#/439ca37/261000261000",
  },
  {
    name: "load_ind_u8",
    opcode: 11,
    description: "Load an 8-bit unsigned value from memory at the address (ωB + νX) into register ω'A.",
    latex: "\\omega'_A = \\mu_{\\omega_B + \\nu_X}",
    linkInGrayPaperReader: "https://graypaper.fluffylabs.dev/#/439ca37/261000261000",
  },
  {
    name: "load_ind_i8",
    opcode: 21,
    description: "Load an 8-bit signed value from memory at the address (ωB + νX) into register ω'A.",
    latex: "\\omega'_A = \\mathbb{Z}_4^{-1}(\\mathbb{Z}_1(\\mu_{\\omega_B + \\nu_X}))",
    linkInGrayPaperReader: "https://graypaper.fluffylabs.dev/#/439ca37/261000261000",
  },
  {
    name: "load_ind_u16",
    opcode: 37,
    description: "Load a 16-bit unsigned value from memory at the address (ωB + νX) into register ω'A.",
    latex: "\\omega'_A = \\mathcal{E}_2^{-1}(\\mu_{\\omega_B + \\nu_X...+2})",
    linkInGrayPaperReader: "https://graypaper.fluffylabs.dev/#/439ca37/261000261000",
  },
  {
    name: "load_ind_i16",
    opcode: 33,
    description: "Load a 16-bit signed value from memory at the address (ωB + νX) into register ω'A.",
    latex: "\\omega'_A = \\mathbb{Z}_4^{-1}(\\mathbb{Z}_2(\\mathcal{E}_2^{-1}(\\mu_{\\omega_B + \\nu_X...+2})))",
    linkInGrayPaperReader: "https://graypaper.fluffylabs.dev/#/439ca37/261000261000",
  },
  {
    name: "load_ind_u32",
    opcode: 1,
    description: "Load a 32-bit unsigned value from memory at the address (ωB + νX) into register ω'A.",
    latex: "\\omega'_A = \\mathcal{E}_4^{-1}(\\mu_{\\omega_B + \\nu_X...+4})",
    linkInGrayPaperReader: "https://graypaper.fluffylabs.dev/#/439ca37/261000261000",
  },
  {
    name: "add_imm",
    opcode: 2,
    description: "Add immediate value νX to ωA and store the result in ω'B modulo 2^32.",
    latex: "\\omega'_B = (\\omega_A + \\nu_X) \\mod 2^{32}",
    linkInGrayPaperReader: "https://graypaper.fluffylabs.dev/#/439ca37/261000261000",
  },
  {
    name: "and_imm",
    opcode: 31,
    description: "Perform a bitwise AND between ωA and νX and store the result in ω'B.",
    latex:
      "\\forall i \\in \\mathbb{N}_{32}: \\mathbb{B}_4(\\omega'_B)_i = \\mathbb{B}_4(\\omega_A)_i \\land \\mathbb{B}_4(\\nu_X)_i",
    linkInGrayPaperReader: "https://graypaper.fluffylabs.dev/#/439ca37/261000261000",
  },
  {
    name: "xor_imm",
    opcode: 30,
    description: "Perform a bitwise XOR between ωA and νX and store the result in ω'B.",
    latex:
      "\\forall i \\in \\mathbb{N}_{32}: \\mathbb{B}_4(\\omega'_B)_i = \\mathbb{B}_4(\\omega_A)_i \\oplus \\mathbb{B}_4(\\nu_X)_i",
    linkInGrayPaperReader: "https://graypaper.fluffylabs.dev/#/439ca37/261000261000",
  },
  {
    name: "or_imm",
    opcode: 49,
    description: "Perform a bitwise OR between ωA and νX and store the result in ω'B.",
    latex:
      "\\forall i \\in \\mathbb{N}_{32}: \\mathbb{B}_4(\\omega'_B)_i = \\mathbb{B}_4(\\omega_A)_i \\lor \\mathbb{B}_4(\\nu_X)_i",
    linkInGrayPaperReader: "https://graypaper.fluffylabs.dev/#/439ca37/261000261000",
  },
  {
    name: "mul_imm",
    opcode: 35,
    description: "Multiply ωA by νX and store the result in ω'B modulo 2^32.",
    latex: "\\omega'_B = (\\omega_A \\times \\nu_X) \\mod 2^{32}",
    linkInGrayPaperReader: "https://graypaper.fluffylabs.dev/#/439ca37/261000261000",
  },
  {
    name: "mul_upper_s_s_imm",
    opcode: 65,
    description:
      "Multiply the signed value of ωA by the signed value of νX and store the upper half of the result in ω'B.",
    latex: "\\omega'_B = \\mathbb{Z}_4^{-1}((\\mathbb{Z}_4(\\omega_A) \\times \\mathbb{Z}_4(\\nu_X)) + 2^{32})",
    linkInGrayPaperReader: "https://graypaper.fluffylabs.dev/#/439ca37/261000261000",
  },
  {
    name: "mul_upper_u_u_imm",
    opcode: 63,
    description:
      "Multiply the unsigned value of ωA by the unsigned value of νX and store the upper half of the result in ω'B.",
    latex: "\\omega'_B = ((\\omega_A \\times \\nu_X) + 2^{32})",
    linkInGrayPaperReader: "https://graypaper.fluffylabs.dev/#/439ca37/261000261000",
  },
  {
    name: "set_lt_u_imm",
    opcode: 27,
    description: "Set ω'B to 1 if ωA is less than νX (unsigned comparison); otherwise, set it to 0.",
    latex: "\\omega'_B = \\omega_A < \\nu_X",
    linkInGrayPaperReader: "https://graypaper.fluffylabs.dev/#/439ca37/261000261000",
  },
  {
    name: "set_lt_s_imm",
    opcode: 56,
    description: "Set ω'B to 1 if ωA is less than νX (signed comparison); otherwise, set it to 0.",
    latex: "\\omega'_B = \\mathbb{Z}_4(\\omega_A) < \\mathbb{Z}_4(\\nu_X)",
    linkInGrayPaperReader: "https://graypaper.fluffylabs.dev/#/439ca37/261000261000",
  },
  {
    name: "shlo_l_imm",
    opcode: 9,
    description: "Shift ωA left by a value of (2 * νX) modulo 32 and store the result in ω'B.",
    latex: "\\omega'_B = (\\omega_A \\times 2^{\\nu_X} \\mod 32) \\mod 2^{32}",
    linkInGrayPaperReader: "https://graypaper.fluffylabs.dev/#/439ca37/261000261000",
  },
  {
    name: "shlo_r_imm",
    opcode: 14,
    description: "Shift ωA right by a value of (2 * νX) modulo 32 and store the result in ω'B.",
    latex: "\\omega'_B = (\\omega_A \\div 2^{\\nu_X} \\mod 32) \\mod 2^{32}",
    linkInGrayPaperReader: "https://graypaper.fluffylabs.dev/#/439ca37/261000261000",
  },
  {
    name: "shar_r_imm",
    opcode: 25,
    description: "Arithmetic shift right of ωA by νX and store the result in ω'B.",
    latex: "\\omega'_B = \\mathbb{Z}_4^{-1}(\\mathbb{Z}_4(\\omega_A) \\div 2^{\\nu_X \\mod 32})",
    linkInGrayPaperReader: "https://graypaper.fluffylabs.dev/#/439ca37/261000261000",
  },
  {
    name: "neg_add_imm",
    opcode: 40,
    description: "Add the two's complement of νX to ωA and store the result in ω'B modulo 2^32.",
    latex: "\\omega'_B = (\\nu_X + 2^{32} - \\omega_A) \\mod 2^{32}",
    linkInGrayPaperReader: "https://graypaper.fluffylabs.dev/#/439ca37/261000261000",
  },
  {
    name: "set_gt_u_imm",
    opcode: 39,
    description: "Set ω'B to 1 if ωA is greater than νX (unsigned comparison); otherwise, set it to 0.",
    latex: "\\omega'_B = \\omega_A > \\nu_X",
    linkInGrayPaperReader: "https://graypaper.fluffylabs.dev/#/439ca37/261000261000",
  },
  {
    name: "set_gt_s_imm",
    opcode: 61,
    description: "Set ω'B to 1 if ωA is greater than νX (signed comparison); otherwise, set it to 0.",
    latex: "\\omega'_B = \\mathbb{Z}_4(\\omega_A) > \\mathbb{Z}_4(\\nu_X)",
    linkInGrayPaperReader: "https://graypaper.fluffylabs.dev/#/439ca37/261000261000",
  },
  {
    name: "shlo_l_imm_alt",
    opcode: 75,
    description: "Alternative left shift of νX by 24 modulo 32 and store the result in ω'B.",
    latex: "\\omega'_B = (\\nu_X \\times 2^{24} \\mod 32) \\mod 2^{32}",
    linkInGrayPaperReader: "https://graypaper.fluffylabs.dev/#/439ca37/261000261000",
  },
  {
    name: "shlo_r_imm_alt",
    opcode: 72,
    description: "Alternative right shift of νX by 24 modulo 32 and store the result in ω'B.",
    latex: "\\omega'_B = (\\nu_X \\div 2^{24} \\mod 32) \\mod 2^{32}",
    linkInGrayPaperReader: "https://graypaper.fluffylabs.dev/#/439ca37/261000261000",
  },
  {
    name: "shar_r_imm_alt",
    opcode: 28,
    description: "Alternative arithmetic right shift of ωA by (νX mod 32) and store the result in ω'B.",
    latex: "\\omega'_B = \\mathbb{Z}_4^{-1}(\\mathbb{Z}_4(\\omega_A) \\div 2^{\\nu_X \\mod 32})",
    linkInGrayPaperReader: "https://graypaper.fluffylabs.dev/#/439ca37/261000261000",
  },
  {
    name: "cmov_iz_imm",
    opcode: 85,
    description: "Move νX to ω'A if ωB equals 0; otherwise, move ωA to ω'A.",
    latex:
      "\\omega'_A = \\begin{cases} \\nu_X & \\text{if } \\omega_B = 0 \\\\ \\omega_A & \\text{otherwise} \\end{cases}",
    linkInGrayPaperReader: "https://graypaper.fluffylabs.dev/#/439ca37/261000261000",
  },
  {
    name: "cmov_nz_imm",
    opcode: 86,
    description: "Move νX to ω'A if ωB does not equal 0; otherwise, move ωA to ω'A.",
    latex:
      "\\omega'_A = \\begin{cases} \\nu_X & \\text{if } \\omega_B \\neq 0 \\\\ \\omega_A & \\text{otherwise} \\end{cases}",
    linkInGrayPaperReader: "https://graypaper.fluffylabs.dev/#/439ca37/261000261000",
  },

  {
    name: "branch_eq",
    opcode: 24,
    description: "Branch to νX if ωA equals ωB.",
    latex: "branch(\\nu_X, \\omega_A = \\omega_B)",
    linkInGrayPaperReader: "https://graypaper.fluffylabs.dev/#/439ca37/26b00326b003",
  },
  {
    name: "branch_ne",
    opcode: 30,
    description: "Branch to νX if ωA does not equal ωB.",
    latex: "branch(\\nu_X, \\omega_A \\neq \\omega_B)",
    linkInGrayPaperReader: "https://graypaper.fluffylabs.dev/#/439ca37/26b00326b003",
  },
  {
    name: "branch_lt_u",
    opcode: 47,
    description: "Branch to νX if ωA is less than ωB (unsigned comparison).",
    latex: "branch(\\nu_X, \\omega_A < \\omega_B)",
    linkInGrayPaperReader: "https://graypaper.fluffylabs.dev/#/439ca37/26b00326b003",
  },
  {
    name: "branch_lt_s",
    opcode: 48,
    description: "Branch to νX if ωA is less than ωB (signed comparison).",
    latex: "branch(\\nu_X, \\mathbb{Z}_4(\\omega_A) < \\mathbb{Z}_4(\\omega_B))",
    linkInGrayPaperReader: "https://graypaper.fluffylabs.dev/#/439ca37/26b00326b003",
  },
  {
    name: "branch_ge_u",
    opcode: 41,
    description: "Branch to νX if ωA is greater than or equal to ωB (unsigned comparison).",
    latex: "branch(\\nu_X, \\omega_A \\geq \\omega_B)",
    linkInGrayPaperReader: "https://graypaper.fluffylabs.dev/#/439ca37/26b00326b003",
  },
  {
    name: "branch_ge_s",
    opcode: 43,
    description: "Branch to νX if ωA is greater than or equal to ωB (signed comparison).",
    latex: "branch(\\nu_X, \\mathbb{Z}_4(\\omega_A) \\geq \\mathbb{Z}_4(\\omega_B))",
    linkInGrayPaperReader: "https://graypaper.fluffylabs.dev/#/439ca37/26b00326b003",
  },

  {
    name: "load_imm_jump_ind",
    opcode: 42,
    description:
      "Perform an indirect jump to the address calculated as (ωB + νY) modulo 2^32 and load the immediate value νX into register ω'A.",
    latex: "djump((\\omega_B + \\nu_Y) \\mod 2^{32}), \\omega'_A = \\nu_X",
    linkInGrayPaperReader: "https://graypaper.fluffylabs.dev/#/439ca37/27be0027be00",
  },

  {
    name: "add",
    opcode: 6,
    description: "Add ωA and ωB and store the result in ω'D modulo 2^32.",
    latex: "\\omega'_D = (\\omega_A + \\omega_B) \\mod 2^{32}",
    linkInGrayPaperReader: "https://graypaper.fluffylabs.dev/#/439ca37/279b01279b01",
  },
  {
    name: "sub",
    opcode: 20,
    description: "Subtract ωB from ωA and store the result in ω'D modulo 2^32.",
    latex: "\\omega'_D = (\\omega_A + 2^{32} - \\omega_B) \\mod 2^{32}",
    linkInGrayPaperReader: "https://graypaper.fluffylabs.dev/#/439ca37/279b01279b01",
  },
  {
    name: "and",
    opcode: 23,
    description: "Perform a bitwise AND between ωA and ωB and store the result in ω'D.",
    latex:
      "\\forall i \\in \\mathbb{N}_{32}: \\mathbb{B}_4(\\omega'_D)_i = \\mathbb{B}_4(\\omega_A)_i \\land \\mathbb{B}_4(\\omega_B)_i",
    linkInGrayPaperReader: "https://graypaper.fluffylabs.dev/#/439ca37/279b01279b01",
  },
  {
    name: "xor",
    opcode: 28,
    description: "Perform a bitwise XOR between ωA and ωB and store the result in ω'D.",
    latex:
      "\\forall i \\in \\mathbb{N}_{32}: \\mathbb{B}_4(\\omega'_D)_i = \\mathbb{B}_4(\\omega_A)_i \\oplus \\mathbb{B}_4(\\omega_B)_i",
    linkInGrayPaperReader: "https://graypaper.fluffylabs.dev/#/439ca37/279b01279b01",
  },
  {
    name: "or",
    opcode: 12,
    description: "Perform a bitwise OR between ωA and ωB and store the result in ω'D.",
    latex:
      "\\forall i \\in \\mathbb{N}_{32}: \\mathbb{B}_4(\\omega'_D)_i = \\mathbb{B}_4(\\omega_A)_i \\lor \\mathbb{B}_4(\\omega_B)_i",
    linkInGrayPaperReader: "https://graypaper.fluffylabs.dev/#/439ca37/279b01279b01",
  },
  {
    name: "mul",
    opcode: 34,
    description: "Multiply ωA by ωB and store the result in ω'D modulo 2^32.",
    latex: "\\omega'_D = (\\omega_A \\times \\omega_B) \\mod 2^{32}",
    linkInGrayPaperReader: "https://graypaper.fluffylabs.dev/#/439ca37/279b01279b01",
  },
  {
    name: "mul_upper_s_s",
    opcode: 5,
    description: "Multiply the signed values of ωA and ωB, then store the upper half of the result in ω'D.",
    latex: "\\omega'_D = \\mathbb{Z}_4^{-1}((\\mathbb{Z}_4(\\omega_A) \\times \\mathbb{Z}_4(\\omega_B)) + 2^{32})",
    linkInGrayPaperReader: "https://graypaper.fluffylabs.dev/#/439ca37/279b01279b01",
  },
  {
    name: "mul_upper_u_u",
    opcode: 57,
    description: "Multiply the unsigned values of ωA and ωB, then store the upper half of the result in ω'D.",
    latex: "\\omega'_D = ((\\omega_A \\times \\omega_B) + 2^{32})",
    linkInGrayPaperReader: "https://graypaper.fluffylabs.dev/#/439ca37/279b01279b01",
  },
  {
    name: "mul_upper_s_u",
    opcode: 81,
    description:
      "Multiply the signed value of ωA by the unsigned value of ωB, then store the upper half of the result in ω'D.",
    latex: "\\omega'_D = \\mathbb{Z}_4^{-1}((\\mathbb{Z}_4(\\omega_A) \\times \\omega_B) + 2^{32})",
    linkInGrayPaperReader: "https://graypaper.fluffylabs.dev/#/439ca37/279b01279b01",
  },
  {
    name: "div_u",
    opcode: 68,
    description:
      "Divide the unsigned value of ωA by ωB and store the result in ω'D. If ωB is zero, store 2^32 - 1 instead.",
    latex:
      "\\omega'_D = \\begin{cases} 2^{32} - 1 & \\text{if } \\omega_B = 0 \\\\ \\frac{\\omega_A}{\\omega_B} & \\text{otherwise} \\end{cases}",
    linkInGrayPaperReader: "https://graypaper.fluffylabs.dev/#/439ca37/279b01279b01",
  },
  {
    name: "div_s",
    opcode: 64,
    description:
      "Divide the signed value of ωA by ωB and store the result in ω'D. If ωB is zero or if division would overflow, store ωA instead.",
    latex:
      "\\omega'_D = \\begin{cases} 2^{32} - 1 & \\text{if } \\omega_B = 0 \\\\ \\omega_A & \\text{if } \\mathbb{Z}_4(\\omega_A) = -2^{31} \\land \\mathbb{Z}_4(\\omega_B) = -1 \\\\ \\mathbb{Z}_4^{-1}(\\mathbb{Z}_4(\\omega_A) \\div \\mathbb{Z}_4(\\omega_B)) & \\text{otherwise} \\end{cases}",
    linkInGrayPaperReader: "https://graypaper.fluffylabs.dev/#/439ca37/279b01279b01",
  },
  {
    name: "rem_u",
    opcode: 73,
    description:
      "Compute the remainder of unsigned division of ωA by ωB and store the result in ω'D. If ωB is zero, store ωA instead.",
    latex:
      "\\omega'_D = \\begin{cases} \\omega_A & \\text{if } \\omega_B = 0 \\\\ \\omega_A \\mod \\omega_B & \\text{otherwise} \\end{cases}",
    linkInGrayPaperReader: "https://graypaper.fluffylabs.dev/#/439ca37/279b01279b01",
  },
  {
    name: "rem_s",
    opcode: 70,
    description:
      "Compute the remainder of signed division of ωA by ωB and store the result in ω'D. If ωB is zero or if division would overflow, store ωA instead.",
    latex:
      "\\omega'_D = \\begin{cases} \\omega_A & \\text{if } \\omega_B = 0 \\\\ 0 & \\text{if } \\mathbb{Z}_4(\\omega_A) = -2^{31} \\land \\mathbb{Z}_4(\\omega_B) = -1 \\\\ \\mathbb{Z}_4^{-1}(\\mathbb{Z}_4(\\omega_A) \\mod \\mathbb{Z}_4(\\omega_B)) & \\text{otherwise} \\end{cases}",
    linkInGrayPaperReader: "https://graypaper.fluffylabs.dev/#/439ca37/279b01279b01",
  },
  {
    name: "set_lt_u",
    opcode: 36,
    description: "Set ω'D to 1 if ωA is less than ωB (unsigned comparison); otherwise, set it to 0.",
    latex: "\\omega'_D = \\omega_A < \\omega_B",
    linkInGrayPaperReader: "https://graypaper.fluffylabs.dev/#/439ca37/279b01279b01",
  },
  {
    name: "set_lt_s",
    opcode: 58,
    description: "Set ω'D to 1 if ωA is less than ωB (signed comparison); otherwise, set it to 0.",
    latex: "\\omega'_D = \\mathbb{Z}_4(\\omega_A) < \\mathbb{Z}_4(\\omega_B)",
    linkInGrayPaperReader: "https://graypaper.fluffylabs.dev/#/439ca37/279b01279b01",
  },
  {
    name: "shlo_l",
    opcode: 55,
    description: "Shift ωA left by a value of (2 * ωB) modulo 32 and store the result in ω'D.",
    latex: "\\omega'_D = (\\omega_A \\times 2^{\\omega_B \\mod 32}) \\mod 2^{32}",
    linkInGrayPaperReader: "https://graypaper.fluffylabs.dev/#/439ca37/279b01279b01",
  },
  {
    name: "shlo_r",
    opcode: 51,
    description: "Shift ωA right by a value of (2 * ωB) modulo 32 and store the result in ω'D.",
    latex: "\\omega'_D = \\omega_A \\div 2^{\\omega_B \\mod 32}",
    linkInGrayPaperReader: "https://graypaper.fluffylabs.dev/#/439ca37/279b01279b01",
  },
  {
    name: "shar_r",
    opcode: 77,
    description: "Arithmetic shift right of ωA by ωB and store the result in ω'D.",
    latex: "\\omega'_D = \\mathbb{Z}_4^{-1}(\\mathbb{Z}_4(\\omega_A) \\div 2^{\\omega_B \\mod 32})",
    linkInGrayPaperReader: "https://graypaper.fluffylabs.dev/#/439ca37/279b01279b01",
  },
  {
    name: "cmov_iz",
    opcode: 83,
    description: "Move ωA to ω'D if ωB equals 0; otherwise, move ωD to ω'D.",
    latex:
      "\\omega'_D = \\begin{cases} \\omega_A & \\text{if } \\omega_B = 0 \\\\ \\omega_D & \\text{otherwise} \\end{cases}",
    linkInGrayPaperReader: "https://graypaper.fluffylabs.dev/#/439ca37/279b01279b01",
  },
  {
    name: "cmov_nz",
    opcode: 84,
    description: "Move ωA to ω'D if ωB does not equal 0; otherwise, move ωD to ω'D.",
    latex:
      "\\omega'_D = \\begin{cases} \\omega_A & \\text{if } \\omega_B \\neq 0 \\\\ \\omega_D & \\text{otherwise} \\end{cases}",
    linkInGrayPaperReader: "https://graypaper.fluffylabs.dev/#/439ca37/279b01279b01",
  },
];
