import { useMemo } from "react";
import type { ProgramEnvelope } from "@pvmdbg/types";
import {
  ProgramDecoder,
  BasicBlocks,
  args as argsModule,
} from "@typeberry/lib/pvm-interpreter";
import { INSTRUCTION_NAMES } from "../components/debugger/instruction-names";

const { ArgsDecoder, ArgumentType, instructionArgumentTypeMap, createResults } = argsModule;

export interface DecodedInstruction {
  pc: number;
  opcode: number;
  mnemonic: string;
  rawBytes: Uint8Array;
  args: string;
  /** Numeric-only argument string (register indices as numbers, no omega notation). */
  rawArgs: string;
  /** Index of the basic block this instruction belongs to (0-based). */
  blockIndex: number;
}

function regName(index: number): string {
  return `ω${index}`;
}

function formatImm(decoder: { getI32(): number }): string {
  return String(decoder.getI32());
}

function formatImmU(decoder: { getU32(): number }): string {
  return String(decoder.getU32());
}

function formatExtImm(decoder: { getValue(): bigint }): string {
  return String(decoder.getValue());
}

function formatOffset(pc: number): string {
  return `@0x${pc.toString(16)}`;
}

function formatArgsWithReg(
  argType: number,
  results: ReturnType<typeof createResults>,
  reg: (index: number) => string,
): string {
  const r = results[argType];
  switch (argType) {
    case ArgumentType.NO_ARGUMENTS:
      return "";

    case ArgumentType.ONE_IMMEDIATE: {
      const a = r as argsModule.OneImmediateArgs;
      return formatImmU(a.immediateDecoder);
    }

    case ArgumentType.TWO_IMMEDIATES: {
      const a = r as argsModule.TwoImmediatesArgs;
      return `${formatImm(a.firstImmediateDecoder)}, ${formatImm(a.secondImmediateDecoder)}`;
    }

    case ArgumentType.ONE_OFFSET: {
      const a = r as argsModule.OneOffsetArgs;
      return formatOffset(a.nextPc);
    }

    case ArgumentType.ONE_REGISTER_ONE_IMMEDIATE: {
      const a = r as argsModule.OneRegisterOneImmediateArgs;
      return `${reg(a.registerIndex)}, ${formatImm(a.immediateDecoder)}`;
    }

    case ArgumentType.ONE_REGISTER_TWO_IMMEDIATES: {
      const a = r as argsModule.OneRegisterTwoImmediatesArgs;
      return `${reg(a.registerIndex)}, ${formatImm(a.firstImmediateDecoder)}, ${formatImm(a.secondImmediateDecoder)}`;
    }

    case ArgumentType.ONE_REGISTER_ONE_IMMEDIATE_ONE_OFFSET: {
      const a = r as argsModule.OneRegisterOneImmediateOneOffsetArgs;
      return `${reg(a.registerIndex)}, ${formatImm(a.immediateDecoder)}, ${formatOffset(a.nextPc)}`;
    }

    case ArgumentType.TWO_REGISTERS: {
      const a = r as argsModule.TwoRegistersArgs;
      return `${reg(a.firstRegisterIndex)}, ${reg(a.secondRegisterIndex)}`;
    }

    case ArgumentType.TWO_REGISTERS_ONE_IMMEDIATE: {
      const a = r as argsModule.TwoRegistersOneImmediateArgs;
      return `${reg(a.firstRegisterIndex)}, ${reg(a.secondRegisterIndex)}, ${formatImm(a.immediateDecoder)}`;
    }

    case ArgumentType.TWO_REGISTERS_ONE_OFFSET: {
      const a = r as argsModule.TwoRegistersOneOffsetArgs;
      return `${reg(a.firstRegisterIndex)}, ${reg(a.secondRegisterIndex)}, ${formatOffset(a.nextPc)}`;
    }

    case ArgumentType.TWO_REGISTERS_TWO_IMMEDIATES: {
      const a = r as argsModule.TwoRegistersTwoImmediatesArgs;
      return `${reg(a.firstRegisterIndex)}, ${reg(a.secondRegisterIndex)}, ${formatImm(a.firstImmediateDecoder)}, ${formatImm(a.secondImmediateDecoder)}`;
    }

    case ArgumentType.THREE_REGISTERS: {
      const a = r as argsModule.ThreeRegistersArgs;
      return `${reg(a.firstRegisterIndex)}, ${reg(a.secondRegisterIndex)}, ${reg(a.thirdRegisterIndex)}`;
    }

    case ArgumentType.ONE_REGISTER_ONE_EXTENDED_WIDTH_IMMEDIATE: {
      const a = r as argsModule.OneRegisterOneExtendedWidthImmediateArgs;
      return `${reg(a.registerIndex)}, ${formatExtImm(a.immediateDecoder)}`;
    }

    default:
      return "";
  }
}

function formatArgs(argType: number, results: ReturnType<typeof createResults>): string {
  return formatArgsWithReg(argType, results, regName);
}

function formatRawArgs(argType: number, results: ReturnType<typeof createResults>): string {
  return formatArgsWithReg(argType, results, String);
}

function disassemble(programBytes: Uint8Array): DecodedInstruction[] {
  const result = ProgramDecoder.deblob(programBytes);
  if (!result.isOk) {
    return [];
  }

  const decoder = result.ok;
  const code = decoder.getCode();
  const mask = decoder.getMask();

  const blocks = new BasicBlocks();
  blocks.reset(code, mask);

  const argsDecoder = new ArgsDecoder();
  argsDecoder.reset(code, mask);
  const results = createResults();

  const instructions: DecodedInstruction[] = [];
  let currentBlockIndex = -1;

  // Use the mask to find instruction boundaries (consistent with the blob format).
  // For generic programs wrapped by encodePvmBlob, only byte 0 is marked
  // as an instruction start, producing a single instruction per the blob encoding.
  // For SPI programs, the full mask from the blob is available.
  let pc = 0;
  while (pc < code.length) {
    if (!mask.isInstruction(pc)) {
      pc++;
      continue;
    }

    if (blocks.isBeginningOfBasicBlock(pc)) {
      currentBlockIndex++;
    }

    const opcode = code[pc];
    const mnemonic = INSTRUCTION_NAMES[opcode] ?? `unknown(${opcode})`;

    // Determine instruction width from the mask: count bytes until next
    // instruction start (or end of code).
    let nextPc = pc + 1;
    while (nextPc < code.length && !mask.isInstruction(nextPc)) {
      nextPc++;
    }
    const instrLen = nextPc - pc;

    const argType = instructionArgumentTypeMap[opcode];
    let argsStr = "";
    let rawArgsStr = "";

    if (argType !== undefined) {
      try {
        const argResult = results[argType];
        argsDecoder.fillArgs(pc, argResult);
        argsStr = formatArgs(argType, results);
        rawArgsStr = formatRawArgs(argType, results);
      } catch {
        // If arg decoding fails, show instruction without decoded args
      }
    }

    const rawBytes = code.slice(pc, pc + instrLen);

    instructions.push({
      pc,
      opcode,
      mnemonic,
      rawBytes,
      args: argsStr,
      rawArgs: rawArgsStr,
      blockIndex: Math.max(0, currentBlockIndex),
    });

    pc = nextPc;
  }

  return instructions;
}

export function useDisassembly(envelope: ProgramEnvelope | null): DecodedInstruction[] {
  return useMemo(() => {
    if (!envelope) return [];
    return disassemble(envelope.programBytes);
  }, [envelope]);
}
