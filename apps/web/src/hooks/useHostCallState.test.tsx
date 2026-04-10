import type {
  HostCallInfo,
  MachineStateSnapshot,
  PvmLifecycle,
} from "@pvmdbg/types";
import { renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { DrawerProvider } from "../components/debugger/DrawerContext";
import { useHostCallState } from "./useHostCallState";

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

function makeHostCallInfo(pvmId: string): HostCallInfo {
  return {
    pvmId,
    hostCallIndex: 1,
    hostCallName: "fetch",
    currentState: makeSnapshot({ status: "host" }),
  };
}

function wrapper({ children }: { children: ReactNode }) {
  return <DrawerProvider>{children}</DrawerProvider>;
}

describe("useHostCallState", () => {
  it("returns active host call when paused at host call", () => {
    const info = makeHostCallInfo("typeberry");
    const hostCallInfo = new Map([["typeberry", info]]);
    const snapshots = makeSnapshots([["typeberry", "paused_host_call"]]);

    const { result } = renderHook(
      () => useHostCallState(hostCallInfo, "typeberry", snapshots, false),
      { wrapper },
    );

    expect(result.current.activeHostCall).toBe(info);
  });

  it("returns null when lifecycle is not paused_host_call", () => {
    const info = makeHostCallInfo("typeberry");
    const hostCallInfo = new Map([["typeberry", info]]);
    const snapshots = makeSnapshots([["typeberry", "paused"]]);

    const { result } = renderHook(
      () => useHostCallState(hostCallInfo, "typeberry", snapshots, false),
      { wrapper },
    );

    expect(result.current.activeHostCall).toBeNull();
  });

  it("returns null when isRunning is true even if paused at host call", () => {
    const info = makeHostCallInfo("typeberry");
    const hostCallInfo = new Map([["typeberry", info]]);
    const snapshots = makeSnapshots([["typeberry", "paused_host_call"]]);

    const { result } = renderHook(
      () => useHostCallState(hostCallInfo, "typeberry", snapshots, true),
      { wrapper },
    );

    expect(result.current.activeHostCall).toBeNull();
  });

  it("returns null when no selectedPvmId", () => {
    const hostCallInfo = new Map<string, HostCallInfo>();
    const snapshots = makeSnapshots([["typeberry", "paused_host_call"]]);

    const { result } = renderHook(
      () => useHostCallState(hostCallInfo, null, snapshots, false),
      { wrapper },
    );

    expect(result.current.activeHostCall).toBeNull();
  });

  it("returns null when hostCallInfo has no entry for the selected PVM", () => {
    const hostCallInfo = new Map<string, HostCallInfo>();
    const snapshots = makeSnapshots([["typeberry", "paused_host_call"]]);

    const { result } = renderHook(
      () => useHostCallState(hostCallInfo, "typeberry", snapshots, false),
      { wrapper },
    );

    expect(result.current.activeHostCall).toBeNull();
  });

  it("transitions from active to null when isRunning becomes true", () => {
    const info = makeHostCallInfo("typeberry");
    const hostCallInfo = new Map([["typeberry", info]]);
    const snapshots = makeSnapshots([["typeberry", "paused_host_call"]]);

    const { result, rerender } = renderHook(
      ({ isRunning }) =>
        useHostCallState(hostCallInfo, "typeberry", snapshots, isRunning),
      { wrapper, initialProps: { isRunning: false } },
    );

    expect(result.current.activeHostCall).toBe(info);

    rerender({ isRunning: true });
    expect(result.current.activeHostCall).toBeNull();
  });
});
