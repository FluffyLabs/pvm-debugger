import { mapKeys, camelCase, pickBy } from "lodash";
import { ProgramUploadFileInput, ProgramUploadFileOutput } from "./types";
import { RegistersArray } from "@/types/pvm";

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
    spiProgram: null,
    program: data.program,
    // expected: mapKeys(expected, (_value: unknown, key) => camelCase(key.replace("expected", ""))) as unknown as ProgramUploadFileOutput["expected"],
  };

  result.initial.regs = result.initial.regs?.map((x) => BigInt(x as number | bigint)) as RegistersArray;
  return result;
}
