import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, act } from "@testing-library/react";
import { RegistersPanel } from "./RegistersPanel";
import type { MachineStateSnapshot, PvmLifecycle, HostCallInfo, HostCallResumeProposal } from "@pvmdbg/types";

afterEach(cleanup);

function makeSnapshot(overrides?: Partial<MachineStateSnapshot>): MachineStateSnapshot {
  return {
    pc: 0,
    gas: 1_000_000n,
    status: "ok",
    registers: Array(13).fill(0n),
    ...overrides,
  };
}

function makeSnapshots(
  entries: Array<[string, PvmLifecycle, Partial<MachineStateSnapshot>?]>,
): Map<string, { snapshot: MachineStateSnapshot; lifecycle: PvmLifecycle }> {
  return new Map(
    entries.map(([id, lifecycle, overrides]) => [id, { snapshot: makeSnapshot(overrides), lifecycle }]),
  );
}

const noHostCalls = new Map<string, HostCallInfo>();

describe("RegistersPanel — Change Highlighting", () => {
  it("shows no delta markers on first render", () => {
    const snap = makeSnapshot();
    render(
      <RegistersPanel
        snapshot={snap}
        lifecycle="paused"
        orchestrator={null}
        selectedPvmId="typeberry"
        snapshots={makeSnapshots([["typeberry", "paused"]])}
        hostCallInfo={noHostCalls}
      />,
    );
    // No delta markers should exist (no previous snapshot to compare against)
    expect(screen.queryByTestId("register-delta-0")).toBeNull();
    expect(screen.queryByTestId("pc-delta")).toBeNull();
    expect(screen.queryByTestId("gas-delta")).toBeNull();
  });

  it("shows delta markers when registers change between renders", () => {
    const snap1 = makeSnapshot({ registers: Array(13).fill(0n) });
    const snap2Regs = Array(13).fill(0n);
    snap2Regs[3] = 42n;
    const snap2 = makeSnapshot({ registers: snap2Regs, pc: 4, gas: 999_990n });

    const { rerender } = render(
      <RegistersPanel
        snapshot={snap1}
        lifecycle="paused"
        orchestrator={null}
        selectedPvmId="typeberry"
        snapshots={makeSnapshots([["typeberry", "paused"]])}
        hostCallInfo={noHostCalls}
      />,
    );

    // Re-render with changed snapshot
    rerender(
      <RegistersPanel
        snapshot={snap2}
        lifecycle="paused"
        orchestrator={null}
        selectedPvmId="typeberry"
        snapshots={makeSnapshots([["typeberry", "paused", { registers: snap2Regs, pc: 4, gas: 999_990n }]])}
        hostCallInfo={noHostCalls}
      />,
    );

    // ω3 changed → should have delta
    expect(screen.getByTestId("register-delta-3")).toBeDefined();
    // ω0 did not change → no delta
    expect(screen.queryByTestId("register-delta-0")).toBeNull();
    // PC changed → delta
    expect(screen.getByTestId("pc-delta")).toBeDefined();
    // Gas changed → delta
    expect(screen.getByTestId("gas-delta")).toBeDefined();
  });

  it("clears delta markers when values stop changing", () => {
    const snap1 = makeSnapshot();
    const snap2Regs = Array(13).fill(0n);
    snap2Regs[5] = 100n;
    const snap2 = makeSnapshot({ registers: snap2Regs, pc: 4 });
    // snap3 has same values as snap2 (no further changes)
    const snap3 = makeSnapshot({ registers: [...snap2Regs], pc: 4 });

    const { rerender } = render(
      <RegistersPanel
        snapshot={snap1}
        lifecycle="paused"
        orchestrator={null}
        selectedPvmId="typeberry"
        snapshots={makeSnapshots([["typeberry", "paused"]])}
        hostCallInfo={noHostCalls}
      />,
    );

    // Step 1→2: ω5 changes
    rerender(
      <RegistersPanel
        snapshot={snap2}
        lifecycle="paused"
        orchestrator={null}
        selectedPvmId="typeberry"
        snapshots={makeSnapshots([["typeberry", "paused", { registers: snap2Regs, pc: 4 }]])}
        hostCallInfo={noHostCalls}
      />,
    );
    expect(screen.getByTestId("register-delta-5")).toBeDefined();

    // Step 2→3: nothing changes
    rerender(
      <RegistersPanel
        snapshot={snap3}
        lifecycle="paused"
        orchestrator={null}
        selectedPvmId="typeberry"
        snapshots={makeSnapshots([["typeberry", "paused", { registers: [...snap2Regs], pc: 4 }]])}
        hostCallInfo={noHostCalls}
      />,
    );
    // Delta should be gone — values didn't change between snap2 and snap3
    expect(screen.queryByTestId("register-delta-5")).toBeNull();
  });

  it("resets delta markers when selected PVM changes", () => {
    const snap1 = makeSnapshot();
    const snap2Regs = Array(13).fill(0n);
    snap2Regs[0] = 1n;
    const snap2 = makeSnapshot({ registers: snap2Regs, pc: 2 });
    const otherSnap = makeSnapshot({ registers: Array(13).fill(99n), pc: 10 });

    const { rerender } = render(
      <RegistersPanel
        snapshot={snap1}
        lifecycle="paused"
        orchestrator={null}
        selectedPvmId="typeberry"
        snapshots={makeSnapshots([["typeberry", "paused"]])}
        hostCallInfo={noHostCalls}
      />,
    );

    // Update with changes
    rerender(
      <RegistersPanel
        snapshot={snap2}
        lifecycle="paused"
        orchestrator={null}
        selectedPvmId="typeberry"
        snapshots={makeSnapshots([["typeberry", "paused", { registers: snap2Regs, pc: 2 }]])}
        hostCallInfo={noHostCalls}
      />,
    );
    expect(screen.getByTestId("register-delta-0")).toBeDefined();

    // Switch PVM — should NOT show spurious deltas
    rerender(
      <RegistersPanel
        snapshot={otherSnap}
        lifecycle="paused"
        orchestrator={null}
        selectedPvmId="ananas"
        snapshots={makeSnapshots([["ananas", "paused", { registers: Array(13).fill(99n), pc: 10 }]])}
        hostCallInfo={noHostCalls}
      />,
    );
    // No deltas — comparison reset because PVM changed
    expect(screen.queryByTestId("register-delta-0")).toBeNull();
    expect(screen.queryByTestId("pc-delta")).toBeNull();
    expect(screen.queryByTestId("gas-delta")).toBeNull();
  });
});

describe("RegistersPanel — Multi-PVM Divergence", () => {
  it("shows no divergence indicators with a single PVM", () => {
    render(
      <RegistersPanel
        snapshot={makeSnapshot()}
        lifecycle="paused"
        orchestrator={null}
        selectedPvmId="typeberry"
        snapshots={makeSnapshots([["typeberry", "paused"]])}
        hostCallInfo={noHostCalls}
      />,
    );
    expect(screen.queryByTestId("register-divergence-0")).toBeNull();
  });

  it("shows divergence indicators when PVM registers differ", () => {
    const selectedRegs = Array(13).fill(0n);
    const otherRegs = Array(13).fill(0n);
    otherRegs[7] = 999n;

    const snapshots = new Map<string, { snapshot: MachineStateSnapshot; lifecycle: PvmLifecycle }>([
      ["typeberry", { snapshot: makeSnapshot({ registers: selectedRegs }), lifecycle: "paused" }],
      ["ananas", { snapshot: makeSnapshot({ registers: otherRegs }), lifecycle: "paused" }],
    ]);

    render(
      <RegistersPanel
        snapshot={makeSnapshot({ registers: selectedRegs })}
        lifecycle="paused"
        orchestrator={null}
        selectedPvmId="typeberry"
        snapshots={snapshots}
        hostCallInfo={noHostCalls}
      />,
    );

    // ω7 differs → divergence indicator
    expect(screen.getByTestId("register-divergence-7")).toBeDefined();
    // ω0 matches → no indicator
    expect(screen.queryByTestId("register-divergence-0")).toBeNull();
  });
});

describe("RegistersPanel — Pending Changes", () => {
  it("shows pending changes when host call has a resume proposal", async () => {
    const proposal: HostCallResumeProposal = {
      registerWrites: new Map([[7, 42n]]),
      memoryWrites: [],
      gasAfter: 500_000n,
      traceMatches: true,
      mismatches: [],
    };

    const hostCallInfo = new Map<string, HostCallInfo>([
      ["typeberry", {
        pvmId: "typeberry",
        hostCallIndex: 0,
        hostCallName: "gas",
        currentState: makeSnapshot(),
        resumeProposal: proposal,
      }],
    ]);

    render(
      <RegistersPanel
        snapshot={makeSnapshot()}
        lifecycle="paused_host_call"
        orchestrator={null}
        selectedPvmId="typeberry"
        snapshots={makeSnapshots([["typeberry", "paused_host_call"]])}
        hostCallInfo={hostCallInfo}
      />,
    );

    // PendingChanges has a 300ms debounce, wait for it
    await act(async () => {
      await new Promise((r) => setTimeout(r, 350));
    });

    expect(screen.getByTestId("pending-changes")).toBeDefined();
    expect(screen.getByTestId("pending-register-writes")).toBeDefined();
    expect(screen.getByTestId("pending-gas-change")).toBeDefined();
  });

  it("does not show pending changes without a resume proposal", () => {
    const hostCallInfo = new Map<string, HostCallInfo>([
      ["typeberry", {
        pvmId: "typeberry",
        hostCallIndex: 0,
        hostCallName: "gas",
        currentState: makeSnapshot(),
        // no resumeProposal
      }],
    ]);

    render(
      <RegistersPanel
        snapshot={makeSnapshot()}
        lifecycle="paused_host_call"
        orchestrator={null}
        selectedPvmId="typeberry"
        snapshots={makeSnapshots([["typeberry", "paused_host_call"]])}
        hostCallInfo={hostCallInfo}
      />,
    );

    expect(screen.queryByTestId("pending-changes")).toBeNull();
  });
});
