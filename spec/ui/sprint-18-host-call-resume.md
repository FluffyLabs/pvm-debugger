# Sprint 18 — Host Call Resume Flow

## Goal

Enable execution to continue past paused host calls. When the PVM pauses on a host call, the existing `Next`, `Step`, and `Run` buttons seamlessly resume it and continue stepping. There is no separate resume button — execution controls handle everything.

## What Works After This Sprint

- When a PVM pauses on a host call, execution controls remain enabled
- Clicking Next/Step/Run first resumes the host call, then performs the requested step
- Trace-backed host calls auto-apply their trace proposal before stepping
- Host calls without a trace proposal resume with empty effects
- Auto-continue during Run respects the settings policy (Always / When Trace Matches / Never)
- `Never` policy pauses the run loop on host calls

## Prior Sprint Dependencies

- Sprint 08: execution controls (Next, Run, Pause, Reset)
- Sprint 15: settings tab (auto-continue policy)
- Sprint 16: Step button with stepping modes

## Required Files

```
apps/web/src/hooks/useDebuggerActions.ts   (extend with host-call resume logic)
apps/web/e2e/sprint-18-host-call-resume.spec.ts
```

## Resume Contract

Rules:

- `Next`, `Step`, and `Run` remain enabled when paused on a host call
- before issuing a step, check if a host call is paused
- when paused with a trace proposal, apply that proposal via `orchestrator.resumeHostCall()`
- when paused without a trace proposal, resume with empty effects
- after resume, perform the requested step action normally
- there is no separate `Resume` or `Continue` button anywhere in the UI

## Auto-Continue Contract

During run mode, host-call resume behavior depends on the settings policy:

- `Always` — automatically resume and continue stepping
- `When Trace Matches` — resume only when a trace proposal is available; pause otherwise
- `Never (Manual)` — stop the run loop when a host call is reached

Rules:

- silently resumed host calls do not open the Host Call drawer tab
- manual-pause host calls will be surfaced by the Host Call drawer (Sprint 19)

## E2E Tests

Use a trace-backed example that includes host calls.

```
- loading a trace-backed program and stepping past a host call works
- Next while paused on host call resumes and steps
- Run with "Always" auto-continue policy runs past host calls
- Run with "Never" policy stops on host calls
```

## Acceptance Criteria

- Execution controls seamlessly handle host-call pauses.
- Trace proposals are applied before stepping.
- Auto-continue respects the configured policy.
- No separate resume button exists.
- `cd apps/web && npx vite build` succeeds.
- E2E tests pass.

## Verification

```bash
cd apps/web && npx vite build
npx playwright test e2e/sprint-18-host-call-resume.spec.ts
```
