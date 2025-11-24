import { mapUploadFileInputToOutput } from "./utils";
import { bytes, pvm_interpreter as pvm } from "@typeberry/lib";
import { ExpectedState, MemoryChunkItem, PageMapItem } from "@/types/pvm.ts";
import { SafeParseReturnType, z } from "zod";
import { bigUint64ArrayToRegistersArray, getAsChunks, getAsPageMap } from "@/lib/utils.ts";
import { decodeSpiWithMetadata } from "@/utils/spi";
import { ProgramUploadFileInput, ProgramUploadFileOutput } from "./types";

type RawProgramUploadFileInput = unknown;
type ValidationResult = SafeParseReturnType<RawProgramUploadFileInput, ProgramUploadFileInput>;

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

  const schema = z.object({
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

export function loadFileFromUint8Array(
  loadedFileName: string,
  uint8Array: Uint8Array,
  spiArgsAsBytes: Uint8Array | null,
  setError: (e?: string) => void,
  onFileUpload: (d: ProgramUploadFileOutput) => void,
  initialState: ExpectedState,
) {
  // reset error state
  setError(undefined);

  // Try to parse file as a JSON first
  let jsonFile = null;
  let stringContent = "";
  let rawBytes = uint8Array;

  try {
    stringContent = new TextDecoder("utf-8").decode(uint8Array);
  } catch (e) {
    console.warn("not a string", e);
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

  // Try to decode the program as an SPI
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
        pc: 0,
        pageMap,
        memory: chunks,
        gas: 10000n,
      },
    });
    return;
  }

  // Finally try to load program as a Generic
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

  const formattedErrors = result.error.errors.map((err) => {
    const path = err.path.join(" > ") || "root";
    return `Field: "${path}" - ${err.message}`;
  });

  return `File validation failed with the following errors:\n\n${formattedErrors.join("\n")}`;
};
