import { describe, it, expect } from "vitest";
import { CLI_NAME, CLI_VERSION, parseArgs } from "./index.js";

describe("CLI metadata", () => {
  it("exports expected name and version", () => {
    expect(CLI_NAME).toBe("pvmdbg");
    expect(CLI_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });
});

describe("parseArgs", () => {
  it("extracts command from argv", () => {
    const result = parseArgs(["node", "script.js", "replay", "trace.log"]);
    expect(result.command).toBe("replay");
    expect(result.file).toBe("trace.log");
  });

  it("defaults to 'help' when no arguments given", () => {
    const result = parseArgs(["node", "script.js"]);
    expect(result.command).toBe("help");
    expect(result.file).toBeUndefined();
  });

  it("handles command without file argument", () => {
    const result = parseArgs(["node", "script.js", "version"]);
    expect(result.command).toBe("version");
    expect(result.file).toBeUndefined();
  });
});
