export const programs: {
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
      0, 0, 129, 83, 30, 3, 3, 0, 2, 255, 0, 30, 3, 11, 0, 2, 255, 0, 30, 3, 19, 0, 2, 255, 0, 30, 3, 18, 0, 2, 255, 0,
      30, 3, 9, 0, 2, 255, 0, 40, 22, 1, 51, 1, 255, 1, 149, 17, 1, 81, 17, 8, 12, 1, 51, 2, 255, 1, 149, 34, 1, 81, 18,
      8, 241, 150, 19, 8, 149, 51, 0, 0, 2, 200, 35, 3, 40, 47, 149, 51, 128, 0, 124, 52, 132, 68, 1, 82, 20, 1, 14, 83,
      21, 2, 25, 86, 21, 3, 21, 40, 8, 81, 21, 3, 6, 40, 11, 149, 51, 128, 70, 3, 255, 0, 40, 200, 149, 51, 128, 70, 3,
      40, 193, 51, 5, 100, 52, 51, 8, 64, 149, 68, 255, 205, 132, 7, 149, 119, 0, 0, 2, 149, 119, 128, 0, 124, 118, 132,
      102, 1, 200, 101, 5, 149, 68, 2, 205, 132, 7, 149, 119, 0, 0, 2, 149, 119, 128, 0, 124, 118, 132, 102, 1, 200,
      101, 5, 149, 68, 247, 205, 132, 7, 149, 119, 0, 0, 2, 149, 119, 128, 0, 124, 118, 132, 102, 1, 200, 101, 5, 149,
      68, 16, 205, 132, 7, 149, 119, 0, 0, 2, 149, 119, 128, 0, 124, 118, 132, 102, 1, 200, 101, 5, 149, 68, 1, 205,
      132, 7, 149, 119, 0, 0, 2, 149, 119, 128, 0, 124, 118, 132, 102, 1, 200, 101, 5, 149, 68, 254, 205, 132, 7, 149,
      119, 0, 0, 2, 149, 119, 128, 0, 124, 118, 132, 102, 1, 200, 101, 5, 149, 68, 240, 205, 132, 7, 149, 119, 0, 0, 2,
      149, 119, 128, 0, 124, 118, 132, 102, 1, 200, 101, 5, 149, 68, 2, 205, 132, 7, 149, 119, 0, 0, 2, 149, 119, 128,
      0, 124, 118, 132, 102, 1, 200, 101, 5, 40, 20, 255, 51, 1, 0, 0, 2, 1, 149, 19, 128, 0, 128, 18, 122, 50, 149, 17,
      4, 81, 49, 100, 0, 2, 220, 254, 40, 238, 129, 64, 32, 16, 72, 38, 100, 34, 33, 69, 137, 136, 162, 68, 169, 74, 18,
      162, 36, 9, 81, 146, 132, 40, 73, 66, 148, 36, 33, 74, 146, 16, 37, 73, 136, 146, 36, 68, 73, 194, 168, 4, 2,
    ],
    regs: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    pc: 0,
    pageMap: [
      {
        address: 2 ** 17,
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
