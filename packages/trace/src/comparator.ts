import type { EcalliTrace } from "@pvmdbg/types";
import { fromHex } from "@pvmdbg/types";
import type { TraceMismatch } from "./types.js";

/**
 * Convert a trace memory write (with hex data) into bytes.
 * Uses `fromHex` from `@pvmdbg/types` — no duplicate hex-decoding logic.
 */
export function traceMemoryWriteToBytes(write: {
  address: number;
  dataHex: string;
}): { address: number; data: Uint8Array } {
  return {
    address: write.address,
    data: fromHex(write.dataHex),
  };
}

/**
 * Compare two `EcalliTrace` objects and return structured mismatch diagnostics.
 *
 * Covers prelude, every entry, and termination — with field-level paths.
 */
export function compareTraces(
  a: EcalliTrace,
  b: EcalliTrace,
): TraceMismatch[] {
  const mismatches: TraceMismatch[] = [];

  // --- Prelude ---
  compareScalar(mismatches, "prelude.programHex", a.prelude.programHex, b.prelude.programHex);
  compareScalar(mismatches, "prelude.startPc", a.prelude.startPc, b.prelude.startPc);
  compareBigint(mismatches, "prelude.startGas", a.prelude.startGas, b.prelude.startGas);
  compareRegisterMaps(mismatches, "prelude.startRegisters", a.prelude.startRegisters, b.prelude.startRegisters);
  compareMemoryWriteArrays(mismatches, "prelude.memoryWrites", a.prelude.memoryWrites, b.prelude.memoryWrites);

  // --- Entries ---
  const maxEntries = Math.max(a.entries.length, b.entries.length);
  if (a.entries.length !== b.entries.length) {
    mismatches.push({
      path: "entries.length",
      message: `Entry count differs: ${a.entries.length} vs ${b.entries.length}`,
      expected: a.entries.length,
      actual: b.entries.length,
    });
  }

  for (let i = 0; i < maxEntries; i++) {
    const ea = a.entries[i];
    const eb = b.entries[i];
    const prefix = `entries[${i}]`;

    if (!ea) {
      mismatches.push({ path: prefix, message: `Entry missing in trace A`, expected: undefined, actual: eb });
      continue;
    }
    if (!eb) {
      mismatches.push({ path: prefix, message: `Entry missing in trace B`, expected: ea, actual: undefined });
      continue;
    }

    compareScalar(mismatches, `${prefix}.index`, ea.index, eb.index);
    compareScalar(mismatches, `${prefix}.pc`, ea.pc, eb.pc);
    compareBigint(mismatches, `${prefix}.gas`, ea.gas, eb.gas);
    compareRegisterMaps(mismatches, `${prefix}.registers`, ea.registers, eb.registers);

    // memoryReads
    const maxReads = Math.max(ea.memoryReads.length, eb.memoryReads.length);
    if (ea.memoryReads.length !== eb.memoryReads.length) {
      mismatches.push({
        path: `${prefix}.memoryReads.length`,
        message: `Memory reads count differs`,
        expected: ea.memoryReads.length,
        actual: eb.memoryReads.length,
      });
    }
    for (let j = 0; j < maxReads; j++) {
      const ra = ea.memoryReads[j];
      const rb = eb.memoryReads[j];
      const rp = `${prefix}.memoryReads[${j}]`;
      if (!ra || !rb) {
        mismatches.push({
          path: rp,
          message: !ra ? "Memory read missing in trace A" : "Memory read missing in trace B",
          expected: ra,
          actual: rb,
        });
        continue;
      }
      compareScalar(mismatches, `${rp}.address`, ra.address, rb.address);
      compareScalar(mismatches, `${rp}.length`, ra.length, rb.length);
      compareScalar(mismatches, `${rp}.dataHex`, ra.dataHex, rb.dataHex);
    }

    // memoryWrites
    compareMemoryWriteArrays(mismatches, `${prefix}.memoryWrites`, ea.memoryWrites, eb.memoryWrites);

    // registerWrites
    compareRegisterMaps(mismatches, `${prefix}.registerWrites`, ea.registerWrites, eb.registerWrites);

    // gasAfter
    if (ea.gasAfter !== eb.gasAfter) {
      if (ea.gasAfter === undefined || eb.gasAfter === undefined || ea.gasAfter !== eb.gasAfter) {
        mismatches.push({
          path: `${prefix}.gasAfter`,
          message: `gasAfter differs`,
          expected: ea.gasAfter === undefined ? undefined : ea.gasAfter.toString(),
          actual: eb.gasAfter === undefined ? undefined : eb.gasAfter.toString(),
        });
      }
    }
  }

  // --- Termination ---
  if (a.termination && !b.termination) {
    mismatches.push({ path: "termination", message: "Termination present in A but missing in B", expected: a.termination, actual: undefined });
  } else if (!a.termination && b.termination) {
    mismatches.push({ path: "termination", message: "Termination missing in A but present in B", expected: undefined, actual: b.termination });
  } else if (a.termination && b.termination) {
    const ta = a.termination;
    const tb = b.termination;
    compareScalar(mismatches, "termination.kind", ta.kind, tb.kind);
    compareScalar(mismatches, "termination.arg", ta.arg, tb.arg);
    compareScalar(mismatches, "termination.pc", ta.pc, tb.pc);
    compareBigint(mismatches, "termination.gas", ta.gas, tb.gas);
    compareRegisterMaps(mismatches, "termination.registers", ta.registers, tb.registers);
  }

  return mismatches;
}

// --- Helpers ---

function compareScalar(
  mismatches: TraceMismatch[],
  path: string,
  expected: unknown,
  actual: unknown,
): void {
  if (expected !== actual) {
    mismatches.push({
      path,
      message: `Value differs: ${String(expected)} vs ${String(actual)}`,
      expected,
      actual,
    });
  }
}

function compareBigint(
  mismatches: TraceMismatch[],
  path: string,
  expected: bigint,
  actual: bigint,
): void {
  if (expected !== actual) {
    mismatches.push({
      path,
      message: `Value differs: ${expected} vs ${actual}`,
      expected: expected.toString(),
      actual: actual.toString(),
    });
  }
}

function compareRegisterMaps(
  mismatches: TraceMismatch[],
  path: string,
  a: Map<number, bigint>,
  b: Map<number, bigint>,
): void {
  const allKeys = new Set([...a.keys(), ...b.keys()]);
  for (const key of [...allKeys].sort((x, y) => x - y)) {
    const va = a.get(key);
    const vb = b.get(key);
    if (va !== vb) {
      mismatches.push({
        path: `${path}[${key}]`,
        message: `Register ${key} differs: ${va?.toString() ?? "absent"} vs ${vb?.toString() ?? "absent"}`,
        expected: va?.toString(),
        actual: vb?.toString(),
      });
    }
  }
}

function compareMemoryWriteArrays(
  mismatches: TraceMismatch[],
  path: string,
  a: Array<{ address: number; dataHex: string }>,
  b: Array<{ address: number; dataHex: string }>,
): void {
  const maxLen = Math.max(a.length, b.length);
  if (a.length !== b.length) {
    mismatches.push({
      path: `${path}.length`,
      message: `Memory writes count differs`,
      expected: a.length,
      actual: b.length,
    });
  }
  for (let i = 0; i < maxLen; i++) {
    const wa = a[i];
    const wb = b[i];
    const wp = `${path}[${i}]`;
    if (!wa || !wb) {
      mismatches.push({
        path: wp,
        message: !wa ? "Memory write missing in trace A" : "Memory write missing in trace B",
        expected: wa,
        actual: wb,
      });
      continue;
    }
    compareScalar(mismatches, `${wp}.address`, wa.address, wb.address);
    compareScalar(mismatches, `${wp}.dataHex`, wa.dataHex, wb.dataHex);
  }
}
