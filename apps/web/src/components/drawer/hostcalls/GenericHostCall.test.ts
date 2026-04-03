import { describe, it, expect } from "vitest";
import { parseAllCommands } from "./GenericHostCall";

describe("parseAllCommands", () => {
  it("parses setreg command", () => {
    const { effects, errors } = parseAllCommands("setreg r07 <- 0x2a");
    expect(errors).toHaveLength(0);
    expect(effects.registerWrites.get(7)).toBe(0x2an);
  });

  it("parses memwrite command", () => {
    const { effects, errors } = parseAllCommands(
      "memwrite 0x00001000 len=2 <- 0xaabb",
    );
    expect(errors).toHaveLength(0);
    expect(effects.memoryWrites).toHaveLength(1);
    expect(effects.memoryWrites[0].address).toBe(0x1000);
    expect(Array.from(effects.memoryWrites[0].data)).toEqual([0xaa, 0xbb]);
  });

  it("parses setgas command", () => {
    const { effects, errors } = parseAllCommands("setgas <- 500000");
    expect(errors).toHaveLength(0);
    expect(effects.gasAfter).toBe(500000n);
  });

  it("ignores blank lines", () => {
    const { effects, errors } = parseAllCommands("\n\nsetreg r00 <- 1\n\n");
    expect(errors).toHaveLength(0);
    expect(effects.registerWrites.get(0)).toBe(1n);
  });

  it("ignores comment lines starting with #", () => {
    const input = "# This is a comment\nsetreg r07 <- 0xff\n# Another comment";
    const { effects, errors } = parseAllCommands(input);
    expect(errors).toHaveLength(0);
    expect(effects.registerWrites.size).toBe(1);
    expect(effects.registerWrites.get(7)).toBe(0xffn);
  });

  it("reports errors with line numbers", () => {
    const input = "setreg r07 <- 0x1\nbad command\nsetreg r00 <- 2";
    const { errors } = parseAllCommands(input);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("Line 2:");
  });

  it("sorts register writes by index", () => {
    const input = "setreg r07 <- 1\nsetreg r00 <- 2\nsetreg r03 <- 3";
    const { effects } = parseAllCommands(input);
    const indices = [...effects.registerWrites.keys()];
    expect(indices).toEqual([0, 3, 7]);
  });

  it("rejects register index out of range", () => {
    const { errors } = parseAllCommands("setreg r13 <- 1");
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("out of range");
  });

  it("rejects memwrite with mismatched length", () => {
    const { errors } = parseAllCommands(
      "memwrite 0x00001000 len=4 <- 0xaabb",
    );
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("does not match");
  });

  it("handles multiple commands of all types", () => {
    const input = [
      "setreg r07 <- 0x86",
      "memwrite 0x00002000 len=2 <- 0xccdd",
      "setgas <- 99000",
    ].join("\n");
    const { effects, errors } = parseAllCommands(input);
    expect(errors).toHaveLength(0);
    expect(effects.registerWrites.get(7)).toBe(0x86n);
    expect(effects.memoryWrites).toHaveLength(1);
    expect(effects.gasAfter).toBe(99000n);
  });

  it("returns empty effects for empty input", () => {
    const { effects, errors } = parseAllCommands("");
    expect(errors).toHaveLength(0);
    expect(effects.registerWrites.size).toBe(0);
    expect(effects.memoryWrites).toHaveLength(0);
    expect(effects.gasAfter).toBeUndefined();
  });

  it("last setgas wins when multiple are specified", () => {
    const input = "setgas <- 100\nsetgas <- 200";
    const { effects } = parseAllCommands(input);
    expect(effects.gasAfter).toBe(200n);
  });
});
