import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { PvmTabs } from "./PvmTabs";
import type { MachineStateSnapshot, PvmLifecycle } from "@pvmdbg/types";

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

describe("PvmTabs", () => {
  it("returns null when snapshots is empty", () => {
    const { container } = render(
      <PvmTabs snapshots={new Map()} selectedPvmId={null} onSelect={() => {}} />,
    );
    expect(container.innerHTML).toBe("");
  });

  it("renders one tab per PVM", () => {
    const snapshots = makeSnapshots([
      ["typeberry", "paused"],
      ["ananas", "paused"],
    ]);
    render(<PvmTabs snapshots={snapshots} selectedPvmId="typeberry" onSelect={() => {}} />);

    expect(screen.getByTestId("pvm-tab-typeberry")).toBeDefined();
    expect(screen.getByTestId("pvm-tab-ananas")).toBeDefined();
  });

  it("marks the selected tab with aria-selected=true", () => {
    const snapshots = makeSnapshots([
      ["typeberry", "paused"],
      ["ananas", "paused"],
    ]);
    render(<PvmTabs snapshots={snapshots} selectedPvmId="ananas" onSelect={() => {}} />);

    expect(screen.getByTestId("pvm-tab-typeberry").getAttribute("aria-selected")).toBe("false");
    expect(screen.getByTestId("pvm-tab-ananas").getAttribute("aria-selected")).toBe("true");
  });

  it("calls onSelect with the pvmId when a tab is clicked", () => {
    const snapshots = makeSnapshots([
      ["typeberry", "paused"],
      ["ananas", "paused"],
    ]);
    const onSelect = vi.fn();
    render(<PvmTabs snapshots={snapshots} selectedPvmId="typeberry" onSelect={onSelect} />);

    fireEvent.click(screen.getByTestId("pvm-tab-ananas"));
    expect(onSelect).toHaveBeenCalledWith("ananas");
  });

  it("applies correct dot colors per lifecycle", () => {
    const snapshots = makeSnapshots([
      ["a", "paused"],
      ["b", "running"],
      ["c", "paused_host_call"],
      ["d", "terminated", { status: "halt" }],
      ["e", "failed"],
      ["f", "timed_out"],
    ]);
    render(<PvmTabs snapshots={snapshots} selectedPvmId="a" onSelect={() => {}} />);

    expect(screen.getByTestId("pvm-dot-a").className).toContain("bg-blue-500");
    expect(screen.getByTestId("pvm-dot-b").className).toContain("bg-green-500");
    expect(screen.getByTestId("pvm-dot-c").className).toContain("bg-amber-500");
    expect(screen.getByTestId("pvm-dot-d").className).toContain("bg-gray-500");
    expect(screen.getByTestId("pvm-dot-e").className).toContain("bg-red-500");
    expect(screen.getByTestId("pvm-dot-f").className).toContain("bg-red-500");
  });

  it("renders sr-only status text for backward-compat test IDs", () => {
    const snapshots = makeSnapshots([["typeberry", "paused"]]);
    render(<PvmTabs snapshots={snapshots} selectedPvmId="typeberry" onSelect={() => {}} />);

    const status = screen.getByTestId("pvm-status-typeberry");
    expect(status.textContent).toBe("OK");
  });

  it("shows divergence summary when provided", () => {
    const snapshots = makeSnapshots([
      ["typeberry", "paused"],
      ["ananas", "paused"],
    ]);
    render(
      <PvmTabs
        snapshots={snapshots}
        selectedPvmId="typeberry"
        onSelect={() => {}}
        divergenceSummary="PC, Gas"
        divergenceDetails="PC: typeberry=0x4, ananas=0x8\nGas: typeberry=999996, ananas=999998"
      />,
    );

    const summary = screen.getByTestId("divergence-summary");
    expect(summary.textContent).toContain("Divergence: PC, Gas");
    expect(summary.getAttribute("title")).toContain("PC:");
    expect(summary.getAttribute("title")).toContain("Gas:");
  });

  it("does not show divergence when summary is null", () => {
    const snapshots = makeSnapshots([
      ["typeberry", "paused"],
      ["ananas", "paused"],
    ]);
    render(
      <PvmTabs
        snapshots={snapshots}
        selectedPvmId="typeberry"
        onSelect={() => {}}
        divergenceSummary={null}
        divergenceDetails={null}
      />,
    );

    expect(screen.queryByTestId("divergence-summary")).toBeNull();
  });

  it("shows inline error text for failed PVM", () => {
    const snapshots = makeSnapshots([
      ["typeberry", "paused"],
      ["ananas", "failed"],
    ]);
    const errors = new Map([["ananas", "something broke"]]);
    render(
      <PvmTabs
        snapshots={snapshots}
        selectedPvmId="typeberry"
        onSelect={() => {}}
        perPvmErrors={errors}
      />,
    );

    const errorEl = screen.getByTestId("pvm-error-ananas");
    expect(errorEl.textContent).toBe("Error: something broke");
  });

  it("shows Timeout for timed-out PVM", () => {
    const snapshots = makeSnapshots([
      ["typeberry", "paused"],
      ["ananas", "timed_out"],
    ]);
    render(
      <PvmTabs
        snapshots={snapshots}
        selectedPvmId="typeberry"
        onSelect={() => {}}
        perPvmErrors={new Map([["ananas", "step timeout"]])}
      />,
    );

    const errorEl = screen.getByTestId("pvm-error-ananas");
    expect(errorEl.textContent).toBe("Timeout");
  });

  it("does not show error text for healthy PVMs", () => {
    const snapshots = makeSnapshots([
      ["typeberry", "paused"],
      ["ananas", "paused"],
    ]);
    render(
      <PvmTabs
        snapshots={snapshots}
        selectedPvmId="typeberry"
        onSelect={() => {}}
      />,
    );

    expect(screen.queryByTestId("pvm-error-typeberry")).toBeNull();
    expect(screen.queryByTestId("pvm-error-ananas")).toBeNull();
  });
});
