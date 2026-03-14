#!/usr/bin/env node

import { fileURLToPath } from "node:url";
import { replay } from "./replay.js";

export const CLI_NAME = "pvmdbg";
export const CLI_VERSION = "0.0.1";

const VALID_PVMS = ["typeberry", "ananas"] as const;
type PvmKind = (typeof VALID_PVMS)[number];

export interface ParsedArgs {
  command: string;
  file?: string;
  pvms: PvmKind[];
  timeout: number;
  verbose: boolean;
  help: boolean;
}

const USAGE = `Usage: ${CLI_NAME} replay <trace-file> [options]

Commands:
  replay <trace-file>   Replay a trace file through PVM interpreters

Options:
  --pvm <list>          Comma-separated PVM list: typeberry,ananas (default: typeberry)
  --timeout <ms>        Step timeout in milliseconds (default: 30000)
  --verbose             Print host-call replay progress
  --help                Show this help message`;

export function parseArgs(argv: string[]): ParsedArgs {
  const args = argv.slice(2);
  const result: ParsedArgs = {
    command: "help",
    pvms: ["typeberry"],
    timeout: 30000,
    verbose: false,
    help: false,
  };

  let i = 0;
  // First non-flag argument is the command
  if (i < args.length && !args[i].startsWith("--")) {
    result.command = args[i];
    i++;
  }

  // Second non-flag argument is the file (for replay command)
  if (i < args.length && !args[i].startsWith("--")) {
    result.file = args[i];
    i++;
  }

  // Parse flags
  while (i < args.length) {
    const arg = args[i];
    switch (arg) {
      case "--help":
        result.help = true;
        break;
      case "--verbose":
        result.verbose = true;
        break;
      case "--pvm": {
        i++;
        if (i >= args.length) {
          throw new Error("--pvm requires a value");
        }
        const pvmList = args[i].split(",").map((s) => s.trim());
        for (const pvm of pvmList) {
          if (!VALID_PVMS.includes(pvm as PvmKind)) {
            throw new Error(
              `Invalid --pvm value: "${pvm}". Valid options: ${VALID_PVMS.join(", ")}`,
            );
          }
        }
        result.pvms = pvmList as PvmKind[];
        break;
      }
      case "--timeout": {
        i++;
        if (i >= args.length) {
          throw new Error("--timeout requires a value");
        }
        const val = Number(args[i]);
        if (!Number.isFinite(val) || val <= 0) {
          throw new Error(`Invalid --timeout value: "${args[i]}". Must be a positive number.`);
        }
        result.timeout = val;
        break;
      }
      default:
        throw new Error(`Unknown option: ${arg}`);
    }
    i++;
  }

  return result;
}

async function main(): Promise<void> {
  let parsed: ParsedArgs;
  try {
    parsed = parseArgs(process.argv);
  } catch (err) {
    console.error(`Error: ${(err as Error).message}`);
    console.error(USAGE);
    process.exit(1);
  }

  if (parsed.help || parsed.command === "help") {
    console.log(USAGE);
    process.exit(0);
  }

  if (parsed.command !== "replay") {
    console.error(`Unknown command: ${parsed.command}`);
    console.error(USAGE);
    process.exit(1);
  }

  if (!parsed.file) {
    console.error("Error: replay command requires a trace file path");
    console.error(USAGE);
    process.exit(1);
  }

  try {
    const result = await replay(parsed.file, {
      pvms: parsed.pvms,
      timeoutMs: parsed.timeout,
      verbose: parsed.verbose,
      logger: (msg) => console.log(msg),
    });

    let allPassed = true;
    for (const [pvmId, pvmResult] of result.results) {
      if (pvmResult.passed) {
        console.log(`[${pvmId}] PASS`);
      } else {
        console.log(`[${pvmId}] FAIL`);
        for (const m of pvmResult.mismatches) {
          console.log(`  ${m.field}: expected=${m.expected} actual=${m.actual}`);
        }
        allPassed = false;
      }
    }

    process.exit(allPassed ? 0 : 1);
  } catch (err) {
    console.error(`Error: ${(err as Error).message}`);
    process.exit(1);
  }
}

// Only run main when executed directly (not when imported by tests)
if (
  typeof process !== "undefined" &&
  process.argv[1] &&
  fileURLToPath(import.meta.url) === process.argv[1]
) {
  main();
}
