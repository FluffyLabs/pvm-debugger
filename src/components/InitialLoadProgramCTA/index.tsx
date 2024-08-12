import { ProgramUpload } from "@/components/ProgramUpload";
import { ProgramUploadFileOutput } from "@/components/ProgramUpload/types.ts";

export const InitialLoadProgramCTA = ({
  onEditClick,
  onFileUpload,
}: {
  onEditClick: () => void;
  onFileUpload: (val: ProgramUploadFileOutput) => void;
}) => {
  return (
    <div className="border-2 rounded-md h-full flex justify-center flex-col items-center gap-3" onClick={onEditClick}>
      <p>Edit / paste raw machine program or ...</p>
      <ProgramUpload onFileUpload={onFileUpload} />
    </div>
  );
};
