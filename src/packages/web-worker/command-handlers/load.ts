import { loadArrayBufferAsWasm, SupportedLangs } from "../utils";
import { CommandStatus, PvmApiInterface, PvmTypes } from "../worker";
import { Pvm as InternalPvmInstance } from "@typeberry/pvm-debugger-adapter";

export type LoadParams = { type: PvmTypes; params: { url?: string; file?: Blob; lang?: SupportedLangs } };
export type LoadResponse = { pvm: PvmApiInterface | null; status: CommandStatus; error?: unknown };

const load = async (args: LoadParams): Promise<PvmApiInterface | null> => {
  if (args.type === PvmTypes.BUILT_IN) {
    return new InternalPvmInstance();
  } else if (args.type === PvmTypes.WASM_FILE) {
    const file = args.params.file;
    if (!file) {
      throw new Error("No PVM file");
    }

    console.log("Load WASM from file", file);
    const bytes = await file.arrayBuffer();
    return await loadArrayBufferAsWasm(bytes);
  } else if (args.type === PvmTypes.WASM_URL) {
    const url = args.params.url ?? "";
    const isValidUrl = Boolean(new URL(url));

    if (!isValidUrl) {
      throw new Error("Invalid PVM URL");
    }

    console.log("Load WASM from URL", url);
    const response = await fetch(url);
    const bytes = await response.arrayBuffer();

    return await loadArrayBufferAsWasm(bytes, args.params.lang);
  }

  return null;
};

export const runLoad = async (args: LoadParams): Promise<LoadResponse> => {
  try {
    const pvm = await load(args);
    if (pvm) {
      return { pvm, status: CommandStatus.SUCCESS };
    }
  } catch (error) {
    return { pvm: null, status: CommandStatus.ERROR, error };
  }

  return { pvm: null, status: CommandStatus.ERROR, error: new Error("Unknown PVM type") };
};
