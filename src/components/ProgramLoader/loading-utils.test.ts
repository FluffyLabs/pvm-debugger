import { describe, it, expect, vi } from "vitest";
import * as fs from "fs";
import * as path from "path";

describe("loadingUtils", () => {
  describe("tryParseTraceFile via loadFileFromUint8Array", () => {
    it("should load io-trace-output.log without throwing", async () => {
      const tracePath = path.join(__dirname, "../../../io-trace-output.log");

      if (!fs.existsSync(tracePath)) {
        console.warn("Skipping test: io-trace-output.log not found");
        return;
      }

      const content = fs.readFileSync(tracePath);
      const uint8Array = new Uint8Array(content);

      const { loadFileFromUint8Array } = await import("./loading-utils");

      const setError = vi.fn();
      const onFileUpload = vi.fn();
      const initialState = {
        pc: 0,
        gas: 1000000n,
        regs: [0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n] as [
          bigint,
          bigint,
          bigint,
          bigint,
          bigint,
          bigint,
          bigint,
          bigint,
          bigint,
          bigint,
          bigint,
          bigint,
          bigint,
        ],
      };

      expect(() => {
        loadFileFromUint8Array("io-trace-output.log", uint8Array, null, setError, onFileUpload, initialState);
      }).not.toThrow();

      if (setError.mock.calls.length > 0) {
        console.error("Error set:", setError.mock.calls[0][0]);
      }

      expect(setError).not.toHaveBeenCalledWith(expect.stringContaining("error"));
      expect(onFileUpload).toHaveBeenCalled();

      const uploadedData = onFileUpload.mock.calls[0][0];
      expect(uploadedData).toBeDefined();
      expect(uploadedData.kind).toContain("Trace");
      expect(uploadedData.program).toBeDefined();
      expect(uploadedData.initial).toBeDefined();
      expect(uploadedData.initial.pc).toBe(0);

      expect(uploadedData.kind).toBe("Ecalli Trace (SPI)");
      expect(typeof uploadedData.initial.gas).toBe("bigint");
      expect(uploadedData.initial.pageMap?.length).toBeGreaterThan(0);
      expect(uploadedData.initial.memory?.length).toBeGreaterThan(0);
    });
  });
});
