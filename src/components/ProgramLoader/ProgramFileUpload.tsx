import { useDropzone } from "react-dropzone";
import { ProgramUploadFileInput, ProgramUploadFileOutput } from "./types";
import { mapUploadFileInputToOutput } from "./utils";
import { decodeStandardProgram, ProgramDecoder } from "@typeberry/pvm-debugger-adapter";
import { MemoryChunkItem, PageMapItem, RegistersArray } from "@/types/pvm.ts";
import { SafeParseReturnType, z } from "zod";
import { useAppSelector } from "@/store/hooks";
import { selectInitialState } from "@/store/debugger/debuggerSlice";
import { getAsChunks, getAsPageMap } from "@/lib/utils.ts";
import { TriangleAlert, UploadCloud } from "lucide-react";
import { Button } from "../ui/button";
import { useState } from "react";

type ProgramFileUploadProps = {
  onFileUpload: (val: ProgramUploadFileOutput) => void;
  close?: () => void;
};

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

const generateErrorMessageFromZodValidation = (result: ValidationResult): string => {
  if (!result.error) return "Unknown error occurred";

  const formattedErrors = result.error.errors.map((err) => {
    const path = err.path.join(" > ") || "root";
    return `Field: "${path}" - ${err.message}`;
  });

  return `File validation failed with the following errors:\n\n${formattedErrors.join("\n")}`;
};

export const ProgramFileUpload: React.FC<ProgramFileUploadProps> = ({ onFileUpload, close }) => {
  const initialState = useAppSelector(selectInitialState);
  const [error, setError] = useState<string>();
  const [loadedFileName, setLoadedFileName] = useState<string | undefined>(undefined);

  const handleFileRead = (e: ProgressEvent<FileReader>) => {
    setError(undefined);
    const arrayBuffer = e.target?.result;

    if (!(arrayBuffer instanceof ArrayBuffer)) {
      setError("Failed to read the file");
      return;
    }

    // Try to parse file as a JSON first
    let jsonFile = null;
    try {
      const stringContent = new TextDecoder("utf-8").decode(arrayBuffer);
      jsonFile = JSON.parse(stringContent);
    } catch (e) {
      console.warn("not a JSON", e);
    }

    if (jsonFile !== null) {
      const result = validateJsonTestCaseSchema(jsonFile);
      if (!result.success) {
        console.warn("not a valid JSON", result.error);
        const errorMessage = generateErrorMessageFromZodValidation(result);
        setError(errorMessage || "");
        return;
      }

      onFileUpload(mapUploadFileInputToOutput(jsonFile));
      return;
    }

    // Try to decode the program as an SPI
    const uint8Array = new Uint8Array(arrayBuffer);
    let spi = null;
    try {
      spi = decodeStandardProgram(uint8Array, new Uint8Array());
    } catch (e) {
      console.warn("not an SPI blob", e);
    }
    if (spi !== null) {
      const { code, memory, registers } = spi;
      const pageMap: PageMapItem[] = getAsPageMap(memory);
      const chunks: MemoryChunkItem[] = getAsChunks(memory);

      onFileUpload({
        program: Array.from(code),
        name: `${loadedFileName} [spi]`,
        initial: {
          regs: Array.from(registers).map((x) => BigInt(x as number | bigint)) as RegistersArray,
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
      program = new ProgramDecoder(uint8Array);
    } catch (e) {
      console.warn("not a generic PVM", e);
    }

    if (program !== null) {
      onFileUpload({
        program: Array.from(uint8Array),
        name: `${loadedFileName} [generic]`,
        initial: initialState,
      });
    } else {
      setError("Unrecognized program format (see console).");
    }
  };

  const onDrop = (acceptedFiles: File[]) => {
    if (acceptedFiles.length) {
      const file = acceptedFiles[0];
      setLoadedFileName(file.name);
      const fileReader = new FileReader();
      fileReader.onloadend = handleFileRead;
      fileReader.readAsArrayBuffer(file);
      close?.();
    }
  };

  const { getRootProps, getInputProps, open } = useDropzone({
    onDrop,
    accept: { "application/octet-stream": [".bin", ".pvm"], "application/json": [".json"] },
    noClick: true,
  });

  const isLoaded = loadedFileName !== undefined;

  return (
    <div>
      <div
        {...getRootProps()}
        className="flex items-center justify-between border-dashed border-2 py-3 px-4 rounded-lg w-full mx-auto"
      >
        <div className="flex items-center space-x-6">
          <UploadCloud className="text-title-secondary-foreground" width="30px" height="30px" />
          <p className="text-[10px] text-title-secondary-foreground">
            {isLoaded ? loadedFileName : "Select a file or drag and drop"}
          </p>
        </div>
        <Button className="text-[10px] py-1 h-9" variant="outlineBrand" onClick={open}>
          {isLoaded ? "Change file" : "Select file"}
        </Button>
        <input {...getInputProps()} className="hidden" />
      </div>

      {error && (
        <p className="flex items-center text-destructive-foreground mt-3 text-[11px] whitespace-pre-line">
          <TriangleAlert className="mr-2" height="18px" /> {error}
        </p>
      )}
    </div>
  );
};
