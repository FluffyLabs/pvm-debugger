# Sprint 18 — Host Call Resume Flow

Status: Implemented

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
npm test -- --reporter=verbose apps/web/src/hooks/useDebuggerActions.test.ts
```

## Implementation Notes

### Architecture decisions

- **Resume reads from orchestrator, not React state.** `resumeAllHostCalls()` calls `orchestrator.getPendingHostCall(pvmId)` directly rather than reading the `hostCallInfo` React state map. This avoids stale-closure issues in async callbacks and is always authoritative.
- **Resume ALL PVMs, not just the selected one.** When the user clicks Next/Step/Run, all PVMs with pending host calls are resumed. This is correct for multi-PVM scenarios where different PVMs may hit host calls at different times.
- **Explicit resume before first step in Run.** When the user clicks Run while already paused on a host call, the resume always happens (regardless of auto-continue policy) because the user explicitly requested execution. The auto-continue policy only applies to host calls encountered *during* the run loop.
- **`autoContinuePolicy` is captured at `run()` creation time.** If the user changes the policy while the run loop is active, the change takes effect on the *next* Run invocation, not mid-loop. This is standard React `useCallback` behavior.

### Edge cases and pitfalls

- **`canStep` is already true for `paused_host_call`.** The `isTerminal()` check returns false for `paused_host_call`, and `isStepInProgress` is set to false by the `hostCallPaused` event handler. No special `canStep` logic was needed.
- **Immediate consecutive host calls.** If Next resumes a host call and the very next instruction is also ecalli, the PVM pauses on the new host call. The PC changes (proving the resume worked), but the lifecycle remains `paused_host_call`. This is correct behavior — tests verify via PC change, not lifecycle change.
- **`continue_when_trace_matches` checks ALL host-call-paused PVMs.** If PVM A has a matching trace but PVM B does not, auto-continue returns false. This is conservative — it only continues when *all* host calls match.
- **`hostCallInfo` map in `useOrchestratorState` is not cleaned up on resume.** After `resumeHostCall()`, the orchestrator emits `pvmStateChanged` with `lifecycle: "paused"`, but the `hostCallInfo` map retains the stale entry. This doesn't affect Sprint 18 (we use `getPendingHostCall()` directly), but Sprint 19's Host Call drawer should clear entries when lifecycle transitions away from `paused_host_call`.
