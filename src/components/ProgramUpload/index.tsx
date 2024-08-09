import { Label } from "@/components/ui/label.tsx";
import { Input } from "@/components/ui/input.tsx";
import { ProgramUploadFileOutput } from "./types";
import { mapUploadFileInputToOutput } from "./utils";

export const ProgramUpload = ({ onFileUpload }: { onFileUpload: (val: ProgramUploadFileOutput) => void }) => {
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
    <div className="bg-sky-200 p-3 flex w-[400px] justify-center items-center text-right gap-2">
      <Label htmlFor="test-file">or load test scenario from json file:</Label>
      <Input
        id="test-file"
        type="file"
        accept="application/json"
        onChange={(e) => {
          if (e.target.files?.length) {
            handleProgramUpload(e.target.files[0]);
          }
        }}
      />
    </div>
  );
};
