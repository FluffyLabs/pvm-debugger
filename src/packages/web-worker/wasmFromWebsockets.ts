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

        // Add methods with different parameter handling
        // resolveObj.setNextProgramCounter = (pc: any) => invokeMethodViaRpc("setNextProgramCounter", pc);
        // resolveObj.setGasLeft = (gas: any) => invokeMethodViaRpc("setGasLeft", gas);

        resolve(resolveObj as unknown as PvmApiInterface);
      }
    });

    socket.addEventListener("close", () => {
      logger.info("📡 Connection closed");
    });

    socket.addEventListener("error", (error) => {
      logger.error("📡 WebSocket error:", error);
      reject();
    });

    const invokeMethodViaRpc = (method, ...params) => {
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
            resolve(jsonResponse.result);
            socket.removeEventListener("message", messageHandler);
          }
        };

        socket.addEventListener("message", messageHandler);

        if (method === "resetGeneric" || method === "resetGenericWithMemory") {
          request.params = params.map((param) => {
            return param?.map((p) => Array.from(p));
          });

          return socket.send(JSON.stringify(request));
        }

        socket.send(JSON.stringify(request));
      });
    };
  });
}
