import { logger } from "@/utils/loggerService.tsx";
import { PvmApiInterface } from "@/packages/web-worker/types.ts";

const generateMessageId = () => Math.random().toString(36).substring(2);

// TODO: remove this when found a workaround for BigInt support in JSON.stringify
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error
BigInt.prototype["toJSON"] = function () {
  return this.toString();
};

export default function wasmFromWebsockets(): Promise<PvmApiInterface> {
  return new Promise((resolve, reject) => {
    // Connect to WebSocket server
    const socket = new WebSocket("ws://localhost:8765");

    socket.addEventListener("open", () => {
      logger.info("📡 Connected to server");

      // Send a JSON-RPC request
      const request = {
        jsonrpc: "2.0",
        method: "load",
        id: 1,
      };

      socket.send(JSON.stringify(request));
    });

    socket.addEventListener("message", (message: { data: string }) => {
      logger.info("📡 Received response:", message);

      const jsonResponse = JSON.parse(message.data);

      if (jsonResponse.result === "load") {
        const supportedMethodNames = [
          "reset",
          "nextStep",
          "getProgramCounter",
          "getStatus",
          "getGasLeft",
          "getRegisters",
          "getPageDump",
          "getExitArg",
          "resetGeneric",
          "resetGenericWithMemory",
          "runMemory",
        ];

        const resolveObj = supportedMethodNames.reduce(
          (acc, method) => {
            acc[method] = (...params: unknown[]) => invokeMethodViaRpc(method, params);
            return acc;
          },
          {} as Record<string, (...params: unknown[]) => unknown>,
        );

        resolve(resolveObj as unknown as PvmApiInterface);
      }
    });

    socket.addEventListener("close", () => {
      logger.info("📡 Connection closed");
    });

    socket.addEventListener("error", (error) => {
      logger.error("📡 WebSocket error:", { error });
      reject();
    });

    // eslint-disable-next-line  @typescript-eslint/no-explicit-any
    const invokeMethodViaRpc = (method: string, ...params: any[]) => {
      const requestId = generateMessageId();

      const request = {
        jsonrpc: "2.0",
        method,
        params,
        id: requestId,
      };

      return new Promise((resolve) => {
        const messageHandler = (message: { data: string }) => {
          const jsonResponse = JSON.parse(message.data);

          if (jsonResponse.id === requestId) {
            logger.info("📡 Received response:", message);

            if (jsonResponse.method === "getRegisters") {
              resolve(new Uint8Array(jsonResponse.result));
            }

            resolve(jsonResponse.result);
            socket.removeEventListener("message", messageHandler);
          }
        };

        socket.addEventListener("message", messageHandler);

        if (method === "resetGenericWithMemory") {
          const newParams = request.params[0];

          request.params = [
            newParams[0] ? Array.from(newParams[0]) : [],
            newParams[1] ? Array.from(newParams[1]) : [],
            newParams[2] ? Array.from(newParams[2]) : [],
            newParams[3] ? Array.from(newParams[3]) : [],
            newParams[4],
          ];
          return socket.send(JSON.stringify(request));
        }

        socket.send(JSON.stringify(request));
      });
    };
  });
}
