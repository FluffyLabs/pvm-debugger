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
