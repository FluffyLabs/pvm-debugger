# Sprint 13 — SPI Entrypoint Configuration

Status: Implemented

## Goal

Add SPI entrypoint configuration to wizard step 2 for JAM SPI programs. Users can select an entrypoint (Refine, Accumulate, Is Authorized), configure it via a builder or RAW hex mode, and persist their choices to localStorage.

## What Works After This Sprint

- SPI entrypoint config renders only for `jam_spi` and `jam_spi_with_metadata` formats
- Builder mode supports Refine, Accumulate, Is Authorized entrypoints
- RAW mode shows the encoded hex, editable
- Builder and RAW stay synchronized bidirectionally
- Example manifest entrypoints prefill the builder
- Configuration persists to localStorage across page reloads
- Invalid inputs disable `Load Program` with a clear error

## Prior Sprint Dependencies

- Sprint 12: wizard step 2, detection summary, Load Program action

## Required Files

```
apps/web/src/components/load/SpiEntrypointConfig.tsx
apps/web/src/components/load/ConfigStep.tsx           (extend)
apps/web/e2e/sprint-13-spi-config.spec.ts
```

## SPI Entrypoint Contract

Only show entrypoint config for:

- `jam_spi`
- `jam_spi_with_metadata`

Trace files, JSON vectors, and generic programs must not render this section.

## Builder Contract

Required builder variants:

1. `Refine`
2. `Accumulate`
3. `Is Authorized`

Default builder state matches current manifest presets:

- `Accumulate`
- slot `42`
- id `0`
- results `0`

Rules:

- builder fields encode through `encodeSpiEntrypoint()`
- selecting an entrypoint type shows appropriate fields
- example manifest entrypoints override persisted defaults on initial load
- invalid numeric or hex input surfaces a destructive error and disables `Load Program`

## RAW Mode Contract

- RAW mode shows the encoded entrypoint as editable hex
- RAW edits decode back into builder fields for the current entrypoint shape
- switching between modes must not lose data

## Persistence Contract

- persist selected entrypoint type and field values to localStorage
- persisted values survive page reloads and later wizard visits
- example entries override persisted defaults when loading from examples

## E2E Tests

```
- SPI entrypoint config renders for JAM SPI examples
- all three entrypoint options are selectable
- builder and RAW mode stay synchronized
- example entrypoints prefill the builder
- trace sources do not render SPI config
- invalid input disables Load Program
- persisted values survive page reload
```

## Acceptance Criteria

- SPI entrypoint config renders only for SPI formats.
- All three builder variants work.
- Builder and RAW mode stay synchronized bidirectionally.
- Example entrypoints prefill the builder.
- Invalid input disables Load Program with a clear error.
- Config persists to localStorage.
- `cd apps/web && npx vite build` succeeds.
- E2E tests pass.

## Implementation Notes

- `decodeSpiEntrypoint()` added to `packages/content/src/spi-entrypoint.ts` for RAW→builder decoding.
- Playwright cannot fill non-numeric text into `input[type=number]`; invalid-input E2E test uses RAW mode with invalid hex instead.
- `SpiEntrypointConfig` uses a `spiConfigReady` flag to avoid disabling Load before the component mounts and reports initial state.
- localStorage key: `pvmdbg:spi-config` — stores entrypoint type, field values, RAW mode state, and encoded hex.
- ConfigStep re-creates the envelope whenever `spiParams` changes, passing them to `createProgramEnvelope(payload, { entrypoint })`.

## Verification

```bash
cd apps/web && npx vite build
npx playwright test e2e/sprint-13-spi-config.spec.ts
```
