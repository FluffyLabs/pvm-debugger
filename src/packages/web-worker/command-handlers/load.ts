import { logger } from "@/utils/loggerService";
import { getMemorySize, loadArrayBufferAsWasm } from "../utils";
import { CommandStatus, PvmApiInterface, PvmTypes } from "../types";
import { pvm } from "@typeberry/lib";
import { deserializeFile, SerializedFile } from "@/lib/utils.ts";
import loadWasmFromWebsockets from "../wasmFromWebsockets";

export type LoadParams = {
  type: PvmTypes;
  params: { url?: string; file?: SerializedFile };
};
export type LoadResponse = {
  pvm: PvmApiInterface | null;
  memorySize: number | null;
  status: CommandStatus;
  error?: unknown;
  socket?: WebSocket;
};

const load = async (
  args: LoadParams,
): Promise<{
  pvm?: PvmApiInterface;
  socket?: WebSocket;
}> => {
  if (args.type === PvmTypes.BUILT_IN) {
    return {
      pvm: new pvm.Pvm(),
    };
  } else if (args.type === PvmTypes.WASM_FILE) {
    if (!args.params.file) {
      throw new Error("No PVM file");
    }

    const file = deserializeFile(args.params.file);

    logger.info("Load WASM from file", file);
    const bytes = await file.arrayBuffer();
    const pvm = await loadArrayBufferAsWasm(bytes);

    return {
      pvm,
    };
  } else if (args.type === PvmTypes.WASM_URL) {
    const url = args.params.url ?? "";
    const isValidUrl = Boolean(new URL(url));

    if (!isValidUrl) {
      throw new Error("Invalid PVM URL");
    }

    logger.info("Load WASM from URL", url);
    const response = await fetch(url);
    const bytes = await response.arrayBuffer();

    const pvm = await loadArrayBufferAsWasm(bytes);

    return {
      pvm,
    };
  } else if (args.type === PvmTypes.WASM_WS) {
    return await loadWasmFromWebsockets();
  }

  return {};
};

export const runLoad = async (args: LoadParams): Promise<LoadResponse> => {
  try {
    const { pvm, socket } = await load(args);
    const memorySize = await getMemorySize(pvm);
    if (pvm) {
      return { pvm, memorySize, status: CommandStatus.SUCCESS, socket };
    }
  } catch (error) {
    return { pvm: null, memorySize: null, status: CommandStatus.ERROR, error };
  }

  return { pvm: null, memorySize: null, status: CommandStatus.ERROR, error: new Error("Unknown PVM type") };
};
