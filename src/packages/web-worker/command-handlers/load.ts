import { logger } from "@/utils/loggerService";
import { getMemorySize, loadArrayBufferAsWasm, SupportedLangs } from "../utils";
import { CommandStatus, PvmApiInterface, PvmTypes } from "../types";
import { Pvm as InternalPvmInstance } from "@typeberry/pvm-debugger-adapter";
import { deserializeFile, SerializedFile } from "@/lib/utils.ts";

const generateMessageId = () => Math.random().toString(36).substring(2);

// TODO: remove this when found a workaround for BigInt support in JSON.stringify
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error
BigInt.prototype["toJSON"] = function () {
  return this.toString();
};

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
  } else if (args.type === PvmTypes.WASM_WS) {
    return new Promise((resolve, reject) => {
      // Connect to WebSocket server
      const socket = new WebSocket("ws://localhost:8765");

      socket.addEventListener("open", () => {
        console.log("Connected to server");

        // Send a JSON-RPC request
        const request = {
          jsonrpc: "2.0",
          method: "ping",
          id: 1,
        };

        socket.send(JSON.stringify(request));
      });

      socket.addEventListener("message", (message: any) => {
        console.log("Received response:", message);

        const jsonResponse = JSON.parse(message.data);

        if (jsonResponse.result === "pong") {
          // if (message.result === "pong") {
          resolve({
            // } else if (pvm.resetGeneric) {
            //   pvm.resetGeneric(program, regsAsUint8(initialState.regs), BigInt(gas));
            // }
            // pvm.setNextProgramCounter && pvm.setNextProgramCounter(initialState.pc ?? 0);
            // pvm.setGasLeft && pvm.setGasLeft(BigInt(gas));
            // pvm.nextStep();
            // 'reset', 'nextStep', 'getProgramCounter', 'getStatus', 'getGasLeft', 'getRegisters', 'getPageDump'
            reset: async (...params) => {
              return await invokeMethodViaRpc("reset", params);
            },
            nextStep: async (...params) => {
              return await invokeMethodViaRpc("nextStep", params);
            },
            getProgramCounter: async (...params) => {
              return await invokeMethodViaRpc("getProgramCounter", params);
            },
            getStatus: async (...params) => {
              return await invokeMethodViaRpc("getStatus", params);
            },
            getGasLeft: async (...params) => {
              return await invokeMethodViaRpc("getGasLeft", params);
            },
            getRegisters: async (...params) => {
              return await invokeMethodViaRpc("getRegisters", params);
            },
            getPageDump: async (...params) => {
              return await invokeMethodViaRpc("getPageDump", params);
            },
            getExitArg: async (...params) => {
              return await invokeMethodViaRpc("getExitArg", params);
            },

            resetGeneric(...params) {
              invokeMethodViaRpc("resetGeneric", params);
            },
            resetGenericWithMemory(...params) {
              invokeMethodViaRpc("resetGenericWithMemory", params);
            },
            setNextProgramCounter(pc) {
              invokeMethodViaRpc("setNextProgramCounter", pc);
            },
            setGasLeft(gas) {
              invokeMethodViaRpc("setGasLeft", gas);
            },
            runMemory: async (...params) => {
              return await invokeMethodViaRpc("memory", params);
            },
            // nextStep: async (...params) => {
            //   return await invokeMethodViaRpc("nextStep", params);
            // },
            // getProgramCounter: async (...params) => {
            //   return await invokeMethodViaRpc("getProgramCounter", params);
            // },
          });
        }
      });

      socket.addEventListener("close", () => {
        console.log("Connection closed");
      });

      socket.addEventListener("error", (error) => {
        console.error("WebSocket error:", error);
      });

      const invokeMethodViaRpc = (method, ...params) => {
        const requestId = generateMessageId();

        const request = {
          jsonrpc: "2.0",
          method,
          params,
          id: requestId,
        };

        return new Promise((resolve, reject) => {
          const messageHandler = (message: any) => {
            const jsonResponse = JSON.parse(message.data);

            if (jsonResponse.id === requestId) {
              // if (message.id === requestId) {
              console.log("Received response:", message);
              resolve(jsonResponse.result);
              // resolve(message.result);

              socket.removeEventListener("message", messageHandler);
            }
          };

          socket.addEventListener("message", messageHandler);

          if (method === "resetGeneric" || method === "resetGenericWithMemory") {
            console.log("resetGenericWithMemory", method, params);
            request.params = params.map((param) => {
              return param?.map((p) => Array.from(p));
            });

            console.log("requestoooo", request);

            return socket.send(JSON.stringify(request));
          }

          socket.send(JSON.stringify(request));
          // socket.send(request);
        });
      };
    });
  }
};

export const runLoad = async (args: LoadParams): Promise<LoadResponse> => {
  try {
    const pvm = await load(args);
    const memorySize = await getMemorySize(pvm);
    if (pvm) {
      return { pvm, memorySize, status: CommandStatus.SUCCESS };
    }
  } catch (error) {
    return { pvm: null, memorySize: null, status: CommandStatus.ERROR, error };
  }

  return { pvm: null, memorySize: null, status: CommandStatus.ERROR, error: new Error("Unknown PVM type") };
};
