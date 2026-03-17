/**
 * Dev-only test bridge exposed on `window.__PVMDBG__` for E2E state manipulation.
 * Gated to dev mode only — not included in production builds.
 */
import type { Orchestrator } from "@pvmdbg/orchestrator";
import type { MachineStateSnapshot, PvmLifecycle, HostCallInfo } from "@pvmdbg/types";

interface DevBridge {
  getPvmIds(): string[];
  getSnapshot(pvmId: string): object;
  step(count: number): Promise<void>;
  setRegister(pvmId: string, index: number, value: string): Promise<void>;
  setPc(pvmId: string, value: string): Promise<void>;
  setGas(pvmId: string, value: string): Promise<void>;
  setMemory(pvmId: string, address: number, bytes: number[]): Promise<void>;
  resumeHostCall(pvmId: string): Promise<void>;
  getHostCallInfo(pvmId: string): object | null;
}

declare global {
  interface Window {
    __PVMDBG__?: DevBridge;
  }
}

/** Convert a MachineStateSnapshot to a JSON-friendly object (bigint → string). */
function snapshotToJson(snapshot: MachineStateSnapshot, lifecycle: PvmLifecycle): object {
  return {
    pc: snapshot.pc,
    gas: snapshot.gas.toString(),
    status: snapshot.status,
    lifecycle,
    registers: snapshot.registers.map((r) => r.toString()),
  };
}

/** Convert HostCallInfo to a JSON-friendly object. */
function hostCallInfoToJson(info: HostCallInfo): object {
  return {
    pvmId: info.pvmId,
    hostCallIndex: info.hostCallIndex,
    hostCallName: info.hostCallName,
    currentState: snapshotToJson(info.currentState, "paused_host_call"),
    resumeProposal: info.resumeProposal
      ? {
          traceMatches: info.resumeProposal.traceMatches,
          mismatches: info.resumeProposal.mismatches,
          registerWrites: Object.fromEntries(
            [...info.resumeProposal.registerWrites.entries()].map(([k, v]) => [k, v.toString()]),
          ),
          gasAfter: info.resumeProposal.gasAfter?.toString(),
        }
      : undefined,
  };
}

/**
 * Install the dev bridge on `window.__PVMDBG__`.
 * The `getOrchestrator` callback returns the current orchestrator instance
 * (may be null if not yet initialized).
 */
export function installDevBridge(getOrchestrator: () => Orchestrator | null): void {
  if (import.meta.env.PROD) return;

  const bridge: DevBridge = {
    getPvmIds() {
      const orch = getOrchestrator();
      return orch ? orch.getPvmIds() : [];
    },

    getSnapshot(pvmId: string) {
      const orch = getOrchestrator();
      if (!orch) throw new Error("Orchestrator not initialized");
      const result = orch.getSnapshot(pvmId);
      if (!result) throw new Error(`Unknown PVM: ${pvmId}`);
      return snapshotToJson(result.snapshot, result.lifecycle);
    },

    async step(count: number) {
      const orch = getOrchestrator();
      if (!orch) throw new Error("Orchestrator not initialized");
      await orch.step(count);
    },

    async setRegister(pvmId: string, index: number, value: string) {
      const orch = getOrchestrator();
      if (!orch) throw new Error("Orchestrator not initialized");
      await orch.setRegisters(pvmId, new Map([[index, BigInt(value)]]));
    },

    async setPc(pvmId: string, value: string) {
      const orch = getOrchestrator();
      if (!orch) throw new Error("Orchestrator not initialized");
      await orch.setPc(pvmId, Number(value));
    },

    async setGas(pvmId: string, value: string) {
      const orch = getOrchestrator();
      if (!orch) throw new Error("Orchestrator not initialized");
      await orch.setGas(pvmId, BigInt(value));
    },

    async setMemory(pvmId: string, address: number, bytes: number[]) {
      const orch = getOrchestrator();
      if (!orch) throw new Error("Orchestrator not initialized");
      await orch.setMemory(pvmId, address, new Uint8Array(bytes));
    },

    async resumeHostCall(pvmId: string) {
      const orch = getOrchestrator();
      if (!orch) throw new Error("Orchestrator not initialized");
      const hc = orch.getPendingHostCall(pvmId);
      if (!hc) throw new Error(`No pending host call for PVM: ${pvmId}`);
      const effects = hc.resumeProposal
        ? {
            registerWrites: hc.resumeProposal.registerWrites,
            memoryWrites: hc.resumeProposal.memoryWrites,
            gasAfter: hc.resumeProposal.gasAfter,
          }
        : {};
      await orch.resumeHostCall(pvmId, effects);
    },

    getHostCallInfo(pvmId: string) {
      const orch = getOrchestrator();
      if (!orch) throw new Error("Orchestrator not initialized");
      const info = orch.getPendingHostCall(pvmId);
      return info ? hostCallInfoToJson(info) : null;
    },
  };

  window.__PVMDBG__ = bridge;
}
