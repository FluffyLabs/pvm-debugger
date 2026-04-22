# Usage-guide screenshot capture

Playwright scripts that drive the app into specific states and save PNGs to
`docs/usage-screenshots/`. These back the images referenced from
`docs/usage-guide.md`.

## Running

From the repo root (builds the app first so the preview server has something to serve):

```bash
npm run build
cd apps/web && npm run screenshots
```

Or, if a dev/preview server is already running on port 4199, just:

```bash
cd apps/web && npm run screenshots
```

## Layout

- `helpers.ts` — shared fixture that forces dark mode, font-ready waits, and a
  `capture()` helper that writes into `docs/usage-screenshots/`.
- `*.screenshot.ts` — one file per feature area. Each test corresponds to one
  screenshot referenced from the usage guide.

## Conventions

- Fixed viewport 1440×900 @ deviceScaleFactor 2 (see
  `playwright.screenshots.config.ts`).
- Dark theme, enforced by `localStorage.theme-mode = "dark"` injected before
  first paint.
- Animations disabled at capture time so drawer transitions don't blur output.
- Scripts pick real, visually informative states (e.g. factorial stepped a few
  times, game-of-life running) rather than empty initial states, unless the
  initial state is the point of the shot.

## Adding a new screenshot

1. Add a test in an existing `*.screenshot.ts` file, or create a new one for a
   new feature area.
2. Use `capture(page, "filename.png")` for full-viewport shots, or pass a
   locator for element-scoped shots.
3. Reference the new image from `docs/usage-guide.md`.
4. Run `npm run screenshots` and commit the PNG.

## Gotchas when capturing host-call states

Driving the debugger between host-call pauses has two traps. `helpers.ts`
provides shared utilities — prefer them over rolling your own:

- **`Next` is one instruction, not one host call.** After you resume a host
  call via Next, the next instruction is almost never another ecalli, so you
  land on a normal paused state. Use `advanceToNextHostCall(page)` instead —
  it clicks Run, which (with `auto-continue=never`) stops at the next host
  call automatically.
- **`pvm-status-typeberry` can stay on "Host Call" across a transition.** The
  text doesn't always leave "Host Call" before the PVM pauses on the next
  one. Detect advancement by diffing the PC value (`pc-value` testid).
  `advanceToNextHostCall` does this for you.
- **Always call `setAutoContinueNever(page)` before `runToHostCall`.** The
  default policy (`continue_when_trace_matches`) blasts through matching
  host calls on trace-backed examples, and your capture will never pause.
- **React error #185 (infinite render cycle)** can still trigger on rapid Run
  clicks for some trace programs, despite sprint-47's fix. `advanceToNextHostCall`
  adds a short settle-delay before each click as a workaround. If you see the
  "Something went wrong / Reload" error boundary during a capture, rerun — it
  is usually transient.
