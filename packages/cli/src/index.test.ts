import { describe, expect, it } from "vitest";
import { CLI_NAME, CLI_VERSION, parseArgs } from "./index.js";

describe("CLI metadata", () => {
  it("exports expected name and version", () => {
    expect(CLI_NAME).toBe("pvmdbg");
    expect(CLI_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });
});

describe("parseArgs", () => {
  it("extracts command and file from argv", () => {
    const result = parseArgs(["node", "script.js", "replay", "trace.log"]);
    expect(result.command).toBe("replay");
    expect(result.file).toBe("trace.log");
  });

  it("defaults to help when no arguments given", () => {
    const result = parseArgs(["node", "script.js"]);
    expect(result.command).toBe("help");
    expect(result.file).toBeUndefined();
  });

  it("handles --help flag", () => {
    const result = parseArgs([
      "node",
      "script.js",
      "replay",
      "trace.log",
      "--help",
    ]);
    expect(result.help).toBe(true);
  });

  it("handles --verbose flag", () => {
    const result = parseArgs([
      "node",
      "script.js",
      "replay",
      "trace.log",
      "--verbose",
    ]);
    expect(result.verbose).toBe(true);
  });

  it("parses --pvm option with single value", () => {
    const result = parseArgs([
      "node",
      "script.js",
      "replay",
      "trace.log",
      "--pvm",
      "ananas",
    ]);
    expect(result.pvms).toEqual(["ananas"]);
  });

  it("parses --pvm option with comma-separated values", () => {
    const result = parseArgs([
      "node",
      "script.js",
      "replay",
      "trace.log",
      "--pvm",
      "typeberry,ananas",
    ]);
    expect(result.pvms).toEqual(["typeberry", "ananas"]);
  });

  it("throws on invalid --pvm value", () => {
    expect(() =>
      parseArgs([
        "node",
        "script.js",
        "replay",
        "trace.log",
        "--pvm",
        "invalid",
      ]),
    ).toThrow(/Invalid --pvm value/);
  });

  it("parses --timeout option", () => {
    const result = parseArgs([
      "node",
      "script.js",
      "replay",
      "trace.log",
      "--timeout",
      "5000",
    ]);
    expect(result.timeout).toBe(5000);
  });

  it("throws on invalid --timeout value", () => {
    expect(() =>
      parseArgs([
        "node",
        "script.js",
        "replay",
        "trace.log",
        "--timeout",
        "abc",
      ]),
    ).toThrow(/Invalid --timeout value/);
  });

  it("throws on negative --timeout value", () => {
    expect(() =>
      parseArgs([
        "node",
        "script.js",
        "replay",
        "trace.log",
        "--timeout",
        "-1",
      ]),
    ).toThrow(/Invalid --timeout value/);
  });

  it("throws on missing --pvm value", () => {
    expect(() =>
      parseArgs(["node", "script.js", "replay", "trace.log", "--pvm"]),
    ).toThrow(/--pvm requires a value/);
  });

  it("throws on missing --timeout value", () => {
    expect(() =>
      parseArgs(["node", "script.js", "replay", "trace.log", "--timeout"]),
    ).toThrow(/--timeout requires a value/);
  });

  it("throws on unknown option", () => {
    expect(() =>
      parseArgs(["node", "script.js", "replay", "trace.log", "--unknown"]),
    ).toThrow(/Unknown option/);
  });

  it("uses default values", () => {
    const result = parseArgs(["node", "script.js", "replay", "trace.log"]);
    expect(result.pvms).toEqual(["typeberry"]);
    expect(result.timeout).toBe(30000);
    expect(result.verbose).toBe(false);
    expect(result.help).toBe(false);
  });
});
