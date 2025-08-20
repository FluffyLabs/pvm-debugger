import { useDropzone } from "react-dropzone";
import { ProgramUploadFileInput, ProgramUploadFileOutput } from "./types";
import { mapUploadFileInputToOutput } from "./utils";
import { bytes, ProgramDecoder } from "@typeberry/pvm-debugger-adapter";
import { ExpectedState, MemoryChunkItem, PageMapItem, RegistersArray } from "@/types/pvm.ts";
import { SafeParseReturnType, z } from "zod";
import { useAppSelector } from "@/store/hooks";
import { selectInitialState } from "@/store/debugger/debuggerSlice";
import { cn, getAsChunks, getAsPageMap } from "@/lib/utils.ts";
import { UploadCloud } from "lucide-react";
import { Button } from "../ui/button";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Input } from "../ui/input";
import { decodeSpiWithMetadata } from "@/utils/spi";

type ProgramFileUploadProps = {
  onFileUpload: (val: ProgramUploadFileOutput) => void;
  setError: (e?: string) => void;
  isError: boolean;
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

function loadFileFromUint8Array(
  loadedFileName: string,
  uint8Array: Uint8Array,
  spiArgsAsBytes: Uint8Array,
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
    spi = decodeSpiWithMetadata(rawBytes, spiArgsAsBytes);
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
      isSpi: true,
      kind: "JAM SPI",
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
      isSpi: false,
      kind: "Generic PVM",
      initial: initialState,
    });
  } else {
    setError("Unrecognized program format (see console).");
  }
}

export const ProgramFileUpload: React.FC<ProgramFileUploadProps> = ({ isError, onFileUpload, close, setError }) => {
  const initialState = useAppSelector(selectInitialState);
  const spiArgs = useAppSelector((state) => state.debugger.spiArgs);

  const [isUpload, setIsUpload] = useState(true);
  const [manualInput, setManualInput] = useState("");
  const [loadedFileName, setLoadedFileName] = useState<string | undefined>(undefined);

  const spiArgsAsBytes = useMemo(() => {
    try {
      return bytes.BytesBlob.parseBlob(spiArgs ?? "0x").raw;
    } catch {
      return new Uint8Array();
    }
  }, [spiArgs]);

  useEffect(() => {
    // reset the state of upload
    if (isUpload) {
      return;
    }

    if (manualInput === "") {
      setError(undefined);
      return;
    }

    const buffer = new TextEncoder().encode(manualInput);
    loadFileFromUint8Array("pasted", buffer, spiArgsAsBytes, setError, onFileUpload, initialState);
  }, [manualInput, isUpload, initialState, onFileUpload, spiArgsAsBytes, setError]);

  const handleFileRead = (e: ProgressEvent<FileReader>) => {
    setError(undefined);
    const arrayBuffer = e.target?.result;

    if (!(arrayBuffer instanceof ArrayBuffer)) {
      setError("Failed to read the file");
      return;
    }

    loadFileFromUint8Array(
      loadedFileName ?? "",
      new Uint8Array(arrayBuffer),
      spiArgsAsBytes,
      setError,
      onFileUpload,
      initialState,
    );
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

  const handleOpen = useCallback(() => {
    setIsUpload(true);
    open();
  }, [open]);

  const setNoUpload = useCallback(() => {
    setIsUpload(false);
    setLoadedFileName(undefined);
    setError(undefined);
  }, [setError]);

  const isLoaded = loadedFileName !== undefined;

  return (
    <div>
      <div
        {...getRootProps()}
        className="flex items-center justify-between border-dashed border-2 py-3 px-4 rounded-lg w-full mx-auto space-x-6"
      >
        <div className="flex items-center space-x-2 flex-1">
          {isUpload ? (
            <>
              <UploadCloud className="text-title-secondary-foreground" width="30px" height="30px" />
              <p className="text-[10px] text-title-secondary-foreground">
                {isLoaded ? loadedFileName : "Select a file or drag and drop"}
              </p>
            </>
          ) : (
            <Input
              placeholder="Hex-prefixed code"
              value={manualInput}
              onChange={(e) => setManualInput(e.target.value)}
              className={cn("flex-auto text-xs", {
                "focus-visible:ring-red-500 ring-red-500 ring-2": isError,
              })}
            />
          )}
        </div>
        <div className="flex space-x-2">
          {isUpload && (
            <Button className="text-[10px] py-1 h-9" variant="ghost" onClick={setNoUpload}>
              Paste manually
            </Button>
          )}
          <Button className="text-[10px] py-1 h-9" variant="outlineBrand" onClick={handleOpen}>
            {isLoaded ? "Change file" : "Upload file"}
          </Button>
        </div>
        <input {...getInputProps()} className="hidden" />
      </div>
    </div>
  );
};
