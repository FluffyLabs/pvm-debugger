import type {
  EcalliTrace,
  TraceEntry,
  TracePrelude,
  TraceTermination,
} from "@pvmdbg/types";

/**
 * Strip known runner-output wrappers from a trace line.
 * E.g. "TRACE [  ecalli] ecalli=1 ..." → "ecalli=1 ..."
 */
function stripPrefix(line: string): string {
  const match = line.match(/^TRACE\s+\[\s*ecalli\]\s+(.*)$/);
  return match ? match[1] : line;
}

/** Parse a register dump fragment like "r00=0xff r07=0x1" into a Map<number, bigint>. */
function parseRegisters(tokens: string[]): Map<number, bigint> {
  const regs = new Map<number, bigint>();
  for (const token of tokens) {
    const m = token.match(/^r(\d{2})=0x([0-9a-fA-F]+)$/);
    if (m) {
      regs.set(parseInt(m[1], 10), BigInt(`0x${m[2]}`));
    }
  }
  return regs;
}

/** Validate that hex data length matches declared len. */
function validateHexLen(
  hex: string,
  declaredLen: number,
  lineNum: number,
): void {
  // hex without 0x prefix
  const raw = hex.startsWith("0x") || hex.startsWith("0X") ? hex.slice(2) : hex;
  const actualLen = raw.length / 2;
  if (actualLen !== declaredLen) {
    throw new Error(
      `Line ${lineNum}: len=${declaredLen} does not match hex data length ${actualLen}`,
    );
  }
}

/** Remove 0x prefix from a hex string. */
function stripHexPrefix(hex: string): string {
  return hex.startsWith("0x") || hex.startsWith("0X") ? hex.slice(2) : hex;
}

/**
 * Parse JIP-6 ECALLI trace text into an `EcalliTrace`.
 *
 * Supports both raw trace files and traces wrapped in runner output
 * (e.g. lines prefixed with "TRACE [  ecalli] ").
 */
export function parseTrace(text: string): EcalliTrace {
  const rawLines = text.split("\n");

  // Pre-process: strip prefixes and filter to recognized trace lines.
  const traceLines: Array<{ text: string; lineNum: number }> = [];
  for (let i = 0; i < rawLines.length; i++) {
    const stripped = stripPrefix(rawLines[i]).trim();
    if (stripped.length === 0) continue;

    // Recognize trace lines by their leading keyword
    if (
      stripped.startsWith("program ") ||
      stripped.startsWith("memwrite ") ||
      stripped.startsWith("memread ") ||
      stripped.startsWith("start ") ||
      stripped.startsWith("ecalli=") ||
      stripped.startsWith("setreg ") ||
      stripped.startsWith("setgas ") ||
      stripped.startsWith("HALT ") ||
      stripped.startsWith("PANIC=") ||
      stripped.startsWith("FAULT=") ||
      stripped.startsWith("OOG ")
    ) {
      traceLines.push({ text: stripped, lineNum: i + 1 });
    }
  }

  // State machine: parse recognized trace lines
  let programHex: string | undefined;
  const preludeMemWrites: Array<{ address: number; dataHex: string }> = [];
  let startPc: number | undefined;
  let startGas: bigint | undefined;
  let startRegisters: Map<number, bigint> | undefined;

  const entries: TraceEntry[] = [];
  let currentEntry: TraceEntry | null = null;
  let termination: TraceTermination | undefined;

  let seenStart = false;

  for (const { text: line, lineNum } of traceLines) {
    // --- Prelude: program ---
    if (line.startsWith("program ")) {
      const hex = line.slice("program ".length).trim();
      programHex = stripHexPrefix(hex);
      continue;
    }

    // --- Prelude or Entry: memwrite ---
    if (line.startsWith("memwrite ")) {
      // memwrite 0x<addr> len=<len> <- 0x<hex>
      const m = line.match(
        /^memwrite\s+0x([0-9a-fA-F]+)\s+len=(\d+)\s+<-\s+0x([0-9a-fA-F]*)$/,
      );
      if (!m) {
        throw new Error(
          `Line ${lineNum}: malformed memwrite: ${line.slice(0, 80)}`,
        );
      }
      const address = parseInt(m[1], 16);
      const declaredLen = parseInt(m[2], 10);
      const dataHex = m[3];
      validateHexLen(dataHex, declaredLen, lineNum);

      if (!seenStart) {
        // Prelude memwrite
        preludeMemWrites.push({ address, dataHex });
      } else {
        // Must be inside a host call entry
        if (!currentEntry) {
          throw new Error(
            `Line ${lineNum}: memwrite outside of a host call entry`,
          );
        }
        currentEntry.memoryWrites.push({ address, dataHex });
      }
      continue;
    }

    // --- Prelude: start ---
    if (line.startsWith("start ")) {
      const tokens = line.slice("start ".length).trim().split(/\s+/);
      const pcToken = tokens.find((t) => t.startsWith("pc="));
      const gasToken = tokens.find((t) => t.startsWith("gas="));
      if (!pcToken || !gasToken) {
        throw new Error(`Line ${lineNum}: start line missing pc or gas`);
      }
      startPc = parseInt(pcToken.slice(3), 10);
      startGas = BigInt(gasToken.slice(4));
      startRegisters = parseRegisters(tokens);
      seenStart = true;
      continue;
    }

    // --- Host call entry ---
    if (line.startsWith("ecalli=")) {
      // Finalize previous entry if any
      if (currentEntry) {
        entries.push(currentEntry);
      }
      // ecalli=<index> pc=<pc> gas=<gas> [r00=0x<hex> ...]
      const tokens = line.split(/\s+/);
      const indexToken = tokens[0]; // ecalli=<N>
      const ecalliIndex = parseInt(indexToken.slice("ecalli=".length), 10);
      const pcToken = tokens.find((t) => t.startsWith("pc="));
      const gasToken = tokens.find((t) => t.startsWith("gas="));
      if (!pcToken || !gasToken) {
        throw new Error(`Line ${lineNum}: ecalli line missing pc or gas`);
      }

      currentEntry = {
        index: ecalliIndex,
        pc: parseInt(pcToken.slice(3), 10),
        gas: BigInt(gasToken.slice(4)),
        registers: parseRegisters(tokens),
        memoryReads: [],
        memoryWrites: [],
        registerWrites: new Map(),
        gasAfter: undefined,
      };
      continue;
    }

    // --- Entry sub-commands (only valid inside ecalli) ---
    if (line.startsWith("memread ")) {
      if (!currentEntry) {
        throw new Error(
          `Line ${lineNum}: memread outside of a host call entry`,
        );
      }
      // memread 0x<addr> len=<len> -> 0x<hex>
      const m = line.match(
        /^memread\s+0x([0-9a-fA-F]+)\s+len=(\d+)\s+->\s+0x([0-9a-fA-F]*)$/,
      );
      if (!m) {
        throw new Error(
          `Line ${lineNum}: malformed memread: ${line.slice(0, 80)}`,
        );
      }
      const address = parseInt(m[1], 16);
      const declaredLen = parseInt(m[2], 10);
      const dataHex = m[3];
      validateHexLen(dataHex, declaredLen, lineNum);
      currentEntry.memoryReads.push({ address, length: declaredLen, dataHex });
      continue;
    }

    if (line.startsWith("setreg ")) {
      if (!currentEntry) {
        throw new Error(`Line ${lineNum}: setreg outside of a host call entry`);
      }
      // setreg r<idx> <- 0x<hex>
      const m = line.match(/^setreg\s+r(\d+)\s+<-\s+0x([0-9a-fA-F]+)$/);
      if (!m) {
        throw new Error(`Line ${lineNum}: malformed setreg: ${line}`);
      }
      const regIdx = parseInt(m[1], 10);
      const value = BigInt(`0x${m[2]}`);
      currentEntry.registerWrites.set(regIdx, value);
      continue;
    }

    if (line.startsWith("setgas ")) {
      if (!currentEntry) {
        throw new Error(`Line ${lineNum}: setgas outside of a host call entry`);
      }
      // setgas <- <gas>
      const m = line.match(/^setgas\s+<-\s+(\d+)$/);
      if (!m) {
        throw new Error(`Line ${lineNum}: malformed setgas: ${line}`);
      }
      currentEntry.gasAfter = BigInt(m[1]);
      continue;
    }

    // --- Termination ---
    if (line.startsWith("HALT ")) {
      if (currentEntry) {
        entries.push(currentEntry);
        currentEntry = null;
      }
      const tokens = line.slice("HALT ".length).trim().split(/\s+/);
      const pcToken = tokens.find((t) => t.startsWith("pc="));
      const gasToken = tokens.find((t) => t.startsWith("gas="));
      if (!pcToken || !gasToken) {
        throw new Error(`Line ${lineNum}: HALT line missing pc or gas`);
      }
      termination = {
        kind: "halt",
        pc: parseInt(pcToken.slice(3), 10),
        gas: BigInt(gasToken.slice(4)),
        registers: parseRegisters(tokens),
      };
      continue;
    }

    if (line.startsWith("PANIC=")) {
      if (currentEntry) {
        entries.push(currentEntry);
        currentEntry = null;
      }
      // PANIC=<arg> pc=<pc> gas=<gas> [regs...]
      const tokens = line.split(/\s+/);
      const arg = parseInt(tokens[0].slice("PANIC=".length), 10);
      const pcToken = tokens.find((t) => t.startsWith("pc="));
      const gasToken = tokens.find((t) => t.startsWith("gas="));
      if (!pcToken || !gasToken) {
        throw new Error(`Line ${lineNum}: PANIC line missing pc or gas`);
      }
      termination = {
        kind: "panic",
        arg,
        pc: parseInt(pcToken.slice(3), 10),
        gas: BigInt(gasToken.slice(4)),
        registers: parseRegisters(tokens),
      };
      continue;
    }

    if (line.startsWith("FAULT=")) {
      if (currentEntry) {
        entries.push(currentEntry);
        currentEntry = null;
      }
      const tokens = line.split(/\s+/);
      const arg = parseInt(tokens[0].slice("FAULT=".length), 10);
      const pcToken = tokens.find((t) => t.startsWith("pc="));
      const gasToken = tokens.find((t) => t.startsWith("gas="));
      if (!pcToken || !gasToken) {
        throw new Error(`Line ${lineNum}: FAULT line missing pc or gas`);
      }
      termination = {
        kind: "fault",
        arg,
        pc: parseInt(pcToken.slice(3), 10),
        gas: BigInt(gasToken.slice(4)),
        registers: parseRegisters(tokens),
      };
      continue;
    }

    if (line.startsWith("OOG ")) {
      if (currentEntry) {
        entries.push(currentEntry);
        currentEntry = null;
      }
      const tokens = line.slice("OOG ".length).trim().split(/\s+/);
      const pcToken = tokens.find((t) => t.startsWith("pc="));
      const gasToken = tokens.find((t) => t.startsWith("gas="));
      if (!pcToken || !gasToken) {
        throw new Error(`Line ${lineNum}: OOG line missing pc or gas`);
      }
      termination = {
        kind: "oog",
        pc: parseInt(pcToken.slice(3), 10),
        gas: BigInt(gasToken.slice(4)),
        registers: parseRegisters(tokens),
      };
    }
  }

  // Finalize last entry if unterminated
  if (currentEntry) {
    entries.push(currentEntry);
  }

  // Validation: program and start are mandatory
  if (programHex === undefined) {
    throw new Error("Trace is missing mandatory 'program' line");
  }
  if (
    !seenStart ||
    startPc === undefined ||
    startGas === undefined ||
    startRegisters === undefined
  ) {
    throw new Error("Trace is missing mandatory 'start' line");
  }

  const prelude: TracePrelude = {
    programHex,
    memoryWrites: preludeMemWrites,
    startPc,
    startGas,
    startRegisters,
  };

  return { prelude, entries, termination };
}
