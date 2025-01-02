import { ExternalLink } from "lucide-react";
import { Input } from "../ui/input";
import { ProgramUploadFileOutput } from "./types";
import { mapUploadFileInputToOutput } from "./utils";
import { decodeStandardProgram } from "@typeberry/pvm-debugger-adapter";
import { RegistersArray } from "@/types/pvm.ts";
import { SafeParseReturnType, z } from "zod";
import { useAppSelector } from "@/store/hooks";
import { selectInitialState } from "@/store/debugger/debuggerSlice";

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
          const { code, /*memory,*/ registers } = decodeStandardProgram(uint8Array, new Uint8Array());

          onFileUpload({
            program: Array.from(code),
            name: "custom",
            initial: {
              regs: Array.from(registers).map((x) => BigInt(x as number | bigint)) as RegistersArray,
              pc: 0,
              pageMap: [],
              // TODO: map memory properly
              // memory: [...memory],
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
    <div className="block pb-5">
      <h2 className="text-lg">Or load a file in one of the following formats:</h2>
      <ul className="list-disc p-4">
        <li>
          <p>JSON test file compatible with JAM TestVectors JSON</p>
          <p>
            <small>
              Examples can be found in <a href="https://github.com/w3f/jamtestvectors">wf3/jamtestvectors</a> Github
              repo&nbsp;
              <a href="https://github.com/w3f/jamtestvectors/pull/3/files" target="_blank">
                <ExternalLink className="inline w-4 mb-1 text-blue-600" />
              </a>
            </small>
          </p>
        </li>
        <li>
          <p>JAM SPI program</p>
          <p>
            <small>
              SPI program definition can be found in
              <a href="https://graypaper.fluffylabs.dev/#/5b732de/2a7e022a7e02" target="_blank">
                &nbsp;a GrayPaper&nbsp;
                <ExternalLink className="inline w-4 mb-1 text-blue-600" />
              </a>
            </small>
          </p>
        </li>
        <li>
          <p>Generic PVM program</p>
          <p>
            <small>
              Generic program definition can be found in
              <a href="https://graypaper.fluffylabs.dev/#/5b732de/23c60023c600" target="_blank">
                &nbsp;a GrayPaper&nbsp;
                <ExternalLink className="inline w-4 mb-1 text-blue-600" />
              </a>
            </small>
          </p>
        </li>
      </ul>

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
