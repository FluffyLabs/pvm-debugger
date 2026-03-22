# Sprint 39 — Ananas PVM Support

Status: Implemented

## Goal

Enable the Ananas PVM interpreter (WASM-based `@fluffylabs/anan-as`) as a fully functional second PVM in the web debugger. All E2E tests must pass with 0 failures and 0 skips, including multi-PVM tests that were previously skipping due to the missing ananas implementation.

## Prior Sprint Dependencies

- Sprint 38 (UI polish, load flow improvements)
- Sprint 24 (multi-PVM tabs)
- Sprint 25 (divergence detection)

## What Works After This Sprint

### Ananas PVM Runtime

1. **Ananas web worker.** A new `apps/web/src/workers/ananas.worker.ts` initializes the Ananas WASM module (via `initAnanas()` from `@pvmdbg/runtime-worker`) and installs the worker command handler. Messages received during WASM initialization are queued and replayed once ready.

2. **Runtime adapter.** `apps/web/src/lib/runtime.ts` now creates `WorkerBridge` adapters for both `"typeberry"` and `"ananas"` PVM IDs. The ananas adapter uses the same `WorkerBridge` protocol as typeberry.

3. **ES module workers.** `vite.config.ts` sets `worker.format: "es"` to support the dynamic `import()` used by the Ananas WASM loader (`@fluffylabs/anan-as/release-inline`).

### Ananas `setPc` Alignment

4. **Immediate PC commits.** Ananas's `setNextProgramCounter()` API is deferred — `getProgramCounter()` returns the old value until `nextStep()` is called. The `AnanasSyncInterpreter.setPc()` method now calls `nextStep()` after `setNextProgramCounter()` to commit the change immediately (the same pattern already used in `doLoad` after reset). Gas is preserved by re-setting it before the virtual step. This eliminates PC divergence between typeberry and ananas after editing PC in the UI.

### Load Flow Respects PVM Selection

5. **Persisted PVM IDs used on load.** `LoadPage.loadDirectly` and `ConfigStep.handleLoad` previously hardcoded `initialize(["typeberry"])`. They now read `settings.selectedPvmIds` from the debugger settings context, so ananas (or any enabled PVM combination) is initialized on first load without requiring a manual toggle.

6. **Trace setup for all PVMs.** Both `LoadPage` and `ConfigStep` now set traces on all selected PVMs (`for (const pvmId of settings.selectedPvmIds) { orch.setTrace(pvmId, ...) }`), not just typeberry.

### Clean PVM Switching (No Stale State)

7. **Pending buffer cleared on orchestrator change.** `useOrchestratorState` now discards all pending buffered data (`pendingSnapshots`, `pendingHostCallInfo`, `pendingPerPvmErrors`, `pendingSelectedPvmId`) and cancels any scheduled RAF flush when the orchestrator instance changes. This prevents stale data from the old orchestrator leaking into the new one.

8. **Event handlers use fresh base.** The `onStateChanged`, `onTerminated`, and `onError` event handlers now use `new Map(initial)` (seeded from the new orchestrator's `getSnapshots()`) as their fallback base instead of the stale `snapshots` React state captured in the closure. This was the root cause of false divergence after disabling a PVM mid-session: the old PVM's snapshot persisted in the closure and was copied into every new accumulation map.

9. **Host call and error handlers use clean maps.** `onHostCallPaused` and error-clearing logic use `new Map()` as fallback base instead of stale closure state.

10. **Selected PVM preserved or reassigned.** When the orchestrator changes, `selectedPvmId` is kept if it still exists in the new orchestrator, otherwise reassigned to the first available PVM. Previously it could remain set to a disabled PVM.

### Unit Test Coverage

11. **Ananas `setPc` tests.** Five new unit tests for `AnanasSyncInterpreter` in `packages/runtime-worker/src/index.test.ts`:
    - `setPc` changes program counter immediately (not deferred)
    - `setPc` does not consume gas (the virtual `nextStep()` commit is gas-neutral)
    - `setPc` followed by `step` executes from the new PC
    - `setGas` changes gas
    - `setRegisters` changes registers
    These mirror the existing typeberry state-mutation tests and verify the `nextStep()` commit workaround is correct.

### E2E Test Improvements

12. **All multi-PVM tests pass.** Tests in sprint-24 (PVM tabs), sprint-25 (divergence detection), and sprint-30 (change highlighting) that previously skipped due to the missing ananas PVM now run and pass.

13. **Zero skips.** The full E2E suite runs 235 tests with 235 passed, 0 failed, 0 skipped.

14. **Robust tab switching tests.** PVM tab assertions use `toHaveAttribute("role", "tab")` to distinguish active PVM tabs (buttons) from inactive grayed-out PVMs (spans), matching the sprint-38 UI behavior.

15. **Divergence tests assert explicitly.** Sprint-25 divergence E2E tests no longer use conditional assertions that silently pass. They explicitly verify both PVMs agree after running the same program (no divergence), and that both reach matching terminal status dots.

## Files Changed

- `apps/web/src/workers/ananas.worker.ts` — **new** — Ananas web worker with WASM init + message queuing
- `apps/web/src/lib/runtime.ts` — Added ananas case to `createPvmAdapter`
- `apps/web/vite.config.ts` — Added `worker.format: "es"` for WASM dynamic import support
- `packages/runtime-worker/src/adapters/ananas.ts` — `setPc` now calls `nextStep()` to commit PC immediately
- `apps/web/src/pages/LoadPage.tsx` — Uses `settings.selectedPvmIds` instead of hardcoded `["typeberry"]`; sets trace on all selected PVMs
- `apps/web/src/components/load/ConfigStep.tsx` — Uses `settings.selectedPvmIds` instead of hardcoded `["typeberry"]`; sets trace on all selected PVMs
- `apps/web/src/hooks/useOrchestratorState.ts` — Clears pending buffers on orchestrator change; event handlers use `initial` (not stale closure) as fallback base; selected PVM reassigned if removed
- `apps/web/e2e/sprint-24-pvm-tabs.spec.ts` — Fixed multi-PVM tests for real ananas support
- `apps/web/e2e/sprint-25-divergence.spec.ts` — Fixed `tryEnableAnanas` assertion; replaced conditional no-op assertions with explicit divergence/agreement checks
- `apps/web/e2e/sprint-30-change-highlighting.spec.ts` — Fixed `tryEnableAnanas` assertion
- `packages/runtime-worker/src/index.test.ts` — Added 5 Ananas state-mutation unit tests (`setPc`, `setGas`, `setRegisters`)

## Acceptance Criteria

- `npm run build` succeeds with no errors.
- **All E2E tests pass** (`npm run test:e2e` — 235 passed, 0 failed, 0 skipped).
- **All unit tests pass** (`npx vitest run` — 543 passed across 21 files, including 55 runtime-worker tests).
- Enabling ananas PVM in settings creates a working second PVM that can load and execute programs.
- Ananas PVM is initialized on load when already enabled in persisted settings (no toggle off/on required).
- Editing PC in the UI produces identical immediate results on both typeberry and ananas (no divergence).
- PVM tab bar shows both typeberry and ananas as active tabs when both are enabled.
- Divergence detection works between the two PVM interpreters.
- Disabling a PVM reverts its tab to grayed-out state with no false divergence shown.
- Disabling a PVM mid-session does not leak stale snapshot data (no ghost divergence).
- `selectedPvmId` is reassigned to a valid PVM when the previously selected one is disabled.
- Trace-backed programs set traces on all selected PVMs, not just typeberry.

## Verify

```bash
npm run build
npm run test:e2e
npx vitest run packages/runtime-worker/src/index.test.ts
```
