# Sprint 36 — Integration Smoke Test + Dev Bridge

Status: Implemented

## Goal

Add a dev-only test bridge on `window.__PVMDBG__` for E2E state manipulation and a cross-cutting Playwright smoke suite that validates the full debugger journey across all major program kinds.

## What Works After This Sprint

- `window.__PVMDBG__` is available in dev builds for E2E tests
- The bridge supports: get PVM ids, read snapshot, step, set register/PC/gas/memory, resume host call, query host-call metadata
- A single smoke suite validates JAM SPI, generic, trace, JSON vector, and uploaded program flows
- Each scenario verifies at least one real state transition
- The suite passes in under 120 seconds

## Prior Sprint Dependencies

- All prior sprints (this is the capstone test)

## Required Files

```
apps/web/src/lib/dev-bridge.ts
apps/web/e2e/integration-smoke.spec.ts
```

## Dev Bridge Contract

Expose on `window.__PVMDBG__` in dev mode only:

- `getPvmIds(): string[]`
- `getSnapshot(pvmId: string): object` (JSON-friendly, bigint → string)
- `step(count: number): Promise<void>`
- `setRegister(pvmId: string, index: number, value: string): void`
- `setPc(pvmId: string, value: string): void`
- `setGas(pvmId: string, value: string): void`
- `setMemory(pvmId: string, address: number, bytes: number[]): void`
- `resumeHostCall(pvmId: string): Promise<void>`
- `getHostCallInfo(pvmId: string): object | null`

Rules:

- gate to dev mode only (not in production builds)
- all returned data must be JSON-friendly (convert bigint to string)
- the bridge must not become part of the production API

## Smoke Suite Contract

The suite validates these flows:

1. **JAM SPI example**: load from bundled examples, confirm default entrypoint, verify format summary
2. **Generic program**: load and run to completion, verify execution result
3. **File upload**: upload a local `.pvm` file, run to completion
4. **State editing**: edit a register while paused, observe changed execution result
5. **Reset**: mutate state, reset, verify initial values restored
6. **Trace-backed example**: load, reach host-call pause, verify host-call and trace drawer state
7. **JSON test vector**: load, verify expected terminal status

Rules:

- run against the real dev server and interpreters
- prefer a single PVM for speed unless the scenario needs multiple
- use `data-testid` selectors
- total runtime under 120 seconds

## State Verification Contract

Assert real machine-state changes:

- gas decreases after a step
- a destination register changes after execution
- editing ω7 changes downstream results
- reset restores PC and registers
- run-to-completion reaches terminal status

Implementation pitfall: the host-call drawer auto-opens when a host call is reached. Tests should assert the rendered panel directly instead of clicking the already-active Host Call tab (which would collapse it).

## E2E Tests

```
- JAM SPI example loads with correct format summary
- generic program runs to completion
- file upload loads and runs
- register edit changes execution result
- reset restores initial state
- trace example reaches host-call drawer
- JSON vector reaches expected terminal status
```

## Acceptance Criteria

- The dev bridge is available in dev builds and omitted from production.
- The smoke suite exercises all major program kinds.
- Each scenario verifies a real state transition.
- The suite passes under 120 seconds.
- `cd apps/web && npx playwright test e2e/integration-smoke.spec.ts` succeeds.

## Verification

```bash
cd apps/web && npx playwright test e2e/integration-smoke.spec.ts
```

## Implementation Notes (discovered during implementation)

### Dev Bridge

- **Bridge methods are async**: `setRegister`, `setPc`, `setGas`, `setMemory` return `Promise<void>` (not `void` as originally spec'd) because the underlying orchestrator methods communicate with the web worker asynchronously. Callers must `await` these calls.
- **Bridge is only available in `vite dev` mode**, not `vite preview` (which serves a production build where `import.meta.env.PROD` is true). The Playwright config uses `vite preview`, so the current smoke suite uses UI selectors rather than the bridge. Future tests needing the bridge should run against `vite dev`.
- **Bridge is installed in `OrchestratorProvider`** via a `useEffect` that passes a callback to the orchestrator ref. This ensures the bridge always reads the latest orchestrator instance.

### Smoke Suite Pitfalls

- **Drawer tab IDs use underscores**: the trace tab is `drawer-tab-ecalli_trace` (not `drawer-tab-trace`). The host-call tab is `drawer-tab-host_call`.
- **Trace tab defaults to "formatted" view**: the `trace-raw-view` test ID is only visible when the user switches to "raw" mode via `view-mode-raw`. The default formatted view renders `trace-column-execution-trace` and `trace-column-reference-trace`.
- **The "add" fixture writes to r9, not r0**: `fixtures/generic/add.pvm` encodes `add_64 r9, r7, r8` (destination nibble is 0x9). Tests asserting the ADD result must check r9. Initial state: r7=1, r8=2 → r9=3 after one step.
- **Programs that run past their code end panic**: after the last instruction executes, the PVM typically panics (PC past end). Register values are preserved through panic — the status changes but the register file stays intact.

### Missing Coverage (potential follow-up)

- No unit test for `dev-bridge.ts` conversion logic (bigint→string, null orchestrator handling). Low priority since it's a thin wrapper.
- No smoke test exercises multi-PVM divergence detection. Could be added as a future scenario.
