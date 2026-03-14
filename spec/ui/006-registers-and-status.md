# UI-006 - Registers and Status Panel

## Purpose

Implement the center debugger column as the authoritative machine-state panel for:

- lifecycle / status display
- PC
- gas
- all 13 registers
- pending host-call effects that will be applied on resume

This panel is the primary state-inspection and state-editing surface while execution is paused.

## Required Files

```
apps/web/src/components/debugger/RegistersPanel.tsx
apps/web/src/components/debugger/StatusHeader.tsx
apps/web/src/components/debugger/RegisterRow.tsx
apps/web/src/components/debugger/PendingChanges.tsx
apps/web/src/components/debugger/value-format.ts
apps/web/e2e/registers-panel.spec.ts
```

## Display Contract

The panel must show the selected PVM state with a dense monospace layout.

Header content:

- unified status badge
- editable PC field
- editable gas field

Body content:

- 13 rows labeled `ω0` through `ω12`
- each register rendered as `0x... (decimal)`
- a pending-changes section when a resumable host call is waiting

Rules:

- register rows and inline editors must preserve stable height to avoid layout jumps
- the panel must remain usable on desktop and mobile widths
- all edit affordances must keep `cursor-pointer`

## Unified Status Contract

The badge is a UI mapping over `PvmLifecycle` plus `PvmStatus`; do not expose raw lifecycle strings directly.

Required mappings:

- `running` -> `Running`
- `paused` + `status === "ok"` -> `OK`
- `paused_host_call` -> `Host Call`
- `terminated` + `halt` -> `Halt`
- `terminated` + `panic` -> `Panic`
- `terminated` + `fault` -> `Fault`
- `terminated` + `out_of_gas` -> `Out of Gas`
- `failed` -> `Error`
- `timed_out` -> `Timeout`

Rules:

- do not show `Paused` in the UI for the normal idle state
- keep the badge compact
- use distinct tones for OK, Running, Host Call, terminal faults, and timeout

Implementation pitfall:

- the orchestrator can emit `running` and the final paused/host-call state close together; the reactive UI layer must not collapse that into a single `OK` render or the disabled-editing state becomes unobservable

## Editing Contract

PC, gas, and registers are editable only when every active PVM is paused and the selected snapshot status is `ok`.

Rules:

- clicking a displayed value swaps it into an inline input
- `Enter` commits
- `Escape` cancels
- `blur` attempts commit
- register and gas inputs accept decimal or `0x...` hex
- PC input accepts decimal or `0x...` hex but must reject negative values
- edits fan out to all loaded PVMs by iterating `orchestrator.getPvmIds()`
- all edits go through orchestrator methods; do not write adapter state directly from the UI
- while execution is running, edit buttons must be disabled

## Value Formatting Contract

Formatting is fixed by context; there is no numeral-system toggle.

- registers: hex plus decimal, always together
- PC: hex only
- gas: decimal only in the main field
- gas hex: secondary help affordance

Rules:

- register hex uses at least 16 digits
- PC uses zero-padded hex with width that expands past 4 digits as needed
- gas uses thousands separators
- shared formatting / parsing logic must live in one helper module, not be duplicated across rows and headers

## Change Highlighting Contract

When the selected PVM state changes after stepping or editing:

- changed registers show a persistent `Δ` marker until the next state update
- changed register rows also get a short flash/fade treatment
- PC and gas fields may use a lighter changed border state

Rules:

- compare against the previous selected snapshot, not against initial load state
- reset comparison state when the selected PVM changes

## Pending Changes Contract

When a host call is paused and a `resumeProposal` is available, show a unified preview of pending effects:

- register writes
- gas change
- memory writes with truncated byte preview

Rules:

- prefer the selected PVM’s pending host-call info, otherwise use the first available one
- debounce visibility so short auto-continue pauses do not flash the panel
- render memory previews compactly, not full dumps

## Multi-PVM Difference Contract

If the selected PVM’s register value differs from another loaded PVM:

- render a small warning indicator on that register row
- clicking the indicator opens a compact explanation popover

Rules:

- the tooltip / popover must identify the differing PVM id
- edits still apply uniformly to all PVMs even if divergence is already present

## Dev-Test Bridge Contract

For browser E2E coverage, expose a dev-only bridge on `window.__PVMDBG__`.

Minimum operations:

- get loaded PVM ids
- read a serialized snapshot
- step execution
- set register / PC / gas / memory
- resume a pending host call from its proposal
- query pending host-call metadata

Rules:

- gate the bridge to dev mode only
- keep returned data JSON-friendly; convert bigint fields to strings
- the bridge must not become part of the production UI contract

## Testing Requirements

E2E coverage must prove:

- status shows `OK` with PC hex and gas decimal after load
- all 13 register rows render with omega notation and dual-format values
- stepping marks changed registers
- register, PC, and gas fields edit inline while paused
- gas exposes its hex value via a secondary popover / tooltip
- pending host-call changes render for trace-backed execution
- editing becomes disabled while the selected PVM is running
- edit mode preserves row height
- multi-PVM divergence shows a warning affordance

## Acceptance Criteria

- The center panel renders machine status, PC, gas, and all 13 registers for the selected PVM.
- Idle paused execution is labeled `OK`, not `Paused`.
- Registers always render `0x... (decimal)` with omega labels.
- PC renders in hex with adaptive zero-padding.
- Gas renders in decimal with thousands separators and a secondary hex affordance.
- Register, PC, and gas edits commit through the orchestrator to every loaded PVM.
- Editing is disabled during running, host-call pause, and terminal states.
- Changed registers retain a `Δ` marker until the next snapshot update and flash briefly on change.
- Pending host-call proposals show unified register / gas / memory effects after a short debounce.
- Divergent multi-PVM register values show a warning popover with the differing PVM id and value.
- The dev-only `window.__PVMDBG__` bridge is available for E2E in dev builds and omitted from production builds.
- `npm run build -w @pvmdbg/web` succeeds.
- `cd apps/web && npx playwright test e2e/registers-panel.spec.ts` succeeds.
- `npm run build` succeeds for the workspace.
- `npm test` succeeds for the workspace.

## Verification

```bash
npm run build -w @pvmdbg/web
cd apps/web && npx playwright test e2e/registers-panel.spec.ts
cd ../..
npm run build
npm test
```
