# Sprint 02 — Load a Bundled Example (Happy Path)

## Goal

Enable loading a bundled example program through the simplest possible path: show a few example cards on the load page, click one, initialize the orchestrator, and navigate to the debugger page showing "Program loaded — OK."

This sprint introduces the orchestrator context and the minimal content-package integration needed to get a real program into memory.

## What Works After This Sprint

- Load page shows a short list of bundled example cards
- Clicking a card loads the program through the content package
- Orchestrator initializes with a single PVM (typeberry)
- Navigation to `/` succeeds and shows PVM status `OK`
- `/` redirects to `/load` when no program is loaded

## Prior Sprint Dependencies

- Sprint 01: app shell, routing, placeholder pages

## Required Files

```
apps/web/src/context/orchestrator.tsx
apps/web/src/hooks/useOrchestrator.ts
apps/web/src/pages/LoadPage.tsx          (replace placeholder)
apps/web/src/pages/DebuggerPage.tsx      (replace placeholder)
apps/web/src/lib/runtime.ts
apps/web/src/workers/typeberry.worker.ts
apps/web/e2e/sprint-02-load-example.spec.ts
```

## Orchestrator Context Contract

Provide a top-level context:

```ts
interface OrchestratorContextValue {
  orchestrator: Orchestrator | null;
  initialize: (pvmIds: string[]) => Orchestrator;
  teardown: () => void;
}
```

Rules:

- provider owns the orchestrator lifecycle
- `initialize()` replaces any prior instance
- `teardown()` shuts down and clears the current orchestrator
- provider calls teardown on unmount

## Load Page Contract

Show a simple list of bundled example cards sourced from `getExamplesManifest()`. Only bundled (non-remote) examples need to work in this sprint.

Rules:

- each card shows the example name
- clicking a card calls `loadExample()` from the content package
- after loading, build a `ProgramEnvelope` and call `orchestrator.loadProgram()`
- default to a single PVM (`typeberry`) via the browser worker bridge
- navigate to `/` on success

The full example browser (categories, remote examples, loading states) comes in Sprint 09. This sprint may hardcode which examples to show or show all bundled examples in a flat list.

## Debugger Page Contract

- redirect to `/load` when `orchestrator.getProgramBytes()` is falsy
- when a program is loaded, show the PVM id and its status
- use `data-testid="pvm-status-{id}"` for each loaded PVM status element

## Browser Runtime Notes

- Typeberry runs through the browser worker bridge
- Ananas currently uses a `DirectAdapter` fallback due to a worker deadlock issue
- keep the adapter factory isolated so the worker path can be restored later

## E2E Tests

```
- load page shows at least one example card
- clicking a bundled example navigates to the debugger page
- debugger page shows PVM status "OK"
- `/` without a loaded program redirects to `/load`
```

## Acceptance Criteria

- Load page shows bundled example cards.
- Clicking a card loads the program and navigates to `/`.
- Debugger page shows `OK` status for the loaded PVM.
- Route guard redirects to `/load` when no program is loaded.
- `cd apps/web && npx vite build` succeeds.
- E2E tests pass.

## Verification

```bash
cd apps/web && npx vite build
npx playwright test e2e/sprint-02-load-example.spec.ts
```
