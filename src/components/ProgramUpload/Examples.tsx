import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ProgramUploadFileOutput } from "./types";

const programs: {
  [key: string]: {
    program: number[];
    regs: [number, number, number, number, number, number, number, number, number, number, number, number, number];
    pc: number;
    pageMap: [];
    gas: number;
    memory: [];
  };
} = {
  fibonacci: {
    program: [
      0, 0, 30, 4, 8, 1, 4, 9, 1, 5, 3, 0, 2, 119, 255, 7, 7, 12, 82, 138, 8, 152, 8, 82, 169, 5, 243, 82, 135, 4, 8, 4,
      9, 73, 147, 82, 213,
    ],
    regs: [0, 0, 0, 0, 0, 0, 0, 9, 0, 0, 0, 0, 0],
    pc: 0,
    pageMap: [],
    memory: [],
    gas: 10000,
  },
  branch: {
    program: [0, 0, 16, 4, 7, 210, 4, 7, 39, 211, 4, 6, 0, 4, 7, 239, 190, 173, 222, 17, 6],
    regs: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    pc: 0,
    pageMap: [],
    memory: [],
    gas: 10000,
  },
  add: {
    program: [0, 0, 3, 8, 135, 9, 249],
    regs: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    pc: 0,
    pageMap: [],
    memory: [],
    gas: 10000,
  },
};

export const Examples = ({ onFileUpload }: { onFileUpload: (val: ProgramUploadFileOutput) => void }) => {
  return (
    <div>
      <p className="mb-2">Load example test file</p>
      <RadioGroup
        defaultValue="option-fibonacci"
        onValueChange={(val) =>
          onFileUpload({
            initial: {
              regs: programs[val].regs,
              pc: programs[val].pc,
              pageMap: programs[val].pageMap,
              memory: programs[val].memory,
              gas: programs[val].gas,
            },
            program: programs[val].program,
            name: val,
          })
        }
      >
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="fibonacci" id="option-fibonacci" />
          <Label htmlFor="option-fibonacci" className="cursor-pointer">
            Fibonacci sequence
          </Label>
        </div>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="branch" id="option-branch" />
          <Label htmlFor="option-branch" className="cursor-pointer">
            Branch instruction
          </Label>
        </div>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="add" id="option-add" />
          <Label htmlFor="option-add" className="cursor-pointer">
            ADD instruction
          </Label>
        </div>
      </RadioGroup>
    </div>
  );
};
