# Sprint 50 — Usage Guide Refresh and Automated Screenshot Pipeline

Status: Implemented

## Goal

Refresh `docs/usage-guide.md` so it matches the current UI (sprints 38–49), replace every stale screenshot with a new dark-mode capture, and add a reproducible Playwright pipeline so screenshots can be regenerated in the future without hand-authoring them.

The previous guide was written in sprint 37 and had drifted substantially — the entire Host Call drawer was rewritten in sprint 42, fetch handling was added in sprints 43/44, host-call editing and the pending-changes banner shipped in sprint 41, and ananas PVM arrived in sprint 39. None of that was documented.

## Prior Sprint Dependencies

- Sprint 37 — initial usage guide and screenshot set (this sprint replaces its artifacts)
- Sprint 39 — ananas PVM
- Sprint 40 — drawer polish, trace link-scroll, hex-labeled memory pages
- Sprint 41 — host-call editing, pending-changes banner
- Sprint 42 — host-call UX redesign (two-column layout, NONE toggle, auto-apply, sticky bar)
- Sprint 43 — fetch host call handler with all 16 kinds and three modes
- Sprint 44 — eager default blob for Constants fetch, `Use Trace Data` behavior
- Sprint 47 — error boundary
- Sprint 49 — register symbol ω → φ (partial; see Known Gaps below)

## What Works After This Sprint

### Documentation

1. **`docs/usage-guide.md` rewritten** to cover the current UI:
   - Section 4 (Debugger Screen) describes the new drawer tab-bar styling and mentions the error boundary.
   - Section 6 (Registers) documents the inline editor (click the hex value) and the pending-changes banner.
   - Section 8 (Host Calls) is largely new: two-column layout, sidebar contents (badge, input registers, output preview, memory write count), handler-specific editors (fetch/storage/log/generic-text), sticky bar with NONE toggle and Use Trace Data button, and the auto-apply flow.
   - A new subsection **Fetch Handler** describes Trace/Raw/Struct modes, per-kind editors, encoded output, and the slice preview bar.
   - A new section **9. Pending Changes** describes the `φ<N> ← value` banner with coalesced memory writes.
   - Section 10 (Trace Comparison) mentions link-scroll and download.
   - Section 11 (Settings) enumerates PVM selection, stepping modes, and the host-call policy options.
   - Section 12 (Multiple PVMs) names typeberry and ananas explicitly.
   - Register notation is φ throughout prose (matching sprint 49 rename in most UI locations).
   - A new trailing section explains how to regenerate screenshots.

2. **Every screenshot reference resolves.** The sprint-37 verification grep passes with no `MISSING:` lines.

### Screenshot Pipeline

3. **New Playwright pipeline** in `apps/web/screenshots/`:
   - `helpers.ts` — shared fixture that forces dark mode via `localStorage.theme-mode = "dark"` injected with `addInitScript`, a `waitForFontsReady` helper, a `capture(target, name)` wrapper that writes into `docs/usage-screenshots/`, and host-call navigation helpers (`currentPc`, `setAutoContinueNever`, `runToHostCall`, `advanceToNextHostCall`) with inline comments documenting the `Next`-vs-`Run` and PC-diff gotchas.
   - `01-load.screenshot.ts` — loaders (examples/upload/URL/manual hex).
   - `02-config.screenshot.ts` — JAM SPI builder + RAW modes.
   - `03-debugger.screenshot.ts` — full layout, stepping, register editing, memory panel.
   - `04-settings.screenshot.ts` — settings tab, multi-PVM (typeberry + ananas).
   - `05-persistence.screenshot.ts` — persistence after reload.
   - `06-host-calls.screenshot.ts` — host-call overview, log, pending-changes banner.
   - `07-fetch-trace.screenshot.ts` — fetch handler and trace comparison.
   - `README.md` — conventions for adding new captures, plus a "Gotchas" section covering the host-call navigation traps.

4. **Dedicated Playwright config** `apps/web/playwright.screenshots.config.ts`:
   - `testDir: "./screenshots"`, `testMatch: /.*\.screenshot\.ts$/`.
   - Fixed viewport 1440×900 at `deviceScaleFactor: 2`.
   - `colorScheme: "dark"` plus the localStorage injection.
   - Auto-starts `vite preview --port 4199` as its `webServer`.
   - `workers: 1`, `fullyParallel: false` — captures are serial so PVM state is deterministic per file.

5. **`npm run screenshots`** (in `apps/web/package.json`) runs the pipeline. Full capture takes under 30 s on a warm build.

### Fixture choices and gotchas (captured for reproducibility)

6. **io-trace** example (bundled trace file) is used for:
   - `host-call-overview.png` — first host call is `fetch`, renders the fetch editor out of the box.
   - `host-call-pending-changes.png` — same first host call produces a pending `φ7 ← ...` register write and a memory write.
   - `host-call-fetch.png` — struct mode selected on the Constants (kind 0) encoding.
   - `trace-comparison.png` — after one Run and one advance-to-next-host-call, both columns have entries.

7. **all-ecalli-accumulate** (JAM SPI) is used for `host-call-log.png`: the program emits a log (ecalli=100) within the first few host calls, which renders the `LogHostCall` view with decoded text.

8. **`Next` vs `Run` for advancing between host-call pauses.** `Next` is one instruction with the default stepping mode, which typically does not land on the next host call. The capture helpers use `run-button` with `auto-continue-radio-never`, which pauses on every host call and makes "advance to next call" a single Run click. Detection uses the PC value (`pc-value` testid) — the `host-call-header` badge alone repeats for same-kind calls. This is encapsulated in `advanceToNextHostCall(page)` in `helpers.ts`; new captures should use that rather than rolling their own.

9. **React error #185 ("Maximum update depth exceeded") can still be triggered** by rapid successive Run-to-next-host-call cycles on some trace examples, despite sprint 47's targeted fix. The capture specs work around this by keeping the number of Run iterations small per test and by adding a short settle delay before each Run click. If the error boundary ever shows during capture, the offending screenshot file will still be produced but contain the fallback UI — rerunning usually recovers.

### Screenshots retired

10. **`host-call-storage.png` is removed from the guide.** The redesigned layout is adequately conveyed by `host-call-overview.png` (fetch) and `host-call-log.png` (log); a separate storage shot would be redundant and was brittle to capture (see gotcha 9). Storage host-call behavior is described in prose in section 8.

### Sprint 49 Follow-up Fix

11. **Completed sprint-49's ω → φ rename.** Two files stored the symbol as
    the Unicode escape `\u03C9` rather than the literal `ω` character, so
    sprint-49's verification grep (`grep -r 'ω'`) missed them:
    - `apps/web/src/components/debugger/PendingChanges.tsx` — pending
      register-write prefix.
    - `apps/web/src/components/load/DetectionSummary.tsx` — registers-preview
      line in the Program Summary.

    Both were updated to `\u03C6` and the sprint-49 spec's verification
    regex was broadened to catch `ω`, `\u03C9`, `U+03C9`, and `omega` so
    future rename sprints don't repeat the miss.

## Known Gaps (not addressed in this sprint)

- **React error #185 root cause.** Sprint 47 suppressed host-call state while the run loop is executing, which fixed the common trace-replay crash. Manual rapid Run clicks with `auto-continue=never` can still trip the infinite-render cycle on some examples; a deeper investigation into the pending-changes / resume interaction is warranted.

## Files Changed

| File | Changes |
|------|---------|
| `docs/usage-guide.md` | Rewritten to match current UI. New Host Calls section, new Pending Changes section, new Fetch Handler subsection, regeneration instructions. |
| `docs/usage-screenshots/*.png` | All 18 screenshots regenerated in dark mode at 1440×900@2x. `host-call-storage.png` removed. |
| `apps/web/playwright.screenshots.config.ts` | **New.** Dedicated Playwright config for screenshot captures. |
| `apps/web/screenshots/helpers.ts` | **New.** Shared fixture, dark-mode localStorage injection, `capture()` helper. |
| `apps/web/screenshots/01-load.screenshot.ts` | **New.** Loader captures. |
| `apps/web/screenshots/02-config.screenshot.ts` | **New.** JAM SPI builder/raw captures. |
| `apps/web/screenshots/03-debugger.screenshot.ts` | **New.** Debugger layout, stepping, registers, memory captures. |
| `apps/web/screenshots/04-settings.screenshot.ts` | **New.** Settings and multi-PVM captures. |
| `apps/web/screenshots/05-persistence.screenshot.ts` | **New.** Persistence-after-reload capture. |
| `apps/web/screenshots/06-host-calls.screenshot.ts` | **New.** Host-call overview, log, pending-changes captures. |
| `apps/web/screenshots/07-fetch-trace.screenshot.ts` | **New.** Fetch handler and trace-comparison captures. |
| `apps/web/screenshots/README.md` | **New.** Conventions for adding new captures. |
| `apps/web/package.json` | Added `"screenshots"` script. |
| `apps/web/src/components/debugger/PendingChanges.tsx` | Sprint-49 follow-up: `\u03C9` → `\u03C6`. |
| `apps/web/src/components/load/DetectionSummary.tsx` | Sprint-49 follow-up: `\u03C9` → `\u03C6`. |
| `spec/ui/sprint-49-register-symbol-omega-to-phi.md` | Added missed files, broadened verification regex, noted the follow-up. |

## Acceptance Criteria

- `docs/usage-guide.md` covers the full debugger workflow, including the sprint-38-through-sprint-49 features listed above.
- Every screenshot referenced from the guide exists at the referenced path.
- Running `cd apps/web && npm run screenshots` regenerates all screenshots from scratch with 18/18 tests passing.
- Captured PNGs are produced in dark mode at 1440×900 with deviceScaleFactor 2.
- The guide explains how to regenerate screenshots after further UI changes.

## Verification

```bash
# Build + full capture run (end-to-end).
npm run build
cd apps/web && npm run screenshots

# Verify every referenced screenshot exists.
grep -oE 'usage-screenshots/[^)]+' ../../docs/usage-guide.md \
  | sort -u \
  | while read f; do
      [ -f "../../docs/$f" ] || echo "MISSING: docs/$f"
    done
```

Both commands should complete with no errors and no `MISSING:` lines.
