import type { EcalliTrace, TraceEntry, TraceTermination } from "@pvmdbg/types";

/**
 * Format a bigint as "0x" + lowercase hex, without leading zeros (except for 0 → "0x0").
 */
function bigintHex(value: bigint): string {
  if (value === 0n) return "0x0";
  return `0x${value.toString(16)}`;
}

/**
 * Serialize a register dump Map into sorted "rNN=0x..." tokens.
 * Zero-valued registers are omitted per spec.
 */
function serializeRegisters(regs: Map<number, bigint>): string {
  const tokens: string[] = [];
  const sorted = [...regs.entries()].sort(([a], [b]) => a - b);
  for (const [idx, val] of sorted) {
    if (val === 0n) continue;
    const label = `r${idx.toString().padStart(2, "0")}`;
    tokens.push(`${label}=${bigintHex(val)}`);
  }
  return tokens.join(" ");
}

/**
 * Serialize an `EcalliTrace` back into canonical JIP-6 text.
 *
 * - Omits zero-valued registers from all register dumps.
 * - Outputs canonical lines without runner prefixes.
 */
export function serializeTrace(trace: EcalliTrace): string {
  const lines: string[] = [];
  const { prelude, entries, termination } = trace;

  // --- Prelude ---
  lines.push(`program 0x${prelude.programHex}`);

  for (const mw of prelude.memoryWrites) {
    const len = mw.dataHex.length / 2;
    lines.push(
      `memwrite 0x${mw.address.toString(16).padStart(8, "0")} len=${len} <- 0x${mw.dataHex}`,
    );
  }

  const startRegs = serializeRegisters(prelude.startRegisters);
  const startLine = `start pc=${prelude.startPc} gas=${prelude.startGas}${startRegs ? ` ${startRegs}` : ""}`;
  lines.push(startLine);

  // --- Entries ---
  for (const entry of entries) {
    const entryRegs = serializeRegisters(entry.registers);
    const ecalliLine = `ecalli=${entry.index} pc=${entry.pc} gas=${entry.gas}${entryRegs ? ` ${entryRegs}` : ""}`;
    lines.push(ecalliLine);

    serializeEntrySubCommands(entry, lines);
  }

  // --- Termination ---
  if (termination) {
    lines.push(serializeTermination(termination));
  }

  return `${lines.join("\n")}\n`;
}

function serializeEntrySubCommands(entry: TraceEntry, lines: string[]): void {
  // memread lines
  for (const mr of entry.memoryReads) {
    lines.push(
      `memread 0x${mr.address.toString(16).padStart(8, "0")} len=${mr.length} -> 0x${mr.dataHex}`,
    );
  }

  // memwrite lines
  for (const mw of entry.memoryWrites) {
    const len = mw.dataHex.length / 2;
    lines.push(
      `memwrite 0x${mw.address.toString(16).padStart(8, "0")} len=${len} <- 0x${mw.dataHex}`,
    );
  }

  // setreg lines
  const sortedRegWrites = [...entry.registerWrites.entries()].sort(
    ([a], [b]) => a - b,
  );
  for (const [idx, val] of sortedRegWrites) {
    lines.push(
      `setreg r${idx.toString().padStart(2, "0")} <- ${bigintHex(val)}`,
    );
  }

  // setgas
  if (entry.gasAfter !== undefined) {
    lines.push(`setgas <- ${entry.gasAfter}`);
  }
}

function serializeTermination(term: TraceTermination): string {
  const regs = serializeRegisters(term.registers);
  const regSuffix = regs ? ` ${regs}` : "";
  switch (term.kind) {
    case "halt":
      return `HALT pc=${term.pc} gas=${term.gas}${regSuffix}`;
    case "panic":
      return `PANIC=${term.arg ?? 0} pc=${term.pc} gas=${term.gas}${regSuffix}`;
    case "fault":
      return `FAULT=${term.arg ?? 0} pc=${term.pc} gas=${term.gas}${regSuffix}`;
    case "oog":
      return `OOG pc=${term.pc} gas=${term.gas}${regSuffix}`;
  }
}
