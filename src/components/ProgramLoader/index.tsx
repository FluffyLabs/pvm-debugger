import { ProgramUpload } from "@/components/ProgramUpload";
import { ProgramUploadFileOutput } from "@/components/ProgramUpload/types.ts";
import { Label } from "@/components/ui/label.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { useState } from "react";

export const ProgramLoader = ({ onFileUpload, program, setProgram }: { onFileUpload: (val: ProgramUploadFileOutput) => void; program: number[]; setProgram: (val: number[]) => void }) => {
  const [isInvalidProgram, setIsInvalidProgram] = useState(false);

  return (
    <div className="flex gap-1 flex-col">
      <div>
        <Label htmlFor="program">Enter PVM program as an array of numbers:</Label>
        <Textarea
          className="w-full font-mono"
          id="program"
          placeholder="Paste the program as an array of numbers"
          value={JSON.stringify(program)}
          onChange={(e) => {
            console.log(e.target.value);
            try {
              JSON.parse(e.target.value);
              setProgram(JSON.parse(e.target.value));
              setIsInvalidProgram(false);
            } catch (e) {
              console.log("wrong json");
              setIsInvalidProgram(true);
            }
          }}
        />
        {isInvalidProgram && <div>Program is not a valid JSON array</div>}
      </div>

      <ProgramUpload onFileUpload={onFileUpload} />
    </div>
  );
};
