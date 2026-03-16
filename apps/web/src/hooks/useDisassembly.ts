import { useMemo } from "react";
import type { ProgramEnvelope } from "@pvmdbg/types";
import {
  ProgramDecoder,
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

function formatArgs(argType: number, results: ReturnType<typeof createResults>): string {
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
      return `${regName(a.registerIndex)}, ${formatImm(a.immediateDecoder)}`;
    }

    case ArgumentType.ONE_REGISTER_TWO_IMMEDIATES: {
      const a = r as argsModule.OneRegisterTwoImmediatesArgs;
      return `${regName(a.registerIndex)}, ${formatImm(a.firstImmediateDecoder)}, ${formatImm(a.secondImmediateDecoder)}`;
    }

    case ArgumentType.ONE_REGISTER_ONE_IMMEDIATE_ONE_OFFSET: {
      const a = r as argsModule.OneRegisterOneImmediateOneOffsetArgs;
      return `${regName(a.registerIndex)}, ${formatImm(a.immediateDecoder)}, ${formatOffset(a.nextPc)}`;
    }

    case ArgumentType.TWO_REGISTERS: {
      const a = r as argsModule.TwoRegistersArgs;
      return `${regName(a.firstRegisterIndex)}, ${regName(a.secondRegisterIndex)}`;
    }

    case ArgumentType.TWO_REGISTERS_ONE_IMMEDIATE: {
      const a = r as argsModule.TwoRegistersOneImmediateArgs;
      return `${regName(a.firstRegisterIndex)}, ${regName(a.secondRegisterIndex)}, ${formatImm(a.immediateDecoder)}`;
    }

    case ArgumentType.TWO_REGISTERS_ONE_OFFSET: {
      const a = r as argsModule.TwoRegistersOneOffsetArgs;
      return `${regName(a.firstRegisterIndex)}, ${regName(a.secondRegisterIndex)}, ${formatOffset(a.nextPc)}`;
    }

    case ArgumentType.TWO_REGISTERS_TWO_IMMEDIATES: {
      const a = r as argsModule.TwoRegistersTwoImmediatesArgs;
      return `${regName(a.firstRegisterIndex)}, ${regName(a.secondRegisterIndex)}, ${formatImm(a.firstImmediateDecoder)}, ${formatImm(a.secondImmediateDecoder)}`;
    }

    case ArgumentType.THREE_REGISTERS: {
      const a = r as argsModule.ThreeRegistersArgs;
      return `${regName(a.firstRegisterIndex)}, ${regName(a.secondRegisterIndex)}, ${regName(a.thirdRegisterIndex)}`;
    }

    case ArgumentType.ONE_REGISTER_ONE_EXTENDED_WIDTH_IMMEDIATE: {
      const a = r as argsModule.OneRegisterOneExtendedWidthImmediateArgs;
      return `${regName(a.registerIndex)}, ${formatExtImm(a.immediateDecoder)}`;
    }

    default:
      return "";
  }
}

function disassemble(programBytes: Uint8Array): DecodedInstruction[] {
  const result = ProgramDecoder.deblob(programBytes);
  if (!result.isOk) {
    return [];
  }

  const decoder = result.ok;
  const code = decoder.getCode();
  const mask = decoder.getMask();

  const argsDecoder = new ArgsDecoder();
  argsDecoder.reset(code, mask);
  const results = createResults();

  const instructions: DecodedInstruction[] = [];

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

    if (argType !== undefined) {
      try {
        const argResult = results[argType];
        argsDecoder.fillArgs(pc, argResult);
        argsStr = formatArgs(argType, results);
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
