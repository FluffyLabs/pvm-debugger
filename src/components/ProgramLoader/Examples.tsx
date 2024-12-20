import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ProgramUploadFileOutput } from "./types";

const programs: {
  [key: string]: {
    program: number[];
    regs: [number, number, number, number, number, number, number, number, number, number, number, number, number];
    pc: number;
    pageMap: { address: number; length: number; "is-writable": boolean }[];
    gas: bigint;
    memory: [];
  };
} = {
  fibonacci: {
    program: [
      0, 0, 33, 51, 8, 1, 51, 9, 1, 40, 3, 0, 121, 119, 255, 81, 7, 12, 100, 138, 170, 152, 8, 100, 169, 40, 243, 100,
      135, 51, 8, 51, 9, 1, 50, 0, 73, 147, 82, 213, 0,
    ],
    regs: [4294901760, 0, 0, 0, 0, 0, 0, 9, 0, 0, 0, 0, 0],
    pc: 0,
    pageMap: [],
    memory: [],
    gas: 100000n,
  },
  gameOfLife: {
    program: [
      0, 0, 129, 23, 62, 1, 3, 255, 0, 62, 1, 11, 255, 0, 62, 1, 19, 255, 0, 62, 1, 18, 255, 0, 62, 1, 9, 255, 0, 5,
      233, 0, 4, 1, 255, 17, 2, 17, 1, 7, 17, 8, 223, 0, 4, 2, 255, 17, 2, 34, 1, 7, 18, 8, 241, 35, 19, 8, 8, 35, 3, 5,
      47, 2, 51, 128, 0, 11, 52, 18, 68, 1, 15, 20, 1, 14, 44, 21, 2, 25, 50, 21, 3, 21, 5, 8, 7, 21, 3, 6, 5, 11, 2,
      51, 128, 26, 3, 255, 0, 5, 205, 2, 51, 128, 26, 3, 5, 198, 4, 5, 82, 52, 4, 8, 64, 2, 68, 255, 73, 132, 7, 2, 119,
      128, 0, 11, 118, 18, 102, 1, 8, 101, 5, 2, 68, 2, 73, 132, 7, 2, 119, 128, 0, 11, 118, 18, 102, 1, 8, 101, 5, 2,
      68, 247, 73, 132, 7, 2, 119, 128, 0, 11, 118, 18, 102, 1, 8, 101, 5, 2, 68, 16, 73, 132, 7, 2, 119, 128, 0, 11,
      118, 18, 102, 1, 8, 101, 5, 2, 68, 1, 73, 132, 7, 2, 119, 128, 0, 11, 118, 18, 102, 1, 8, 101, 5, 2, 68, 254, 73,
      132, 7, 2, 119, 128, 0, 11, 118, 18, 102, 1, 8, 101, 5, 2, 68, 240, 73, 132, 7, 2, 119, 128, 0, 11, 118, 18, 102,
      1, 8, 101, 5, 2, 68, 2, 73, 132, 7, 2, 119, 128, 0, 11, 118, 18, 102, 1, 8, 101, 5, 5, 60, 255, 4, 1, 17, 2, 19,
      128, 0, 1, 18, 3, 50, 2, 17, 4, 7, 17, 64, 12, 255, 5, 240, 33, 132, 16, 146, 9, 153, 72, 138, 18, 17, 69, 137,
      82, 149, 36, 74, 146, 40, 73, 162, 36, 137, 146, 36, 74, 146, 40, 73, 162, 36, 137, 146, 52, 42, 33,
    ],
    regs: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    pc: 0,
    pageMap: [
      {
        address: 0,
        length: 4096,
        "is-writable": true,
      },
    ],
    memory: [],
    gas: 10_000_000n,
  },
  branch: {
    program: [0, 0, 16, 4, 7, 210, 4, 7, 39, 210, 4, 6, 0, 4, 7, 239, 190, 173, 222, 17, 6],
    regs: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    pc: 0,
    pageMap: [],
    memory: [],
    gas: 10n,
  },
  add: {
    program: [0, 0, 3, 8, 135, 9, 1],
    regs: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    pc: 0,
    pageMap: [],
    memory: [],
    gas: 10000n,
  },
  storeU16: {
    program: [0, 0, 5, 69, 7, 0, 0, 2, 1],
    regs: [0, 0, 0, 0, 0, 0, 0, 305419896, 0, 0, 0, 0, 0],
    pc: 0,
    pageMap: [
      {
        address: 131072,
        length: 4096,
        "is-writable": true,
      },
    ],
    memory: [],
    gas: 10000n,
  },
  empty: {
    program: [0, 0, 0],
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
    gas: 10000n,
  },
};

export const Examples = ({ onProgramLoad }: { onProgramLoad: (val: ProgramUploadFileOutput) => void }) => {
  return (
    <div>
      <h2 className="text-lg mb-4">Load an example test file</h2>
      <RadioGroup
        defaultValue="option-fibonacci"
        onValueChange={(val) =>
          onProgramLoad({
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
          <RadioGroupItem value="gameOfLife" id="option-gameOfLife" />
          <Label htmlFor="option-gameOfLife" className="cursor-pointer">
            Conway's Game of Life
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
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="storeU16" id="option-storeU16" />
          <Label htmlFor="option-storeU16" className="cursor-pointer">
            Store U16 instruction
          </Label>
        </div>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="empty" id="option-empty" />
          <Label htmlFor="option-empty" className="cursor-pointer">
            Empty
          </Label>
        </div>
      </RadioGroup>
    </div>
  );
};
