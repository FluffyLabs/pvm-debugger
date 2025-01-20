import { logger } from "@/utils/loggerService";
import { getMemorySize, loadArrayBufferAsWasm, SupportedLangs } from "../utils";
import { CommandStatus, PvmApiInterface, PvmTypes } from "../types";
import { Pvm as InternalPvmInstance } from "@typeberry/pvm-debugger-adapter";
import { deserializeFile, SerializedFile } from "@/lib/utils.ts";

export type LoadParams = { type: PvmTypes; params: { url?: string; file?: SerializedFile; lang?: SupportedLangs } };
export type LoadResponse = {
  pvm: PvmApiInterface | null;
  memorySize: number | null;
  status: CommandStatus;
  error?: unknown;
};

const load = async (args: LoadParams): Promise<PvmApiInterface | null> => {
  if (args.type === PvmTypes.BUILT_IN) {
    return new InternalPvmInstance();
  } else if (args.type === PvmTypes.WASM_FILE) {
    if (!args.params.file) {
      throw new Error("No PVM file");
    }

    const file = deserializeFile(args.params.file);

    logger.info("Load WASM from file", file);
    const bytes = await file.arrayBuffer();
    return await loadArrayBufferAsWasm(bytes, args.params.lang);
  } else if (args.type === PvmTypes.WASM_URL) {
    const url = args.params.url ?? "";
    const isValidUrl = Boolean(new URL(url));

    if (!isValidUrl) {
      throw new Error("Invalid PVM URL");
    }

    logger.info("Load WASM from URL", url);
    const response = await fetch(url);
    const bytes = await response.arrayBuffer();

    return await loadArrayBufferAsWasm(bytes, args.params.lang);
  }

  return null;
};

export const runLoad = async (args: LoadParams): Promise<LoadResponse> => {
  try {
    const pvm = await load(args);
    const memorySize = getMemorySize(pvm);
    if (pvm) {
      return { pvm, memorySize, status: CommandStatus.SUCCESS };
    }
  } catch (error) {
    return { pvm: null, memorySize: null, status: CommandStatus.ERROR, error };
  }

  return { pvm: null, memorySize: null, status: CommandStatus.ERROR, error: new Error("Unknown PVM type") };
};
