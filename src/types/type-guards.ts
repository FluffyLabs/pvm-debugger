import { Args, ArgumentType } from "@typeberry/pvm-debugger-adapter";
import { CurrentInstruction, TracesFile, HostCallTraceEntry, TraceVmState, TraceMemoryEntry } from "./pvm";
import { z } from "zod";

export function isInstructionError(
  instruction: CurrentInstruction,
): instruction is Extract<CurrentInstruction, { error: string }> {
  return "error" in instruction;
}

export function isOneImmediateArgs(args: Args): args is Extract<Args, { type: ArgumentType.ONE_IMMEDIATE }> {
  return args.type === ArgumentType.ONE_IMMEDIATE;
}

// Zod schemas for trace validation
const hexStringSchema = z.string().regex(/^0x[0-9a-fA-F]+$/, "Must be a valid hex string");

const traceMemoryEntrySchema = z.object({
  address: z.number().int().min(0),
  contents: hexStringSchema,
});

const traceVmStateSchema = z.object({
  gas: hexStringSchema.optional(),
  regs: z.record(z.string().regex(/^[0-9]+$/), hexStringSchema).optional(),
  memory: z.array(traceMemoryEntrySchema),
});

const hostCallTraceEntrySchema = z.object({
  ecalli: z.number().int().optional(),
  pc: z.number().int().optional(),
  before: traceVmStateSchema.optional(),
  after: traceVmStateSchema,
});

const tracesFileSchema = z.object({
  "initial-pc": z.number().int(),
  "initial-gas": hexStringSchema,
  "initial-args": hexStringSchema,
  "expected-gas": hexStringSchema.optional(),
  "expected-status": z.enum(["panic", "halt", "page-fault"]).optional(),
  "spi-program": hexStringSchema.optional(),
  "host-calls-trace": z.array(hostCallTraceEntrySchema),
});

// Export schemas for direct use
export { traceMemoryEntrySchema, traceVmStateSchema, hostCallTraceEntrySchema, tracesFileSchema };

// Validation functions using Zod schemas
export function isTraceMemoryEntry(value: unknown): value is TraceMemoryEntry {
  return traceMemoryEntrySchema.safeParse(value).success;
}

export function isTraceVmState(value: unknown): value is TraceVmState {
  return traceVmStateSchema.safeParse(value).success;
}

export function isHostCallTraceEntry(value: unknown): value is HostCallTraceEntry {
  return hostCallTraceEntrySchema.safeParse(value).success;
}

export function isTracesFile(value: unknown): value is TracesFile {
  return tracesFileSchema.safeParse(value).success;
}

// Validation function that returns detailed error information
export function validateTracesFile(
  value: unknown,
): { success: true; data: TracesFile } | { success: false; error: z.ZodError } {
  const result = tracesFileSchema.safeParse(value);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}
