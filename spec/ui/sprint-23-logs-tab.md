# Sprint 23 — Logs Tab

Status: Implemented

## Goal

Replace the Logs drawer placeholder with a focused log message viewer. The tab shows only decoded `ecalli 100` log host-call messages with step numbers, providing a readable output stream from program execution.

## What Works After This Sprint

- Logs tab shows decoded log messages from `ecalli 100` host calls
- Each message includes a step number prefix
- Invalid UTF-8 falls back to hex text
- `Clear` removes visible messages from the panel
- `Copy` writes visible log output as plain text to clipboard
- New messages auto-scroll when the user is near the bottom
- Manual scroll-up is not disrupted by new messages
- Empty state: `No log messages yet.`

## Prior Sprint Dependencies

- Sprint 14: drawer shell
- Sprint 18: host-call resume flow (log host calls are recorded during execution)

## Required Files

```
apps/web/src/components/drawer/LogsTab.tsx
apps/web/src/components/drawer/LogEntry.tsx
apps/web/src/hooks/useLogMessages.ts
apps/web/e2e/sprint-23-logs.spec.ts
```

## Data Contract

Messages come from the selected PVM's recorded execution trace.

Rules:

- filter entries where `index === 100`
- step number derived from recorded trace position
- decode message from the longest memory read attached to the log host call
- invalid UTF-8 falls back to raw hex text
- clear hides previously seen entries without mutating the underlying trace recording

## Layout Contract

- toolbar with `Clear` and `Copy` buttons (visible text labels, not icon-only)
- scrollable log output body
- empty state: `No log messages yet.`

## Auto-Scroll Contract

- when user is near the bottom, new messages auto-scroll into view
- when user has scrolled upward, new messages must not forcibly jump the viewport

## Copy / Clear Contract

- `Copy` writes currently visible log output as plain text to clipboard
- copied lines keep the `[Step N]` prefix
- `Clear` removes visible messages from the panel only (not from the trace)
- reset the clear offset when the selected PVM or orchestrator changes

## E2E Tests

```
- empty state renders before any log host calls
- after a log host call, decoded text appears with step number
- Copy writes the visible log stream to clipboard
- Clear returns the panel to empty state
```

## Acceptance Criteria

- Logs tab shows only `ecalli 100` messages.
- Messages display readable UTF-8 or hex fallback.
- Each row includes its step number.
- Auto-scroll follows new messages appropriately.
- Clear and Copy work correctly.
- `cd apps/web && npx vite build` succeeds.
- E2E tests pass.

## Verification

```bash
cd apps/web && npx vite build
npx playwright test e2e/sprint-23-logs.spec.ts
```

## Implementation Notes

- **Test fixture**: `trace-001` (`fixtures/trace-001.log`) has many `ecalli=100` entries with UTF-8 decodable log messages (e.g. "Bootstrap Service Accumulate…", "Deleting item…"). Use this fixture for E2E tests that need visible log output. The `io-trace` fixture also has a few `ecalli=100` entries but fewer.
- **Message decoding** reuses `decodeLogMessage` from `trace-display.ts` — it picks the longest `memoryRead` attached to the trace entry and decodes as UTF-8, falling back to hex on failure.
- **Clear** uses an offset into the `allMessages` array rather than filtering or cloning, so the underlying trace data is never mutated.
- **Auto-scroll** uses a 40px threshold from the bottom (`AUTO_SCROLL_THRESHOLD`). The `isNearBottomRef` is updated on every scroll event and checked when `messages` changes.
- **`navigator.clipboard`** is used directly in the hook. This is acceptable since the hook lives in `apps/web/`, not in a browser-agnostic core package.
