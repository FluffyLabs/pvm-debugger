import { Input } from "../ui/input";
import { ProgramUploadFileOutput } from "./types";

export const BinaryFileUpload = ({
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
        console.log({
          fileContent,
        });
        // const jsonFile = JSON.parse(fileContent);
        onFileUpload(fileContent);
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
    <div className="block">
      <p className="mt-10 mb-3">or upload program as a binary file</p>
      <Input
        className="mt-3 mr-3"
        id="test-file"
        type="file"
        // accept="application/json"
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
