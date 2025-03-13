import { RegistersArray } from "@/types/pvm";
import { ProgramUploadFileOutput } from "./types";
import { Badge } from "@/components/ui/badge.tsx";

const programs: {
  [key: string]: {
    name: string;
    program: number[];
    regs: [number, number, number, number, number, number, number, number, number, number, number, number, number];
    pc: number;
    pageMap: { address: number; length: number; "is-writable": boolean }[];
    gas: bigint;
    memory: [];
  };
} = {
  fibonacci: {
    name: "Fibonacci sequence",
    program: [
      0, 0, 33, 51, 8, 1, 51, 9, 1, 40, 3, 0, 149, 119, 255, 81, 7, 12, 100, 138, 200, 152, 8, 100, 169, 40, 243, 100,
      135, 51, 8, 51, 9, 1, 50, 0, 73, 147, 82, 213, 0,
    ],
    regs: [4294901760, 0, 0, 0, 0, 0, 0, 9, 0, 0, 0, 0, 0],
    pc: 0,
    pageMap: [],
    memory: [],
    gas: 100000n,
  },
  gameOfLife: {
    name: "Conway's Game of Life",
    program: [
      0, 0, 129, 23, 30, 1, 3, 255, 0, 30, 1, 11, 255, 0, 30, 1, 19, 255, 0, 30, 1, 18, 255, 0, 30, 1, 9, 255, 0, 40,
      233, 0, 51, 1, 255, 1, 149, 17, 1, 81, 17, 8, 223, 0, 51, 2, 255, 1, 149, 34, 1, 81, 18, 8, 241, 150, 19, 8, 200,
      35, 3, 40, 47, 149, 51, 128, 0, 124, 52, 132, 68, 1, 82, 20, 1, 14, 83, 21, 2, 25, 86, 21, 3, 21, 40, 8, 81, 21,
      3, 6, 40, 11, 149, 51, 128, 70, 3, 255, 0, 40, 205, 149, 51, 128, 70, 3, 40, 198, 51, 5, 100, 52, 51, 8, 64, 149,
      68, 255, 205, 132, 7, 149, 119, 128, 0, 124, 118, 132, 102, 1, 200, 101, 5, 149, 68, 2, 205, 132, 7, 149, 119,
      128, 0, 124, 118, 132, 102, 1, 200, 101, 5, 149, 68, 247, 205, 132, 7, 149, 119, 128, 0, 124, 118, 132, 102, 1,
      200, 101, 5, 149, 68, 16, 205, 132, 7, 149, 119, 128, 0, 124, 118, 132, 102, 1, 200, 101, 5, 149, 68, 1, 205, 132,
      7, 149, 119, 128, 0, 124, 118, 132, 102, 1, 200, 101, 5, 149, 68, 254, 205, 132, 7, 149, 119, 128, 0, 124, 118,
      132, 102, 1, 200, 101, 5, 149, 68, 240, 205, 132, 7, 149, 119, 128, 0, 124, 118, 132, 102, 1, 200, 101, 5, 149,
      68, 2, 205, 132, 7, 149, 119, 128, 0, 124, 118, 132, 102, 1, 200, 101, 5, 40, 60, 255, 51, 1, 1, 149, 19, 128, 0,
      128, 18, 122, 50, 149, 17, 4, 81, 17, 64, 12, 255, 40, 240, 33, 132, 16, 146, 9, 153, 72, 138, 18, 17, 69, 137,
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
    name: "Branch instruction",
    program: [0, 0, 16, 51, 7, 210, 4, 81, 39, 210, 4, 6, 0, 51, 7, 239, 190, 173, 222, 17, 6],
    regs: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    pc: 0,
    pageMap: [],
    memory: [],
    gas: 10n,
  },
  add: {
    name: "ADD instruction",
    program: [0, 0, 3, 200, 135, 9, 1],
    regs: [0, 0, 0, 0, 0, 0, 0, 1, 2, 0, 0, 0, 0],
    pc: 0,
    pageMap: [],
    memory: [],
    gas: 10000n,
  },
  storeU16: {
    name: "Store U16 instruction",
    program: [0, 0, 5, 60, 7, 0, 0, 2, 1],
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
    name: "Empty",
    program: [0, 0, 0],
    regs: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    pc: 0,
    pageMap: [],
    memory: [],
    gas: 10000n,
  },
};

export const Examples = ({ onProgramLoad }: { onProgramLoad: (val: ProgramUploadFileOutput) => void }) => {
  return (
    <div>
      {Object.keys(programs).map((key) => {
        return (
          <Badge
            id={key}
            variant="brand"
            className={"mb-2 mr-2 text-xs sm:text-md cursor-pointer"}
            key={key}
            onClick={() => {
              onProgramLoad({
                initial: {
                  regs: programs[key].regs.map((x) => BigInt(x)) as RegistersArray,
                  pc: programs[key].pc,
                  pageMap: programs[key].pageMap,
                  memory: programs[key].memory,
                  gas: programs[key].gas,
                },
                program: programs[key].program,
                name: key,
              });
            }}
          >
            {programs[key].name}
          </Badge>
        );
      })}
    </div>
  );
};
