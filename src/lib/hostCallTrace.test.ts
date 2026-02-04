import { describe, it, expect } from "vitest";
import { parseTrace, getTraceSummary } from "./hostCallTrace";
import * as fs from "fs";
import * as path from "path";

describe("hostCallTrace", () => {
  describe("parseTrace", () => {
    it("should parse a simple trace", () => {
      const trace = `program 0x0102aabbccdd
memwrite 0x00001000 len=8 <- 0x0000000000000001
start pc=0 gas=10000 r07=0x10

ecalli=10 pc=42 gas=9980 r01=0x1 r03=0x1000
memread 0x00001000 len=4 -> 0x01020304
setreg r00 <- 0x100
setgas <- 9950

HALT pc=50 gas=9920 r00=0x100`;

      const result = parseTrace(trace);

      expect(result.prelude.program).toBe("0x0102aabbccdd");
      expect(result.prelude.start).toEqual({
        pc: 0,
        gas: 10000n,
        registers: new Map([[7, 0x10n]]),
      });
      expect(result.prelude.initialMemoryWrites).toHaveLength(1);
      expect(result.hostCalls).toHaveLength(1);
      expect(result.hostCalls[0].index).toBe(10);
      expect(result.hostCalls[0].pc).toBe(42);
      expect(result.termination?.reason.type).toBe("HALT");
    });

    it("should parse trace with logging prefix", () => {
      const trace = `INFO  [test-runner] Some context
TRACE [  ecalli] program 0xaabbccdd
TRACE [  ecalli] memwrite 0x00001000 len=4 <- 0x01020304
TRACE [  ecalli] start pc=5 gas=100000 r00=0xffff0000
TRACE [  ecalli] ecalli=1 pc=100 gas=99900 r00=0x1
TRACE [  ecalli] setreg r07 <- 0x10
TRACE [  ecalli] setgas <- 99890
TRACE [  ecalli] HALT pc=200 gas=99800`;

      const result = parseTrace(trace);

      expect(result.prelude.program).toBe("0xaabbccdd");
      expect(result.prelude.start?.pc).toBe(5);
      expect(result.prelude.start?.gas).toBe(100000n);
      expect(result.hostCalls).toHaveLength(1);
      expect(result.termination?.reason.type).toBe("HALT");
    });

    it("should handle malformed hex gracefully", () => {
      const trace = `program 0xaabb
start pc=0 gas=1000`;

      const result = parseTrace(trace);

      expect(result.prelude.program).toBe("0xaabb");
      expect(result.prelude.start?.pc).toBe(0);
    });
  });

  describe("io-trace-output.log", () => {
    it("should parse the real trace file", () => {
      const tracePath = path.join(__dirname, "../../io-trace-output.log");

      if (!fs.existsSync(tracePath)) {
        console.warn("Skipping test: io-trace-output.log not found");
        return;
      }

      const content = fs.readFileSync(tracePath, "utf-8");
      const result = parseTrace(content);

      expect(result.errors).toHaveLength(0);
      expect(result.prelude.program).toBeTruthy();
      expect(result.prelude.start).toBeTruthy();
      expect(result.prelude.start?.pc).toBe(0);
      expect(result.prelude.start?.gas).toBe(100000n);
      expect(result.hostCalls.length).toBeGreaterThan(0);
      expect(result.termination?.reason.type).toBe("HALT");

      const summary = getTraceSummary(result);
      expect(summary.hasProgram).toBe(true);
      expect(summary.hasTermination).toBe(true);
      expect(summary.hostCallCount).toBeGreaterThan(0);
    });
  });
});
