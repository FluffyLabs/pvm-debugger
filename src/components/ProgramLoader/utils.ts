import { mapKeys, camelCase, pickBy } from "lodash";
import { ProgramUploadFileInput, ProgramUploadFileOutput } from "./types";

export function mapUploadFileInputToOutput(data: ProgramUploadFileInput): ProgramUploadFileOutput {
  const camelCasedData = mapKeys(data, (_value: unknown, key: string) => camelCase(key));

  const initial = pickBy(camelCasedData, (_value: unknown, key) => key.startsWith("initial"));
  // const expected = pickBy(camelCasedData, (_value: unknown, key) => key.startsWith("expected"));

  const result: ProgramUploadFileOutput = {
    name: data.name,
    initial: {
      ...(mapKeys(initial, (_value: unknown, key) =>
        camelCase(key.replace("initial", "")),
      ) as ProgramUploadFileOutput["initial"]),
      // TODO is-writable has wrong case
      // pageMap: data["initial-page-map"].map((val) => ({ address: val.address, length: val.length, isWritable: val["is-writable"] })),
    },
    program: data.program,
    // expected: mapKeys(expected, (_value: unknown, key) => camelCase(key.replace("expected", ""))) as unknown as ProgramUploadFileOutput["expected"],
  };

  return result;
}
