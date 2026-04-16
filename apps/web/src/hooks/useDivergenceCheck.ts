import type { MachineStateSnapshot, PvmLifecycle } from "@pvmdbg/types";
import { useMemo } from "react";

export interface DivergenceResult {
  /** Concise inline summary, e.g. "PC, Gas, 2 registers". Null when no divergence. */
  summary: string | null;
  /** Full per-field details for tooltip. Null when no divergence. */
  details: string | null;
}

/**
 * Compares the selected PVM's state against all other active PVMs.
 * Returns a concise summary and detailed per-field breakdown of any divergences.
 *
 * Rules:
 * - No output when fewer than 2 PVMs are active
 * - Uses "PC" (not "Pc") in user-facing text
 * - Summary is concise: "PC, Gas, 2 registers"
 * - Details list each divergent field with values
 */
export function useDivergenceCheck(
  snapshots: Map<
    string,
    { snapshot: MachineStateSnapshot; lifecycle: PvmLifecycle }
  >,
  selectedPvmId: string | null,
  _snapshotVersion: number,
): DivergenceResult {
  return useMemo(() => {
    if (snapshots.size < 2 || !selectedPvmId) {
      return { summary: null, details: null };
    }

    const selectedEntry = snapshots.get(selectedPvmId);
    if (!selectedEntry) {
      return { summary: null, details: null };
    }

    const selected = selectedEntry.snapshot;
    const selectedLifecycle = selectedEntry.lifecycle;

    const divergentFields: string[] = [];
    const detailLines: string[] = [];

    let pcDiverges = false;
    let statusDiverges = false;
    let gasDiverges = false;
    const divergentRegIndices = new Set<number>();

    for (const [
      pvmId,
      { snapshot: other, lifecycle: otherLifecycle },
    ] of snapshots) {
      if (pvmId === selectedPvmId) continue;

      if (selected.pc !== other.pc) {
        pcDiverges = true;
        detailLines.push(
          `PC: ${selectedPvmId}=0x${selected.pc.toString(16)}, ${pvmId}=0x${other.pc.toString(16)}`,
        );
      }

      if (
        selectedLifecycle !== otherLifecycle ||
        selected.status !== other.status
      ) {
        statusDiverges = true;
        detailLines.push(
          `Status: ${selectedPvmId}=${selected.status}/${selectedLifecycle}, ${pvmId}=${other.status}/${otherLifecycle}`,
        );
      }

      if (selected.gas !== other.gas) {
        gasDiverges = true;
        detailLines.push(
          `Gas: ${selectedPvmId}=${selected.gas.toString()}, ${pvmId}=${other.gas.toString()}`,
        );
      }

      for (let i = 0; i < selected.registers.length; i++) {
        if (selected.registers[i] !== other.registers[i]) {
          divergentRegIndices.add(i);
          detailLines.push(
            `\u03C6${i}: ${selectedPvmId}=0x${BigInt.asUintN(64, selected.registers[i]).toString(16)}, ${pvmId}=0x${BigInt.asUintN(64, other.registers[i]).toString(16)}`,
          );
        }
      }
    }

    if (pcDiverges) divergentFields.push("PC");
    if (statusDiverges) divergentFields.push("Status");
    if (gasDiverges) divergentFields.push("Gas");
    if (divergentRegIndices.size > 0) {
      divergentFields.push(
        divergentRegIndices.size === 1
          ? `1 register`
          : `${divergentRegIndices.size} registers`,
      );
    }

    if (divergentFields.length === 0) {
      return { summary: null, details: null };
    }

    return {
      summary: divergentFields.join(", "),
      details: detailLines.join("\n"),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snapshots, selectedPvmId]);
}
