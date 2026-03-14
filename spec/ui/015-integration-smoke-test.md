# UI-015 - Integration Smoke Test

## Purpose

Provide a single Playwright smoke suite that validates the end-to-end debugger journey across the major supported program kinds.

This suite is intentionally broad rather than deep: it should prove that a real Vite-served app can load programs, drive execution, mutate state, surface host-call/trace UI, and complete programs without relying on mocks.

## Required Files

```
apps/web/e2e/integration-smoke.spec.ts
```

## Scope Contract

The smoke suite must cover these user-facing flows:

- load a JAM SPI example from bundled examples and confirm default entrypoint wiring
- load a generic bundled program and verify a real execution result
- upload a local program file and run it to completion
- edit paused machine state and observe the changed execution result
- reset a mutated machine back to its initial loaded state
- load a trace-backed example and reach host-call / trace drawer state
- load a JSON test vector and reach the expected terminal status

Rules:

- run against the real dev server and real interpreters
- prefer a single selected PVM for speed unless the scenario explicitly needs more
- use `data-testid` selectors throughout
- keep the total runtime comfortably below the 120 second budget

## Example Coverage Contract

The suite must exercise every major example kind exposed by the loader:

- `generic_pvm`
- `jam_spi_with_metadata`
- `trace_file`
- `json_test_vector`
- file-uploaded `.pvm` content

Rules:

- the JAM scenario must verify the detected format summary and default accumulate parameters before loading
- the trace scenario must prove the app reaches a paused host call and can render both host-call and execution/reference trace UI
- the JSON scenario must verify the expected terminal status from the vector metadata and from actual execution

## State Verification Contract

The smoke suite must assert real machine-state changes rather than only page presence.

Examples:

- gas decreases after a real step
- a destination register changes after `ADD`
- editing `ω7` changes the downstream `ω9` result
- reset restores PC and register values
- run-to-completion reaches a terminal status badge and completion affordance

Implementation pitfall:

- the host-call drawer auto-opens when a host call pause is reached. Tests should assert the rendered panel directly instead of blindly clicking the already-active Host Call tab, which would collapse the drawer.

## Acceptance Criteria

- The smoke suite exercises JAM, generic, trace, JSON, and uploaded program flows.
- Each scenario verifies at least one real state transition or final machine result.
- The trace scenario reaches both host-call and trace drawer UI using the real orchestrator/dev bridge.
- The suite passes reliably against the real web app in under 120 seconds.
- `cd apps/web && npx playwright test e2e/integration-smoke.spec.ts` succeeds.

## Verification

```bash
cd apps/web && npx playwright test e2e/integration-smoke.spec.ts
```
