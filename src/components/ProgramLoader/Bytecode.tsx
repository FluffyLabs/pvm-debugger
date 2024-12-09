import { ProgramUploadFileOutput } from "./types";
import { BinaryFileUpload } from "@/components/ProgramLoader/BinaryFileUpload.tsx";

export const Bytecode = ({
  onProgramLoad,
}: {
  onProgramLoad: (val?: ProgramUploadFileOutput, error?: string) => void;
}) => {
  const handleFileUpload = (val: ProgramUploadFileOutput) => {
    onProgramLoad(val);
  };

  return (
    <div className="h-full flex flex-col">
      <BinaryFileUpload onFileUpload={handleFileUpload} />
    </div>
  );
};
