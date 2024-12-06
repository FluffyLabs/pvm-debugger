import { CurrentInstruction } from "@/types/pvm";

export const virtualTrapInstruction: CurrentInstruction = {
  args: { type: 0, noOfBytesToSkip: 0 },
  address: 0,
  name: "TRAP",
  gas: 0,
  instructionCode: 0,
  instructionBytes: new Uint8Array(0),
  block: {
    isStart: true,
    isEnd: true,
    name: "end of program",
    number: -1,
  },
};
