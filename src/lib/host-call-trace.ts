/**
 * ecalli / PVM IO Trace Parser and Types
 *
 * This module provides types and parsing utilities for the JIP-6 host call trace format.
 * The trace format is a human-readable, newline-delimited text format for recording
 * PVM execution including host calls (ecalli) and their effects.
 *
 * @see https://github.com/tomusdrw/JIPs/blob/td-jip6-ecalliloggin/JIP-6.md
 */

import { z } from "zod";

/** Register dump: mapping from register index to value */
export type RegisterDump = Map<number, bigint>;

/** Memory read operation during a host call */
export interface MemoryRead {
  address: number;
  length: number;
  data: Uint8Array;
}

/** Memory write operation during a host call */
export interface MemoryWrite {
  address: number;
  length: number;
  data: Uint8Array;
}

/** Register write operation during a host call */
export interface RegisterWrite {
  index: number;
  value: bigint;
}

/** Host call entry from trace */
export interface HostCallEntry {
  /** Host call index (ecalli operand) */
  index: number;
  /** Program counter at the ecalli instruction */
  pc: number;
  /** Gas before executing the host call */
  gas: bigint;
  /** Register state before the host call (non-zero registers only) */
  registers: RegisterDump;
  /** Memory reads performed during the host call */
  memoryReads: MemoryRead[];
  /** Memory writes performed during the host call */
  memoryWrites: MemoryWrite[];
  /** Register writes performed during the host call */
  registerWrites: RegisterWrite[];
  /** Gas value after the host call (from setgas) */
  gasAfter: bigint | null;
  /** Raw line number in the trace file for error reporting */
  lineNumber: number;
}

/** Initial execution state from 'start' entry */
export interface StartEntry {
  pc: number;
  gas: bigint;
  registers: RegisterDump;
}

/** Program prelude from trace */
export interface TracePrelude {
  /** Hex-encoded program blob */
  program: string | null;
  /** Initial execution state (pc, gas, registers) from 'start' entry */
  start: StartEntry | null;
  /** Initial memory writes before execution */
  initialMemoryWrites: MemoryWrite[];
}

/** Termination reason */
export type TerminationReason = { type: "HALT" } | { type: "PANIC"; argument: number } | { type: "OOG" };

/** Termination entry from trace */
export interface TerminationEntry {
  reason: TerminationReason;
  pc: number;
  gas: bigint;
  registers: RegisterDump;
  lineNumber: number;
}

/** Complete parsed trace */
export interface ParsedTrace {
  /** Context lines (implementation metadata, etc.) */
  contextLines: string[];
  /** Program and initial memory state */
  prelude: TracePrelude;
  /** Host call entries in execution order */
  hostCalls: HostCallEntry[];
  /** Termination entry (if present) */
  termination: TerminationEntry | null;
  /** Parse errors encountered */
  errors: TraceParseError[];
}

/** Parse error with location information */
export interface TraceParseError {
  lineNumber: number;
  line: string;
  message: string;
}

/**
 * Result of looking up a host call entry for the current PVM state
 */
export interface HostCallLookupResult {
  /** The matching entry, if found */
  entry: HostCallEntry | null;
  /** Mismatches between PVM state and trace entry */
  mismatches: StateMismatch[];
}

/** A mismatch between PVM state and trace entry */
export interface StateMismatch {
  field: "index" | "gas" | "register" | "memread";
  expected: string;
  actual: string;
  details?: string;
}

// ============================================================================
// Zod Validation Schemas
// ============================================================================

/** Zod schema for MemoryRead */
const MemoryReadSchema = z.object({
  address: z.number(),
  length: z.number(),
  data: z.instanceof(Uint8Array),
});

/** Zod schema for MemoryWrite */
const MemoryWriteSchema = z.object({
  address: z.number(),
  length: z.number(),
  data: z.instanceof(Uint8Array),
});

/** Zod schema for RegisterWrite */
const RegisterWriteSchema = z.object({
  index: z.number(),
  value: z.bigint(),
});

/** Zod schema for HostCallEntry */
const HostCallEntrySchema = z.object({
  index: z.number(),
  pc: z.number(),
  gas: z.bigint(),
  registers: z.instanceof(Map),
  memoryReads: z.array(MemoryReadSchema),
  memoryWrites: z.array(MemoryWriteSchema),
  registerWrites: z.array(RegisterWriteSchema),
  gasAfter: z.bigint().nullable(),
  lineNumber: z.number(),
});

/** Zod schema for StartEntry */
const StartEntrySchema = z.object({
  pc: z.number(),
  gas: z.bigint(),
  registers: z.instanceof(Map),
});

/** Zod schema for TracePrelude */
const TracePreludeSchema = z.object({
  program: z.string().nullable(),
  start: StartEntrySchema.nullable(),
  initialMemoryWrites: z.array(MemoryWriteSchema),
});

/** Zod schema for TerminationReason */
const TerminationReasonSchema = z.union([
  z.object({ type: z.literal("HALT") }),
  z.object({ type: z.literal("PANIC"), argument: z.number() }),
  z.object({ type: z.literal("OOG") }),
]);

/** Zod schema for TerminationEntry */
const TerminationEntrySchema = z.object({
  reason: TerminationReasonSchema,
  pc: z.number(),
  gas: z.bigint(),
  registers: z.instanceof(Map),
  lineNumber: z.number(),
});

/** Zod schema for TraceParseError */
const TraceParseErrorSchema = z.object({
  lineNumber: z.number(),
  line: z.string(),
  message: z.string(),
});

/** Zod schema for ParsedTrace */
const ParsedTraceSchema = z.object({
  contextLines: z.array(z.string()),
  prelude: TracePreludeSchema,
  hostCalls: z.array(HostCallEntrySchema),
  termination: TerminationEntrySchema.nullable(),
  errors: z.array(TraceParseErrorSchema),
});

/**
 * Validate a parsed trace structure using Zod
 * @param trace The parsed trace to validate
 * @returns Zod safe parse result
 */
export function validateParsedTrace(trace: unknown) {
  return ParsedTraceSchema.safeParse(trace);
}

/**
 * Validate trace content string and return detailed validation result
 * @param content The trace content to validate
 * @returns Object containing validation result and any errors
 */
export function validateTraceContent(content: string): {
  success: boolean;
  errors: TraceParseError[];
  parseErrors?: z.ZodError;
} {
  const parsed = parseTrace(content);

  // Check for parse errors first
  if (parsed.errors.length > 0) {
    return { success: false, errors: parsed.errors };
  }

  // Validate structure with Zod
  const validation = validateParsedTrace(parsed);
  if (!validation.success) {
    return {
      success: false,
      errors: parsed.errors,
      parseErrors: validation.error,
    };
  }

  return { success: true, errors: [] };
}

// ============================================================================
// Parsing utilities
// ============================================================================

/**
 * Parse a hex-encoded string (0x-prefixed) to Uint8Array
 */
function parseHexBytes(hex: string): Uint8Array {
  if (!hex.startsWith("0x")) {
    throw new Error(`Expected 0x prefix: ${hex}`);
  }
  const clean = hex.slice(2);
  if (clean.length % 2 !== 0) {
    throw new Error(`Invalid hex length: ${hex}`);
  }
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

/**
 * Parse a hex-encoded 32-bit address
 */
function parseAddress(hex: string): number {
  if (!hex.startsWith("0x")) {
    throw new Error(`Expected 0x prefix for address: ${hex}`);
  }
  return parseInt(hex, 16);
}

/**
 * Parse a hex-encoded 64-bit value (for registers)
 */
function parseHexValue(hex: string): bigint {
  if (!hex.startsWith("0x")) {
    throw new Error(`Expected 0x prefix for value: ${hex}`);
  }
  return BigInt(hex);
}

/**
 * Parse register dump from space-separated r{idx}={value} pairs
 */
function parseRegisterDump(parts: string[]): RegisterDump {
  const registers = new Map<number, bigint>();
  for (const part of parts) {
    const match = part.match(/^r(\d+)=(0x[0-9a-fA-F]+)$/);
    if (match) {
      const idx = parseInt(match[1], 10);
      const value = parseHexValue(match[2]);
      registers.set(idx, value);
    }
  }
  return registers;
}

/**
 * Parse an ecalli line
 * Format: ecalli={index} pc={pc} gas={gas} {register-dump}
 */
function parseEcalliLine(
  line: string,
  lineNumber: number,
): Omit<HostCallEntry, "memoryReads" | "memoryWrites" | "registerWrites" | "gasAfter"> | null {
  const match = line.match(/ecalli=(\d+)\s+pc=(\d+)\s+gas=(\d+)\s*(.*)/);
  if (!match) return null;

  const [, indexStr, pcStr, gasStr, regDump] = match;
  const registers = parseRegisterDump(regDump.trim().split(/\s+/).filter(Boolean));

  return {
    index: parseInt(indexStr, 10),
    pc: parseInt(pcStr, 10),
    gas: BigInt(gasStr),
    registers,
    lineNumber,
  };
}

/**
 * Parse a memread line
 * Format: memread {hex-address} len={length} -> {hex-data}
 */
function parseMemreadLine(line: string): MemoryRead | null {
  const match = line.match(/memread\s+(0x[0-9a-fA-F]+)\s+len=(\d+)\s+->\s+(0x[0-9a-fA-F]*)/);
  if (!match) return null;

  const [, addrHex, lenStr, dataHex] = match;
  const address = parseAddress(addrHex);
  const length = parseInt(lenStr, 10);
  const data = parseHexBytes(dataHex);

  // Validate that data length matches declared length
  if (data.length !== length) {
    throw new Error(
      `memread length mismatch at 0x${address.toString(16)}: declared len=${length}, actual data length=${data.length}`,
    );
  }

  return {
    address,
    length,
    data,
  };
}

/**
 * Parse a memwrite line
 * Format: memwrite {hex-address} len={length} <- {hex-data}
 */
function parseMemwriteLine(line: string): MemoryWrite | null {
  const match = line.match(/memwrite\s+(0x[0-9a-fA-F]+)\s+len=(\d+)\s+<-\s+(0x[0-9a-fA-F]*)/);
  if (!match) return null;

  const [, addrHex, lenStr, dataHex] = match;
  const address = parseAddress(addrHex);
  const length = parseInt(lenStr, 10);
  const data = parseHexBytes(dataHex);

  // Validate that data length matches declared length
  if (data.length !== length) {
    throw new Error(
      `memwrite length mismatch at 0x${address.toString(16)}: declared len=${length}, actual data length=${data.length}`,
    );
  }

  return {
    address,
    length,
    data,
  };
}

/**
 * Parse a setreg line
 * Format: setreg r{idx} <- {hex-value}
 */
function parseSetregLine(line: string): RegisterWrite | null {
  const match = line.match(/setreg\s+r(\d+)\s+<-\s+(0x[0-9a-fA-F]+)/);
  if (!match) return null;

  const [, idxStr, valueHex] = match;
  return {
    index: parseInt(idxStr, 10),
    value: parseHexValue(valueHex),
  };
}

/**
 * Parse a setgas line
 * Format: setgas <- {gas}
 */
function parseSetgasLine(line: string): bigint | null {
  const match = line.match(/setgas\s+<-\s+(\d+)/);
  if (!match) return null;
  return BigInt(match[1]);
}

/**
 * Parse a program line
 * Format: program {hex-encoded-program}
 */
function parseProgramLine(line: string): string | null {
  const match = line.match(/program\s+(0x[0-9a-fA-F]+)/);
  if (!match) return null;
  return match[1];
}

/**
 * Parse a start entry line
 * Format: start pc={pc} gas={gas} {register-dump}
 */
function parseStartLine(line: string): StartEntry | null {
  const match = line.match(/start\s+pc=(\d+)\s+gas=(\d+)\s*(.*)/);
  if (!match) return null;

  const [, pcStr, gasStr, regDump] = match;
  return {
    pc: parseInt(pcStr, 10),
    gas: BigInt(gasStr),
    registers: parseRegisterDump(regDump.trim().split(/\s+/).filter(Boolean)),
  };
}

/**
 * Parse a termination line
 * Format: HALT pc={pc} gas={gas} {register-dump}
 *         PANIC={arg} pc={pc} gas={gas} {register-dump}
 *         OOG pc={pc} gas={gas} {register-dump}
 */
function parseTerminationLine(line: string, lineNumber: number): TerminationEntry | null {
  // HALT
  let match = line.match(/HALT\s+pc=(\d+)\s+gas=(\d+)\s*(.*)/);
  if (match) {
    const [, pcStr, gasStr, regDump] = match;
    return {
      reason: { type: "HALT" },
      pc: parseInt(pcStr, 10),
      gas: BigInt(gasStr),
      registers: parseRegisterDump(regDump.trim().split(/\s+/).filter(Boolean)),
      lineNumber,
    };
  }

  // PANIC
  match = line.match(/PANIC=(\d+)\s+pc=(\d+)\s+gas=(\d+)\s*(.*)/);
  if (match) {
    const [, argStr, pcStr, gasStr, regDump] = match;
    return {
      reason: { type: "PANIC", argument: parseInt(argStr, 10) },
      pc: parseInt(pcStr, 10),
      gas: BigInt(gasStr),
      registers: parseRegisterDump(regDump.trim().split(/\s+/).filter(Boolean)),
      lineNumber,
    };
  }

  // OOG
  match = line.match(/OOG\s+pc=(\d+)\s+gas=(\d+)\s*(.*)/);
  if (match) {
    const [, pcStr, gasStr, regDump] = match;
    return {
      reason: { type: "OOG" },
      pc: parseInt(pcStr, 10),
      gas: BigInt(gasStr),
      registers: parseRegisterDump(regDump.trim().split(/\s+/).filter(Boolean)),
      lineNumber,
    };
  }

  return null;
}

/**
 * Parse a complete JIP-6 trace file
 */
export function parseTrace(content: string): ParsedTrace {
  const lines = content.split("\n");
  const result: ParsedTrace = {
    contextLines: [],
    prelude: {
      program: null,
      start: null,
      initialMemoryWrites: [],
    },
    hostCalls: [],
    termination: null,
    errors: [],
  };

  let currentHostCall: HostCallEntry | null = null;
  let inPrelude = true;

  for (let i = 0; i < lines.length; i++) {
    const lineNumber = i + 1;
    const line = lines[i].trim();

    // Skip empty lines
    if (!line) continue;

    try {
      // Check for program line (prelude)
      const program = parseProgramLine(line);
      if (program !== null) {
        result.prelude.program = program;
        continue;
      }

      // Check for start entry in prelude: start pc={pc} gas={gas} {register-dump}
      if (inPrelude) {
        const startEntry = parseStartLine(line);
        if (startEntry) {
          result.prelude.start = startEntry;
          continue;
        }
      }

      // Check for termination line
      const termination = parseTerminationLine(line, lineNumber);
      if (termination) {
        // Finalize any pending host call
        if (currentHostCall) {
          result.hostCalls.push(currentHostCall);
          currentHostCall = null;
        }
        result.termination = termination;
        continue;
      }

      // Check for ecalli line (starts a new host call entry)
      const ecalli = parseEcalliLine(line, lineNumber);
      if (ecalli) {
        // Finalize any pending host call
        if (currentHostCall) {
          result.hostCalls.push(currentHostCall);
        }
        inPrelude = false;
        currentHostCall = {
          ...ecalli,
          memoryReads: [],
          memoryWrites: [],
          registerWrites: [],
          gasAfter: null,
        };
        continue;
      }

      // Check for memwrite line
      const memwrite = parseMemwriteLine(line);
      if (memwrite) {
        if (inPrelude) {
          result.prelude.initialMemoryWrites.push(memwrite);
        } else if (currentHostCall) {
          currentHostCall.memoryWrites.push(memwrite);
        }
        continue;
      }

      // Check for memread line (only valid within host call)
      const memread = parseMemreadLine(line);
      if (memread) {
        if (currentHostCall) {
          currentHostCall.memoryReads.push(memread);
        }
        continue;
      }

      // Check for setreg line (only valid within host call)
      const setreg = parseSetregLine(line);
      if (setreg) {
        if (currentHostCall) {
          currentHostCall.registerWrites.push(setreg);
        }
        continue;
      }

      // Check for setgas line (only valid within host call)
      const setgas = parseSetgasLine(line);
      if (setgas !== null) {
        if (currentHostCall) {
          currentHostCall.gasAfter = setgas;
        }
        continue;
      }

      // If we're in prelude and the line doesn't match any known format,
      // treat it as a context line
      if (inPrelude && !line.startsWith("memwrite") && !line.startsWith("program")) {
        result.contextLines.push(line);
      }
    } catch (e) {
      result.errors.push({
        lineNumber,
        line,
        message: e instanceof Error ? e.message : String(e),
      });
    }
  }

  // Finalize any pending host call
  if (currentHostCall) {
    result.hostCalls.push(currentHostCall);
  }

  return result;
}

/**
 * Serialize a trace back to string format
 */
export function serializeTrace(trace: ParsedTrace): string {
  const lines: string[] = [];

  // Context lines
  for (const line of trace.contextLines) {
    lines.push(line);
  }

  // Program
  if (trace.prelude.program) {
    lines.push(`program ${trace.prelude.program}`);
  }

  // Initial memory writes
  for (const mw of trace.prelude.initialMemoryWrites) {
    lines.push(formatMemwrite(mw));
  }

  // Start entry (initial execution state)
  if (trace.prelude.start) {
    lines.push(formatStart(trace.prelude.start));
  }

  // Add blank line before host calls if we have prelude content
  if (lines.length > 0 && trace.hostCalls.length > 0) {
    lines.push("");
  }

  // Host calls
  for (const hc of trace.hostCalls) {
    lines.push(formatEcalli(hc));

    for (const mr of hc.memoryReads) {
      lines.push(formatMemread(mr));
    }

    for (const mw of hc.memoryWrites) {
      lines.push(formatMemwrite(mw));
    }

    for (const rw of hc.registerWrites) {
      lines.push(formatSetreg(rw));
    }

    if (hc.gasAfter !== null) {
      lines.push(`setgas <- ${hc.gasAfter}`);
    }

    lines.push(""); // Blank line between host calls
  }

  // Termination
  if (trace.termination) {
    lines.push(formatTermination(trace.termination));
  }

  return lines.join("\n");
}

function formatMemwrite(mw: MemoryWrite): string {
  const addrHex = "0x" + mw.address.toString(16).padStart(8, "0");
  const dataHex =
    "0x" +
    Array.from(mw.data)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  return `memwrite ${addrHex} len=${mw.length} <- ${dataHex}`;
}

function formatMemread(mr: MemoryRead): string {
  const addrHex = "0x" + mr.address.toString(16).padStart(8, "0");
  const dataHex =
    "0x" +
    Array.from(mr.data)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  return `memread ${addrHex} len=${mr.length} -> ${dataHex}`;
}

function formatSetreg(rw: RegisterWrite): string {
  const idxStr = rw.index.toString().padStart(2, "0");
  const valueHex = "0x" + rw.value.toString(16);
  return `setreg r${idxStr} <- ${valueHex}`;
}

function formatStart(start: StartEntry): string {
  const regParts: string[] = [];
  const sortedRegs = Array.from(start.registers.entries()).sort((a, b) => a[0] - b[0]);
  for (const [idx, value] of sortedRegs) {
    if (value !== 0n) {
      const idxStr = idx.toString().padStart(2, "0");
      regParts.push(`r${idxStr}=0x${value.toString(16)}`);
    }
  }
  const regDump = regParts.join(" ");
  return `start pc=${start.pc} gas=${start.gas}${regDump ? " " + regDump : ""}`;
}

function formatEcalli(hc: HostCallEntry): string {
  const regParts: string[] = [];
  const sortedRegs = Array.from(hc.registers.entries()).sort((a, b) => a[0] - b[0]);
  for (const [idx, value] of sortedRegs) {
    if (value !== 0n) {
      const idxStr = idx.toString().padStart(2, "0");
      regParts.push(`r${idxStr}=0x${value.toString(16)}`);
    }
  }
  const regDump = regParts.join(" ");
  return `ecalli=${hc.index} pc=${hc.pc} gas=${hc.gas}${regDump ? " " + regDump : ""}`;
}

function formatTermination(term: TerminationEntry): string {
  const regParts: string[] = [];
  const sortedRegs = Array.from(term.registers.entries()).sort((a, b) => a[0] - b[0]);
  for (const [idx, value] of sortedRegs) {
    if (value !== 0n) {
      const idxStr = idx.toString().padStart(2, "0");
      regParts.push(`r${idxStr}=0x${value.toString(16)}`);
    }
  }
  const regDump = regParts.join(" ");

  switch (term.reason.type) {
    case "HALT":
      return `HALT pc=${term.pc} gas=${term.gas}${regDump ? " " + regDump : ""}`;
    case "PANIC":
      return `PANIC=${term.reason.argument} pc=${term.pc} gas=${term.gas}${regDump ? " " + regDump : ""}`;
    case "OOG":
      return `OOG pc=${term.pc} gas=${term.gas}${regDump ? " " + regDump : ""}`;
  }
}

/**
 * Find a host call entry matching the current PVM state.
 * Returns the entry and any mismatches found.
 *
 * @param trace The parsed trace
 * @param indexInTrace Current host call index in the trace
 * @param pc Current program counter
 * @param gas Current gas
 * @param registers Current register values
 * @param hostCallIndex The ecalli index being executed
 * @param readMemory Function to read memory for comparison
 */
function collectStateMismatches(
  entry: HostCallEntry,
  registers: bigint[],
  gas: bigint,
  readMemory?: (address: number, length: number) => Uint8Array | null,
): StateMismatch[] {
  const mismatches: StateMismatch[] = [];

  if (entry.gas !== gas) {
    mismatches.push({
      field: "gas",
      expected: entry.gas.toString(),
      actual: gas.toString(),
    });
  }

  for (const [idx, expectedValue] of entry.registers) {
    const actualValue = registers[idx] ?? 0n;
    if (expectedValue !== actualValue) {
      mismatches.push({
        field: "register",
        expected: `r${idx}=0x${expectedValue.toString(16)}`,
        actual: `r${idx}=0x${actualValue.toString(16)}`,
        details: `Register ${idx}`,
      });
    }
  }

  if (readMemory) {
    for (const mr of entry.memoryReads) {
      const actualData = readMemory(mr.address, mr.length);
      if (actualData) {
        const expectedHex = Array.from(mr.data)
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("");
        const actualHex = Array.from(actualData)
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("");
        if (expectedHex !== actualHex) {
          mismatches.push({
            field: "memread",
            expected: `0x${expectedHex}`,
            actual: `0x${actualHex}`,
            details: `Memory at 0x${mr.address.toString(16)} (${mr.length} bytes)`,
          });
        }
      }
    }
  }

  return mismatches;
}

export function findHostCallEntry(
  trace: ParsedTrace,
  indexInTrace: number,
  pc: number,
  gas: bigint,
  registers: bigint[],
  hostCallIndex: number,
  readMemory?: (address: number, length: number) => Uint8Array | null,
): HostCallLookupResult {
  const remainingEntries = trace.hostCalls.slice(indexInTrace);

  const exactIndexMatch = remainingEntries.find((hc) => hc.index === hostCallIndex && hc.pc === pc);

  if (exactIndexMatch) {
    const mismatches = collectStateMismatches(exactIndexMatch, registers, gas, readMemory);
    return { entry: exactIndexMatch, mismatches };
  }

  const matchingEntries = remainingEntries.filter((hc) => hc.pc === pc && hc.gas <= gas);

  if (matchingEntries.length === 0) {
    return { entry: null, mismatches: [] };
  }

  const entry = matchingEntries[0];
  const mismatches: StateMismatch[] = [];

  if (entry.index !== hostCallIndex) {
    mismatches.push({
      field: "index",
      expected: entry.index.toString(),
      actual: hostCallIndex.toString(),
    });
  }

  mismatches.push(...collectStateMismatches(entry, registers, gas, readMemory));

  return { entry, mismatches };
}

/**
 * Serialize a single host call entry to its textual format
 */
export function serializeHostCallEntry(hc: HostCallEntry): string {
  const lines: string[] = [];

  lines.push(formatEcalli(hc));

  for (const mr of hc.memoryReads) {
    lines.push(formatMemread(mr));
  }

  for (const mw of hc.memoryWrites) {
    lines.push(formatMemwrite(mw));
  }

  for (const rw of hc.registerWrites) {
    lines.push(formatSetreg(rw));
  }

  if (hc.gasAfter !== null) {
    lines.push(`setgas <- ${hc.gasAfter}`);
  }

  return lines.join("\n");
}

/**
 * Validate trace content and return errors
 */
export function validateTrace(content: string): TraceParseError[] {
  const parsed = parseTrace(content);
  return parsed.errors;
}

/**
 * Check if trace content is valid
 */
export function isValidTrace(content: string): boolean {
  return validateTrace(content).length === 0;
}

/**
 * Get summary statistics for a trace
 */
export function getTraceSummary(trace: ParsedTrace): {
  hostCallCount: number;
  hasProgram: boolean;
  hasTermination: boolean;
  errorCount: number;
} {
  return {
    hostCallCount: trace.hostCalls.length,
    hasProgram: trace.prelude.program !== null,
    hasTermination: trace.termination !== null,
    errorCount: trace.errors.length,
  };
}
