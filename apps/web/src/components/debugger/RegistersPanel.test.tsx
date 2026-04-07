import type { MachineStateSnapshot, PvmLifecycle } from "@pvmdbg/types";
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type {
  PendingChangesData,
  UsePendingChanges,
} from "../../hooks/usePendingChanges";
import { RegistersPanel } from "./RegistersPanel";

afterEach(cleanup);

function makeSnapshot(
  overrides?: Partial<MachineStateSnapshot>,
): MachineStateSnapshot {
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
    entries.map(([id, lifecycle, overrides]) => [
      id,
      { snapshot: makeSnapshot(overrides), lifecycle },
    ]),
  );
}

const noop = () => {};

function makePendingChanges(
  pending: PendingChangesData | null = null,
): UsePendingChanges {
  return {
    pending,
    setRegister: noop,
    setGas: noop,
    writeMemory: noop,
    removeMemoryWrite: noop,
    getEffects: () => null,
    clear: noop,
  };
}

const noPending = makePendingChanges();

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
        pendingChanges={noPending}
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
        pendingChanges={noPending}
      />,
    );

    // Re-render with changed snapshot
    rerender(
      <RegistersPanel
        snapshot={snap2}
        lifecycle="paused"
        orchestrator={null}
        selectedPvmId="typeberry"
        snapshots={makeSnapshots([
          [
            "typeberry",
            "paused",
            { registers: snap2Regs, pc: 4, gas: 999_990n },
          ],
        ])}
        pendingChanges={noPending}
      />,
    );

    // omega3 changed -> should have delta
    expect(screen.getByTestId("register-delta-3")).toBeDefined();
    // omega0 did not change -> no delta
    expect(screen.queryByTestId("register-delta-0")).toBeNull();
    // PC changed -> delta
    expect(screen.getByTestId("pc-delta")).toBeDefined();
    // Gas changed -> delta
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
        pendingChanges={noPending}
      />,
    );

    // Step 1->2: omega5 changes
    rerender(
      <RegistersPanel
        snapshot={snap2}
        lifecycle="paused"
        orchestrator={null}
        selectedPvmId="typeberry"
        snapshots={makeSnapshots([
          ["typeberry", "paused", { registers: snap2Regs, pc: 4 }],
        ])}
        pendingChanges={noPending}
      />,
    );
    expect(screen.getByTestId("register-delta-5")).toBeDefined();

    // Step 2->3: nothing changes
    rerender(
      <RegistersPanel
        snapshot={snap3}
        lifecycle="paused"
        orchestrator={null}
        selectedPvmId="typeberry"
        snapshots={makeSnapshots([
          ["typeberry", "paused", { registers: [...snap2Regs], pc: 4 }],
        ])}
        pendingChanges={noPending}
      />,
    );
    // Delta should be gone -- values didn't change between snap2 and snap3
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
        pendingChanges={noPending}
      />,
    );

    // Update with changes
    rerender(
      <RegistersPanel
        snapshot={snap2}
        lifecycle="paused"
        orchestrator={null}
        selectedPvmId="typeberry"
        snapshots={makeSnapshots([
          ["typeberry", "paused", { registers: snap2Regs, pc: 2 }],
        ])}
        pendingChanges={noPending}
      />,
    );
    expect(screen.getByTestId("register-delta-0")).toBeDefined();

    // Switch PVM -- should NOT show spurious deltas
    rerender(
      <RegistersPanel
        snapshot={otherSnap}
        lifecycle="paused"
        orchestrator={null}
        selectedPvmId="ananas"
        snapshots={makeSnapshots([
          ["ananas", "paused", { registers: Array(13).fill(99n), pc: 10 }],
        ])}
        pendingChanges={noPending}
      />,
    );
    // No deltas -- comparison reset because PVM changed
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
        pendingChanges={noPending}
      />,
    );
    expect(screen.queryByTestId("register-divergence-0")).toBeNull();
  });

  it("shows divergence indicators when PVM registers differ", () => {
    const selectedRegs = Array(13).fill(0n);
    const otherRegs = Array(13).fill(0n);
    otherRegs[7] = 999n;

    const snapshots = new Map<
      string,
      { snapshot: MachineStateSnapshot; lifecycle: PvmLifecycle }
    >([
      [
        "typeberry",
        {
          snapshot: makeSnapshot({ registers: selectedRegs }),
          lifecycle: "paused",
        },
      ],
      [
        "ananas",
        {
          snapshot: makeSnapshot({ registers: otherRegs }),
          lifecycle: "paused",
        },
      ],
    ]);

    render(
      <RegistersPanel
        snapshot={makeSnapshot({ registers: selectedRegs })}
        lifecycle="paused"
        orchestrator={null}
        selectedPvmId="typeberry"
        snapshots={snapshots}
        pendingChanges={noPending}
      />,
    );

    // omega7 differs -> divergence indicator
    expect(screen.getByTestId("register-divergence-7")).toBeDefined();
    // omega0 matches -> no indicator
    expect(screen.queryByTestId("register-divergence-0")).toBeNull();
  });
});

describe("RegistersPanel — Pending Changes", () => {
  it("shows pending changes when pendingChanges has data", async () => {
    const pending: PendingChangesData = {
      registerWrites: new Map([[7, 42n]]),
      memoryWrites: [],
      gasAfter: 500_000n,
    };

    render(
      <RegistersPanel
        snapshot={makeSnapshot()}
        lifecycle="paused_host_call"
        orchestrator={null}
        selectedPvmId="typeberry"
        snapshots={makeSnapshots([["typeberry", "paused_host_call"]])}
        pendingChanges={makePendingChanges(pending)}
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

  it("does not show pending changes when pendingChanges.pending is null", () => {
    render(
      <RegistersPanel
        snapshot={makeSnapshot()}
        lifecycle="paused_host_call"
        orchestrator={null}
        selectedPvmId="typeberry"
        snapshots={makeSnapshots([["typeberry", "paused_host_call"]])}
        pendingChanges={makePendingChanges()}
      />,
    );

    expect(screen.queryByTestId("pending-changes")).toBeNull();
  });
});
