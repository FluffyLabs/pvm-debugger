import { mapUploadFileInputToOutput } from "./utils";
import * as bytes from "@typeberry/lib/bytes";
import * as pvm from "@typeberry/lib/pvm-interpreter";
import { DEFAULT_GAS, DEFAULT_REGS, ExpectedState, MemoryChunkItem, PageMapItem } from "@/types/pvm.ts";
import { type ZodSafeParseResult, z } from "zod";
import { bigUint64ArrayToRegistersArray, getAsChunks, getAsPageMap } from "@/lib/utils.ts";
import { decodeSpiWithMetadata } from "@/utils/spi";
import { ProgramUploadFileInput, ProgramUploadFileOutput } from "./types";
import { parseTrace } from "@/lib/host-call-trace";

export interface LoadFileResult {
  output: ProgramUploadFileOutput;
  traceContent?: string;
}

type RawProgramUploadFileInput = unknown;
type ValidationResult = ZodSafeParseResult<ProgramUploadFileInput>;

const validateJsonTestCaseSchema = (json: RawProgramUploadFileInput): ValidationResult => {
  const pageMapSchema = z.object({
    address: z.number(),
    length: z.number(),
    "is-writable": z.boolean(),
  });

  const memorySchema = z.object({
    address: z.number(),
    contents: z.array(z.number()),
  });

  const schema: z.ZodType<ProgramUploadFileInput> = z.object({
    name: z.string(),
    "initial-regs": z.array(z.number()).length(13),
    "initial-pc": z.number(),
    "initial-page-map": z.array(pageMapSchema),
    "initial-memory": z.array(memorySchema),
    "initial-gas": z.number(),
    program: z.array(z.number()),
    "expected-status": z.string(),
    "expected-regs": z.array(z.number()),
    "expected-pc": z.number(),
    "expected-memory": z.array(memorySchema),
    "expected-gas": z.number(),
  });

  return schema.safeParse(json);
};

const MAX_SPI_ARGS_SIZE = 16 * 1024 * 1024; // 16 MiB

function buildSpiArgsFromMemoryWrites(memoryWrites: { address: number; data: Uint8Array }[]): Uint8Array {
  if (memoryWrites.length === 0) {
    return new Uint8Array();
  }

  const sorted = [...memoryWrites].sort((a, b) => a.address - b.address);
  const firstAddr = sorted[0].address;
  const lastWrite = sorted[sorted.length - 1];
  const lastAddr = lastWrite.address + lastWrite.data.length;
  const totalSize = lastAddr - firstAddr;

  if (totalSize > MAX_SPI_ARGS_SIZE) {
    throw new Error(`Trace memory span too large: ${totalSize} bytes (max: ${MAX_SPI_ARGS_SIZE})`);
  }

  const result = new Uint8Array(totalSize);
  for (const mw of sorted) {
    const offset = mw.address - firstAddr;
    result.set(mw.data, offset);
  }

  return result;
}

function tryParseTraceFile(content: string, fileName: string, initialState: ExpectedState): LoadFileResult | null {
  const trace = parseTrace(content);

  // Reject traces with parse errors
  if (trace.errors.length > 0) {
    console.warn("Trace parse errors:", trace.errors);
    return null;
  }

  if (!trace.prelude.program) {
    return null;
  }

  const programHex = trace.prelude.program;
  let programBytes: Uint8Array;
  try {
    programBytes = bytes.BytesBlob.parseBlob(programHex).raw;
  } catch {
    return null;
  }

  let spiArgs: Uint8Array;
  try {
    spiArgs = buildSpiArgsFromMemoryWrites(trace.prelude.initialMemoryWrites);
  } catch (e) {
    console.warn("Trace memory span too large for SPI args:", e);
    return null;
  }

  let spi = null;
  try {
    spi = decodeSpiWithMetadata(programBytes, spiArgs);
  } catch (e) {
    console.warn("Trace program is not SPI:", e);
  }

  if (spi !== null) {
    const { code, memory, registers, metadata } = spi;
    const pageMap: PageMapItem[] = getAsPageMap(memory);
    const chunks: MemoryChunkItem[] = getAsChunks(memory);

    const pc = trace.prelude.start?.pc ?? initialState.pc ?? 0;
    const gas = trace.prelude.start?.gas ?? initialState.gas ?? DEFAULT_GAS;

    return {
      output: {
        program: Array.from(code),
        name: `${fileName} [trace+spi]`,
        spiProgram: {
          program: programBytes,
          hasMetadata: metadata !== undefined,
        },
        kind: "Ecalli Trace (SPI)",
        initial: {
          regs: bigUint64ArrayToRegistersArray(registers),
          pc,
          pageMap,
          memory: chunks,
          gas,
        },
        spiArgs,
      },
      traceContent: content,
    };
  }

  let program = null;
  try {
    program = pvm.Program.fromGeneric(programBytes, false);
  } catch (e) {
    console.warn("Trace program is not generic PVM:", e);
  }

  if (program !== null) {
    const memory: MemoryChunkItem[] = trace.prelude.initialMemoryWrites.map((mw) => ({
      address: mw.address,
      contents: Array.from(mw.data),
    }));

    // Generate pageMap entries for all pages spanned by memory chunks
    const pageMap: PageMapItem[] = memory.flatMap((chunk) => {
      const startPage = Math.floor(chunk.address / 4096);
      const endAddr = chunk.address + chunk.contents.length;
      const endPage = Math.floor((endAddr - 1) / 4096);

      const pages: PageMapItem[] = [];
      for (let pageIdx = startPage; pageIdx <= endPage; pageIdx++) {
        pages.push({
          address: pageIdx * 4096,
          length: 4096,
          "is-writable": true,
        });
      }
      return pages;
    });

    // Remove duplicate pages (same address)
    const uniquePageMap = pageMap.filter(
      (item, index, self) => self.findIndex((t) => t.address === item.address) === index,
    );

    const startRegs = trace.prelude.start?.registers;
    const regs: typeof DEFAULT_REGS = startRegs
      ? (DEFAULT_REGS.map((_, i) => startRegs.get(i) ?? 0n) as typeof DEFAULT_REGS)
      : DEFAULT_REGS;

    return {
      output: {
        program: Array.from(programBytes),
        name: `${fileName} [trace+generic]`,
        spiProgram: null,
        kind: "Ecalli Trace (Generic)",
        initial: {
          regs,
          pc: trace.prelude.start?.pc ?? initialState.pc ?? 0,
          pageMap: uniquePageMap.length > 0 ? uniquePageMap : initialState.pageMap,
          memory: memory.length > 0 ? memory : initialState.memory,
          gas: trace.prelude.start?.gas ?? initialState.gas ?? DEFAULT_GAS,
        },
      },
      traceContent: content,
    };
  }

  return null;
}

export function loadFileFromUint8Array(
  loadedFileName: string,
  uint8Array: Uint8Array,
  spiArgsAsBytes: Uint8Array | null,
  setError: (e?: string) => void,
  onFileUpload: (d: ProgramUploadFileOutput, traceContent?: string) => void,
  initialState: ExpectedState,
) {
  setError(undefined);

  let jsonFile = null;
  let stringContent = "";
  let rawBytes = uint8Array;

  try {
    stringContent = new TextDecoder("utf-8").decode(uint8Array);
  } catch (e) {
    console.warn("not a string", e);
  }

  const isLikelyTrace = stringContent.includes("program 0x");

  if (isLikelyTrace) {
    const traceResult = tryParseTraceFile(stringContent, loadedFileName, initialState);
    if (traceResult) {
      onFileUpload(traceResult.output, traceResult.traceContent);
      return;
    }
  }

  if (stringContent.startsWith("0x")) {
    try {
      rawBytes = bytes.BytesBlob.parseBlob(stringContent).raw;
    } catch (e) {
      console.warn("not a bytes blob", e);
    }
  } else {
    try {
      jsonFile = JSON.parse(stringContent);
    } catch (e) {
      console.warn("not a JSON", e);
    }
  }

  if (jsonFile !== null) {
    const result = validateJsonTestCaseSchema(jsonFile);
    if (!result.success) {
      console.warn("not a valid JSON", result.error);
      const errorMessage = generateErrorMessageFromZodValidation(result);
      setError(errorMessage || "");
      return;
    }

    onFileUpload(mapUploadFileInputToOutput(jsonFile, "JSON test"));
    return;
  }

  let spi = null;
  try {
    spi = decodeSpiWithMetadata(rawBytes, spiArgsAsBytes ?? new Uint8Array());
  } catch (e) {
    console.warn("not an SPI blob", e);
  }
  if (spi !== null) {
    const { code, memory, registers, metadata } = spi;
    const pageMap: PageMapItem[] = getAsPageMap(memory);
    const chunks: MemoryChunkItem[] = getAsChunks(memory);

    onFileUpload({
      program: Array.from(code),
      name: `${loadedFileName} [spi]`,
      spiProgram: {
        program: rawBytes,
        hasMetadata: metadata !== undefined,
      },
      kind: "JAM SPI",
      initial: {
        regs: bigUint64ArrayToRegistersArray(registers),
        pc: 5,
        pageMap,
        memory: chunks,
        gas: DEFAULT_GAS,
      },
    });
    return;
  }

  let program = null;
  try {
    program = pvm.Program.fromGeneric(rawBytes, false);
  } catch (e) {
    console.warn("not a generic PVM", e);
  }

  if (program !== null) {
    onFileUpload({
      program: Array.from(rawBytes),
      name: `${loadedFileName} [generic]`,
      spiProgram: null,
      kind: "Generic PVM",
      initial: initialState,
    });
  } else {
    setError("Unrecognized program format (see console).");
  }
}

const generateErrorMessageFromZodValidation = (result: ValidationResult): string => {
  if (!result.error) return "Unknown error occurred";

  const formattedErrors = result.error.issues.map((err) => {
    const path = err.path.join(" > ") || "root";
    return `Field: "${path}" - ${err.message}`;
  });

  return `File validation failed with the following errors:\n\n${formattedErrors.join("\n")}`;
};
