# Sprint 01 — App Shell + Routing Skeleton

## Goal

Deliver the baseline web shell for `apps/web` with shared-ui chrome and route structure. After this sprint the app renders in a browser with header, sidebar, dark theme, and two placeholder routes.

## What Works After This Sprint

- App renders with shared-ui `Header`, `AppsSidebar`, and `Content`
- Dark mode is active by default
- `/load` renders a placeholder load page
- `/` redirects to `/load` (no program loaded yet)
- Unknown routes redirect to `/load`
- `npx vite build` succeeds

## Required Files

```
apps/web/src/App.tsx
apps/web/src/pages/LoadPage.tsx
apps/web/src/pages/DebuggerPage.tsx
apps/web/src/styles/global.css
apps/web/src/styles/layout.css
apps/web/e2e/sprint-01-app-shell.spec.ts
```

## Shell Contract

Use shared-ui components:

- `Header` — top bar with FluffyLabs branding and debugger tool name
- `AppsSidebar` — fixed left rail on desktop
- `Content` — fills remaining width

Layout rules:

- dark theme is the default
- header stays at the top
- sidebar occupies a fixed left rail on desktop
- content fills the remaining width
- all clickable elements use `cursor: pointer`
- shell styling should be dense, dark, and low-chrome

**Global UI rule — no icon-only buttons.** Every interactive button, toggle, and tab across the entire app must have a visible text label. Buttons may include an icon alongside the label, but the text must always be present and visible — not hidden behind a tooltip or `aria-label` alone. This rule applies to all sprints. Additionally, every button and toggle must carry an `aria-label` that describes its action for screen readers.

## Routing Contract

- `/load` renders `LoadPage` (placeholder text is fine)
- `/` renders `DebuggerPage`
- `DebuggerPage` redirects to `/load` unconditionally (no orchestrator yet)
- unknown routes redirect to `/load`

## Placeholder Pages

Both pages render inside the shell layout. They must not render their own header or sidebar.

- `LoadPage`: heading "Load Program" and placeholder body
- `DebuggerPage`: heading "Debugger" and redirect logic

## E2E Tests

```
- app shell shows header with branding, sidebar, and content area
- `/` redirects to `/load`
- `/load` renders the load page placeholder
- unknown route `/foo` redirects to `/load`
- sidebar dark-mode toggle is interactive
```

## Acceptance Criteria

- App shell renders with shared-ui `Header`, `AppsSidebar`, and `Content`.
- Dark mode is active by default.
- `/` redirects to `/load`.
- Unknown routes redirect to `/load`.
- Shell layout fills the viewport.
- All clickable elements use pointer cursor.
- No icon-only buttons exist — every button has a visible text label and an `aria-label`.
- `cd apps/web && npx vite build` succeeds.
- E2E tests pass.

## Verification

```bash
cd apps/web && npx vite build
npx playwright test e2e/sprint-01-app-shell.spec.ts
```
