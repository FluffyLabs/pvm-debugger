import { mapKeys, camelCase, pickBy } from "lodash";
import { ProgramUploadFileInput, ProgramUploadFileOutput } from "./types";
import { RegistersArray, TracesFile } from "@/types/pvm";
import { bytes } from "@typeberry/pvm-debugger-adapter";

export function mapUploadFileInputToOutput(data: ProgramUploadFileInput, kind: string): ProgramUploadFileOutput {
  const camelCasedData = mapKeys(data, (_value: unknown, key: string) => camelCase(key));

  const initial = pickBy(camelCasedData, (_value: unknown, key) => key.startsWith("initial"));
  // const expected = pickBy(camelCasedData, (_value: unknown, key) => key.startsWith("expected"));

  const result: ProgramUploadFileOutput = {
    name: data.name,
    initial: {
      ...(mapKeys(initial, (_value: unknown, key) =>
        camelCase(key.replace("initial", "")),
      ) as ProgramUploadFileOutput["initial"]),
      // TODO [ToDr] is this okay?
      pageMap: data["initial-page-map"].map((val) => ({
        address: val.address,
        length: val.length,
        ["is-writable"]: val["is-writable"],
      })),
    },
    kind,
    isSpi: false,
    program: data.program,
    // expected: mapKeys(expected, (_value: unknown, key) => camelCase(key.replace("expected", ""))) as unknown as ProgramUploadFileOutput["expected"],
  };

  result.initial.regs = result.initial.regs?.map((x) => BigInt(x as number | bigint)) as RegistersArray;
  return result;
}

export function mapTracesFileToOutput(tracesFile: TracesFile, fileName: string): ProgramUploadFileOutput {
  // Parse initial gas from hex string
  const initialGas = BigInt(tracesFile["initial-gas"]);

  // Extract program from spi-program if available
  let program: number[] = [];
  if (tracesFile["spi-program"]) {
    try {
      const programBlob = bytes.BytesBlob.parseBlob(tracesFile["spi-program"]);
      program = Array.from(programBlob.raw);
    } catch (error) {
      console.warn("Failed to parse spi-program from traces:", error);
    }
  }

  // Default registers array
  const defaultRegs: RegistersArray = [0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n];

  const result: ProgramUploadFileOutput = {
    name: `${fileName} [traces]`,
    initial: {
      regs: defaultRegs,
      pc: tracesFile["initial-pc"],
      pageMap: [],
      memory: [],
      gas: initialGas,
    },
    kind: "Host Calls Trace",
    isSpi: !!tracesFile["spi-program"],
    program,
    tracesFile,
  };

  return result;
}

export function hexStringToNumber(hexStr: string): number {
  return parseInt(hexStr, 16);
}

export function hexStringToBigInt(hexStr: string): bigint {
  return BigInt(hexStr);
}
