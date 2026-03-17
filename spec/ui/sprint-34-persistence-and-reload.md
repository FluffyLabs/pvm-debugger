# Sprint 34 — Persistence + Reload

Status: Implemented

## Goal

Persist the loaded program session to localStorage so a browser refresh restores the debugger instead of losing the session. The restored state matches a fresh `Reset` — no mid-execution mutations survive.

## What Works After This Sprint

- Refreshing the page restores the same program at initial state
- The load wizard does not flash during successful restoration
- `Back to Loader` clears program persistence while keeping settings intact
- SPI entrypoint choices survive refresh
- Corrupted persistence falls back to the loader with an error alert

## Prior Sprint Dependencies

- Sprint 02: orchestrator initialization
- Sprint 12: wizard step 2 (envelope building)
- Sprint 13: SPI config (entrypoint persistence)
- Sprint 15: settings persistence (separate concern)

## Required Files

```
apps/web/src/hooks/usePersistence.ts
apps/web/e2e/sprint-34-persistence.spec.ts
```

## Persisted Program Contract

Persist after a successful program load using centralized storage keys:

- `pvmdbg:payload`
- `pvmdbg:source_meta`
- `pvmdbg:detected_format`
- `pvmdbg:spi_config`
- `pvmdbg:gas`

Rules:

- persist after successful load, not while editing the wizard
- payload bytes in a stable serialized form
- source metadata preserves enough to reconstruct `RawPayload`
- example-backed loads can reattach the example entry on restore
- SPI entrypoint parameters round-trip including byte arrays
- program persistence is separate from settings persistence

## Restore Gate Contract

Restoration runs before any route is rendered:

- synchronously check if a persisted payload exists
- while restoring, render a neutral gate (not the load wizard or debugger)
- after successful restore, navigate to `/`
- the load wizard must not flash during a successful restore

Implementation pitfall: React Strict Mode replays effects in dev. The restore effect must be cancellation-safe — no premature gate unlock or duplicate restores.

## Restore Semantics Contract

Refreshing restores:

- the loaded payload
- the effective detected format choice (including forced generic fallback)
- SPI entrypoint configuration
- the initial gas value
- debugger settings (via existing settings persistence)

Rules:

- rebuild `ProgramEnvelope` from persisted data
- load a fresh orchestrator with persisted PVM selection
- restored state matches initial loaded state (PC, gas, registers, memory)
- user edits made after execution starts do not survive refresh

## Clear Contract

`Back to Loader` clears persisted program state:

- remove program-session keys only
- keep settings persistence intact
- after clearing, a page refresh stays on `/load`

## Failure Contract

Corrupted/incomplete persisted data must fail safely:

- clear persisted program-session keys
- navigate to `/load`
- show alert: `Failed to restore previous session. Please load a program.`

## E2E Tests

```
- refreshing restores the same program at initial state
- Back to Loader clears program persistence
- stepping mode persists through refresh
- successful restore does not flash the load page
- SPI entrypoint changes survive refresh
- corrupted persistence falls back to loader with error alert
```

## Acceptance Criteria

- Browser refresh restores the loaded session.
- Restored state is fresh initial state, not mid-execution.
- No load-wizard flash during restore.
- Back to Loader clears program state, keeps settings.
- SPI config round-trips through persistence.
- Corrupted state is handled gracefully.
- `cd apps/web && npx vite build` succeeds.
- E2E tests pass.

## Verification

```bash
cd apps/web && npx vite build
npx playwright test e2e/sprint-34-persistence.spec.ts
```
