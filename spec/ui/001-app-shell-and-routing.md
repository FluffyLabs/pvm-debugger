# UI-001 - App Shell And Routing

## Purpose

Implement the baseline web shell for `apps/web`:

- shared-ui header and sidebar
- route split between load and debugger screens
- orchestrator provider at app scope
- a reactive orchestrator hook for future panels

## Required Files

```
apps/web/src/App.tsx
apps/web/src/context/orchestrator.tsx
apps/web/src/hooks/useOrchestrator.ts
apps/web/src/hooks/useOrchestratorState.ts
apps/web/src/pages/LoadPage.tsx
apps/web/src/pages/DebuggerPage.tsx
apps/web/src/styles/global.css
apps/web/src/styles/layout.css
apps/web/e2e/app-shell.spec.ts
```

## Shell Contract

Use shared-ui:

- `Header`
- `AppsSidebar`
- `Content`

Layout rules:

- dark theme is the default
- header stays at the top
- sidebar occupies a fixed left rail on desktop
- content fills the remaining width
- mobile collapses to a single content column when the sidebar is hidden

The header must visibly include FluffyLabs branding and the debugger tool name asset.

## Routing Contract

Routes:

- `/load` renders the load screen placeholder
- `/` renders the debugger route
- unknown routes redirect to `/load`

The debugger route must redirect to `/load` until a program is actually loaded. Checking `orchestrator.getProgramBytes()` is sufficient for the route guard.

## Orchestrator Context

Provide a top-level context value with:

```ts
interface OrchestratorContextValue {
  orchestrator: Orchestrator | null;
  initialize: (pvmIds: string[]) => Orchestrator;
  teardown: () => void;
}
```

Requirements:

- provider owns the orchestrator lifecycle
- `initialize()` replaces any prior orchestrator instance
- `teardown()` shuts down and clears the current orchestrator
- provider shutdown also happens on unmount

The initial implementation may create an empty orchestrator before later tickets attach real adapters.

## Reactive Hook Contract

`useOrchestratorState()` must expose:

```ts
interface OrchestratorReactiveState {
  snapshots: Map<string, { snapshot: MachineStateSnapshot; lifecycle: PvmLifecycle }>;
  selectedPvmId: string | null;
  hostCallInfo: Map<string, HostCallInfo>;
  isStepInProgress: boolean;
}
```

Requirements:

- subscribe to `pvmStateChanged`, `hostCallPaused`, `terminated`, and `error`
- remove all listeners during cleanup
- keep `selectedPvmId` stable when possible
- clear host-call info when a PVM leaves `paused_host_call`

## Styling Rules

- all clickable elements must resolve to a pointer cursor
- shell styling should be dense, dark, and low-chrome
- placeholder pages must already sit inside the final shell instead of rendering their own header

## Testing Requirements

Unit coverage:

- root route redirects to the load screen
- header branding renders inside the shell
- orchestrator provider renders and supplies context safely in tests

E2E coverage:

- app shell shows header, sidebar, and load content
- `/` redirects to `/load`
- the sidebar dark-mode toggle is interactive and can switch away from dark mode

Shared-ui dark-mode helpers depend on `localStorage`, so jsdom test setup must provide a working storage shim.

## Acceptance Criteria

- App shell renders with shared-ui `Header`, `AppsSidebar`, and `Content`.
- Dark mode is active by default.
- `/` redirects to `/load` until a program is loaded.
- The orchestrator provider wraps the routed app.
- `useOrchestratorState()` subscribes and unsubscribes cleanly from orchestrator events.
- Shell layout fills the viewport and keeps the content area responsive.
- All shell interactions use pointer cursors.
- `cd apps/web && npx vite build` succeeds.
- `npx playwright test e2e/app-shell.spec.ts` succeeds.

## Verification

```bash
cd apps/web && npx vite build
npx playwright test e2e/app-shell.spec.ts
npm test
```
