import { Input } from "../ui/input";
import { ProgramUploadFileOutput } from "./types";
import { mapUploadFileInputToOutput } from "./utils";

export const FileUpload = ({
  onFileUpload,
  close,
}: {
  onFileUpload: (val: ProgramUploadFileOutput) => void;
  close?: () => void;
}) => {
  let fileReader: FileReader;

  const handleFileRead = () => {
    const fileContent = fileReader?.result;

    try {
      if (fileContent !== null && typeof fileContent === "string") {
        const jsonFile = JSON.parse(fileContent);
        onFileUpload(mapUploadFileInputToOutput(jsonFile));
      } else {
        alert("Cannot read file");
      }
    } catch (e) {
      alert("Cannot parse JSON");
    }
  };

  const handleProgramUpload = (file: Blob) => {
    fileReader = new FileReader();
    fileReader.onloadend = handleFileRead;
    fileReader.readAsText(file);
  };

  return (
    <div className="block pb-[100px]">
      <p>Load testfile compatible with JAM TestVectors JSON files </p>
      <Input
        className="mt-5 mr-3"
        id="test-file"
        type="file"
        accept="application/json"
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
