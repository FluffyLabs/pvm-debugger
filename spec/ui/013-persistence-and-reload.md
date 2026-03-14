# UI-013 - Persistence and Reload

## Purpose

Persist enough program-session state to restore the currently loaded debugger session after a browser refresh.

The restored session must behave like a fresh `Reset`, not like a serialized mid-execution snapshot.

## Required Files

```
apps/web/src/hooks/usePersistence.ts
apps/web/e2e/persistence.spec.ts
```

## Persisted Program Contract

Persist the currently loaded program session using the centralized storage keys:

- `pvmdbg:payload`
- `pvmdbg:source_meta`
- `pvmdbg:detected_format`
- `pvmdbg:spi_config`
- `pvmdbg:gas`

Rules:

- persist after a successful program load, not while the user is still editing the wizard
- payload bytes must be stored in a stable serialized form
- source metadata must preserve enough information to reconstruct `RawPayload`
- example-backed loads must be able to reattach the corresponding example entry on restore
- SPI entrypoint parameters must round-trip, including refine payload/package byte arrays
- program persistence must remain separate from debugger settings persistence

## Restore Gate Contract

Program restoration runs before any debugger/load route is rendered.

Rules:

- synchronously check whether a persisted payload exists
- while a restore is in progress, render a neutral gate instead of the load wizard or debugger routes
- after successful restore, navigate directly to `/`
- the load wizard must not flash during a successful restore

Implementation pitfall:

- React Strict Mode replays effects in development. The restore effect must be cancellation-safe so the probe mount does not prematurely unlock the gate or kick off duplicate restores.

## Restore Semantics Contract

Refreshing the page restores:

- the loaded payload
- the effective detected format choice, including forced generic fallback
- SPI entrypoint configuration
- the initial gas value used for the loaded envelope
- debugger settings via the existing settings persistence layer

Rules:

- rebuild the `ProgramEnvelope` from the persisted payload/config
- load a fresh orchestrator instance with the persisted PVM selection
- restored state must match the initial loaded state (`pc`, gas, registers, memory prelude)
- user edits made after execution starts must not survive refresh

## Clear Contract

`Back to Loader` clears persisted program state.

Rules:

- remove program-session keys only
- keep settings persistence intact
- after clearing, a page refresh must stay on `/load`

## Failure Contract

Corrupted or incomplete persisted session data must fail safely.

Rules:

- clear the persisted program-session keys
- navigate to `/load`
- show a destructive alert: `Failed to restore previous session. Please load a program.`

## Testing Requirements

E2E coverage must prove:

- refreshing restores the same program at initial state
- `Back to Loader` clears program persistence
- stepping mode still persists through refresh while program restoration succeeds
- a successful restore does not flash the load page
- SPI entrypoint changes survive refresh and restore the correct initial PC/config
- corrupted persistence falls back to the loader with an error alert

## Acceptance Criteria

- Refreshing a loaded debugger session restores the same program automatically.
- The restored program starts from fresh initial state, not from mid-execution mutations.
- The load wizard does not flash during successful restoration.
- `Back to Loader` clears persisted program state while leaving settings intact.
- SPI entrypoint choices survive refresh and restore the correct program envelope.
- Corrupted persisted state is cleared and reported with a loader-facing error alert.
- `npm run build -w @pvmdbg/web` succeeds.
- `cd apps/web && npx playwright test e2e/persistence.spec.ts` succeeds.

## Verification

```bash
npm run build -w @pvmdbg/web
cd apps/web && npx playwright test e2e/persistence.spec.ts
```
