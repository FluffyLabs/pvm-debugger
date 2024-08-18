import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ProgramUploadFileOutput } from "./types";

const programs: { [key: string]: number[] } = {
  fibonacci: [
    0, 0, 44, 4, 8, 1, 4, 9, 1, 5, 3, 0, 2, 119, 255, 7, 7, 12, 82, 138, 8, 152, 8, 82, 169, 5, 243, 47, 137, 6, 5, 11,
    0, 82, 135, 4, 8, 4, 9, 17, 0, 82, 151, 4, 8, 4, 9, 73, 147, 82, 105, 117, 245,
  ],
  branch: [0, 0, 16, 4, 7, 210, 4, 7, 39, 211, 4, 6, 0, 4, 7, 239, 190, 173, 222, 17, 6],
  add: [0, 0, 3, 8, 135, 9, 249],
};

const initial = {
  regs: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] as [
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
  ],
  pc: 0,
  pageMap: [],
  memory: [],
  gas: 10000,
};
export const Examples = ({ onFileUpload }: { onFileUpload: (val: ProgramUploadFileOutput) => void }) => {
  return (
    <div>
      <p className="mb-2">Load example test file</p>
      <RadioGroup
        defaultValue="option-fibonacci"
        onValueChange={(val) =>
          onFileUpload({
            initial,
            program: programs[val],
            name: val,
          })
        }
      >
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="fibonacci" id="option-fibonacci" />
          <Label htmlFor="option-fibonacci">Fibonacci sequence</Label>
        </div>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="branch" id="option-branch" />
          <Label htmlFor="option-branch">Branch instruction</Label>
        </div>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="add" id="option-add" />
          <Label htmlFor="option-add">ADD instruction</Label>
        </div>
      </RadioGroup>
    </div>
  );
};
