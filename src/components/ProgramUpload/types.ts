import { ExpectedState, InitialState } from "@/types/pvm";

export type ProgramUploadFileOutput = {
  name: string;
  initial: InitialState;
  program: number[];
  expected: ExpectedState;
};

export type ProgramUploadFileInput = {
  name: string;
  program: number[];

  "initial-regs": number[];
  "initial-pc": number;
  "initial-page-map": {
    address: number;
    length: number;
    "is-writable": boolean;
  }[];
  "initial-memory": {
    address: number;
    contents: number[];
  }[];
  "initial-gas": number;

  "expected-status": string;
  "expected-regs": number[];
  "expected-pc": number;
  "expected-memory": {
    address: number;
    contents: number[];
  }[];
  "expected-gas": number;
};
