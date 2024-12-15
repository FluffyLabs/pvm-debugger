import { Input } from "../ui/input";
import { ProgramUploadFileOutput } from "./types";
import { decodeStandardProgram } from "@typeberry/pvm-debugger-adapter";
import { RegistersArray } from "@/types/pvm.ts";

export const BinaryFileUpload = ({
  onFileUpload,
  close,
}: {
  onFileUpload: (val: ProgramUploadFileOutput) => void;
  close?: () => void;
}) => {
  let fileReader: FileReader;

  const handleFileRead = (e: ProgressEvent<FileReader>) => {
    const arrayBuffer = e.target?.result;

    if (arrayBuffer instanceof ArrayBuffer) {
      const uint8Array = new Uint8Array(arrayBuffer);
      const { code, /*memory,*/ registers } = decodeStandardProgram(uint8Array, new Uint8Array());

      onFileUpload({
        program: Array.from(code),
        name: "custom",
        initial: {
          regs: Array.from(registers) as RegistersArray,
          pc: 0,
          pageMap: [],
          // TODO: map memory properly
          // memory: [...memory],
          gas: 10000n,
        },
      });
    } else {
      console.error("Unexpected result type:", arrayBuffer);
    }
  };

  const handleProgramUpload = (file: Blob) => {
    fileReader = new FileReader();
    fileReader.onload = handleFileRead;
    fileReader.readAsArrayBuffer(file);
  };

  return (
    <div className="block">
      <p className="mt-10 mb-3">or upload program as a binary file</p>
      <Input
        className="my-6 mr-3"
        id="test-file"
        type="file"
        accept=".bin,.pvm"
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
