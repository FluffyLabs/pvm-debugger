# Sprint 09 — Full Example Browser

Status: Implemented

## Goal

Replace the minimal example list from Sprint 02 with the full example browser: all six manifest categories, collapsible sections, remote examples with loading states, format badges, and error handling.

## What Works After This Sprint

- All six categories from `fixtures/examples.json` render
- Each category is collapsible and open by default
- Cards show example name and format badge
- Remote examples show `Remote` label and per-card loading state
- Bundled examples resolve byte size when possible
- Errors surface in an alert instead of crashing
- Clicking any example loads it and navigates to the debugger
- `entrypoint` and `initialState` metadata survive in the loaded payload

## Prior Sprint Dependencies

- Sprint 02: minimal example loading flow, orchestrator context

## Required Files

```
apps/web/src/components/load/ExampleList.tsx
apps/web/src/pages/LoadPage.tsx                (extend)
apps/web/e2e/sprint-09-example-browser.spec.ts
```

## Example Browser Contract

Use `getExamplesManifest()` and `loadExample()` from the content package.

Rules:

- render all six manifest categories
- each category is collapsible and open by default
- cards show example name and format badge
- remote examples show `Remote` label
- bundled examples show byte size when available
- remote example clicks show per-card loading state
- errors are surfaced in an alert, not a crash
- selecting an example card advances immediately (no separate Continue click)
- `entrypoint` and `initialState` metadata must survive in the loaded `RawPayload.exampleEntry`

## Layout Contract

The example browser occupies the right column of a two-column layout on the load page. On narrow screens, it stacks vertically.

The left column is a placeholder for future source inputs (Sprint 10–11). If no left-column content exists yet, the examples may take full width temporarily.

## E2E Tests

```
- all six example categories render
- categories are collapsible
- clicking a bundled example navigates to the debugger
- remote examples show loading state while fetching
- format badges are visible on example cards
- a failed remote fetch shows an error alert without crashing
```

## Acceptance Criteria

- All six categories from the manifest render.
- Categories are collapsible and open by default.
- Cards show name and format badge.
- Remote examples show loading state.
- Errors surface as alerts.
- Example clicks load and navigate immediately.
- `cd apps/web && npx vite build` succeeds.
- E2E tests pass.

## Verification

```bash
cd apps/web && npx vite build
npx playwright test e2e/sprint-09-example-browser.spec.ts
```

## Implementation Notes

### Architecture decisions
- `ExampleList` is a self-contained component in `apps/web/src/components/load/ExampleList.tsx`. It owns the load flow (load → create envelope → initialize orchestrator → navigate). `LoadPage` is now a thin wrapper.
- Collapse state uses a `Set<string>` of collapsed category IDs (default empty = all open).
- Format badge colors use shared-ui `Badge` component with `intent` mapping: info (Generic), success (JAM SPI), warning (JSON), primary (Trace).

### Known limitations
- **Byte size display not implemented.** The spec says "bundled examples show byte size when available" but the manifest (`fixtures/examples.json`) does not include file sizes. Displaying sizes would require fetching Content-Length headers for each bundled file at render time or extending the manifest schema. Deferred — could be added by adding a `size` field to the manifest entries.

### Edge cases & pitfalls
- Remote examples (those with `url` but no `file`) can fail due to CORS or network issues. The error is caught and displayed in an Alert; the page remains functional.
- All cards are disabled during any load operation (prevents double-loading).
- The `entrypoint` and `initialState` metadata survival is handled implicitly by `createProgramEnvelope()` which calls `findExampleEntry()` and applies `manifestEntrypointToParams()` / `manifestInitialStateOverrides()` — no extra code needed in the UI.

### Refactoring opportunity for future sprints
- When Sprint 10-11 add upload/URL/manual-input sources, the `loadExample → createProgramEnvelope → initialize → loadProgram → navigate` flow will be duplicated. At that point, extract a `useLoadProgram()` hook to share the pattern across source types.
