import { Input } from "../ui/input";
import { ProgramUploadFileOutput } from "./types";
import { mapUploadFileInputToOutput } from "./utils";
import { decodeStandardProgram } from "@typeberry/pvm-debugger-adapter";
import { MemoryChunkItem, PageMapItem, RegistersArray } from "@/types/pvm.ts";
import { SafeParseReturnType, z } from "zod";
import { useAppSelector } from "@/store/hooks";
import { selectInitialState } from "@/store/debugger/debuggerSlice";
import { getAsChunks, getAsPageMap } from "@/lib/utils.ts";

const validateJsonTestCaseSchema = (json: unknown) => {
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

const generateErrorMessageFromZodValidation = (result: SafeParseReturnType<unknown, unknown>) => {
  if (!result.error) {
    return false;
  }

  const formattedErrors = result.error.errors.map((err) => {
    const path = err.path.join(" > ") || "root";
    return `Field: "${path}" - ${err.message}`;
  });

  return `File validation failed with the following errors:\n\n${formattedErrors.join("\n")}`;
};

export const ProgramFileUpload = ({
  onFileUpload,
  onParseError,
  close,
}: {
  onFileUpload: (val: ProgramUploadFileOutput) => void;
  onParseError: (error: string) => void;
  close?: () => void;
}) => {
  const initialState = useAppSelector(selectInitialState);

  let fileReader: FileReader;

  const handleFileRead = (e: ProgressEvent<FileReader>) => {
    const arrayBuffer = e.target?.result;

    if (arrayBuffer instanceof ArrayBuffer) {
      // Try to parse file as a JSON first
      try {
        const stringContent = new TextDecoder("utf-8").decode(arrayBuffer);

        const jsonFile = JSON.parse(stringContent);

        const result = validateJsonTestCaseSchema(jsonFile);

        if (!result.success) {
          const errorMessage = generateErrorMessageFromZodValidation(result);
          onParseError(errorMessage || "");
        } else {
          onFileUpload(mapUploadFileInputToOutput(jsonFile));
        }
      } catch (e) {
        const uint8Array = new Uint8Array(arrayBuffer);

        // Try to decode the program as an SPI
        try {
          const { code, memory, registers } = decodeStandardProgram(uint8Array, new Uint8Array());

          const pageMap: PageMapItem[] = getAsPageMap(memory);
          const chunks: MemoryChunkItem[] = getAsChunks(memory);

          onFileUpload({
            program: Array.from(code),
            name: "custom",
            initial: {
              regs: Array.from(registers).map((x) => BigInt(x as number | bigint)) as RegistersArray,
              pc: 0,
              pageMap,
              memory: chunks,
              gas: 10000n,
            },
          });
        } catch (e) {
          // Try to load program as a Generic
          onFileUpload({
            program: Array.from(uint8Array),
            name: "custom",
            initial: initialState,
          });
        }
      }
    }
  };

  const handleProgramUpload = (file: Blob) => {
    fileReader = new FileReader();
    fileReader.onloadend = handleFileRead;
    fileReader.readAsArrayBuffer(file);
  };

  return (
    <div className="pb-5">
      <Input
        className="mt-5 mr-3"
        id="test-file"
        type="file"
        accept=".bin,.pvm,.json"
        onClick={(e) => e.stopPropagation()}
        onChange={(e) => {
          if (e.target.files?.length) {
            handleProgramUpload(e.target.files[0]);
            close?.();
          }
        }}
      />
    </div>
  );
};
