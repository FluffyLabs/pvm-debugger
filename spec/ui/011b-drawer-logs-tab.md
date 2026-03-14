# UI-011b - Bottom Drawer - Logs Tab

## Purpose

Implement the `Logs` drawer tab as the readable stream view for `ecalli 100` log host calls.

The tab is a focused complement to `Ecalli Trace`: it only shows decoded log messages and the step number where each message was emitted.

## Required Files

```
apps/web/src/components/drawer/LogsTab.tsx
apps/web/src/components/drawer/LogEntry.tsx
apps/web/src/hooks/useLogMessages.ts
apps/web/e2e/drawer-logs.spec.ts
```

## Data Contract

Messages come from the selected PVM's recorded execution trace.

Rules:

- filter trace entries where `index === 100`
- derive the displayed step number from the recorded trace position
- decode the message from the longest memory read attached to the log host call
- invalid UTF-8 falls back to raw hex text
- clearing the tab hides previously seen log entries without mutating the underlying trace recording

## Layout Contract

The tab renders:

- a toolbar with `Clear` and `Copy`
- a scrollable log output body

Rules:

- empty state text is `No log messages yet.`
- new messages append in order
- when the user is already near the bottom, new messages auto-scroll into view
- when the user has scrolled upward, appending messages must not forcibly jump the viewport

## Copy / Clear Contract

Rules:

- `Copy` writes the currently visible log output as plain text to the clipboard
- copied lines keep the `[Step N]` prefix
- `Clear` removes the currently visible messages from the panel only

## Implementation Notes

- keep log extraction in a dedicated hook so both UI rendering and future integrations can reuse it
- reset any per-tab clear offset when the selected PVM or orchestrator instance changes
- keep interactive controls addressable via `data-testid`

## Testing Requirements

E2E coverage must prove:

- the empty state renders before any log host calls occur
- after a log host call is recorded, decoded readable text appears with a step number
- `Copy` writes the visible log stream
- `Clear` returns the panel to the empty state

## Acceptance Criteria

- The Logs tab shows only `ecalli 100` messages.
- Messages display readable UTF-8 text when possible and hex when not.
- Each row includes its recorded step number.
- Auto-scroll follows appended messages when the user is already at the bottom.
- `Clear` clears the visible panel state.
- `Copy` copies the visible log stream as plain text.
- `npm run build -w @pvmdbg/web` succeeds.
- `cd apps/web && npx playwright test e2e/drawer-logs.spec.ts` succeeds.

## Verification

```bash
npm run build -w @pvmdbg/web
cd apps/web && npx playwright test e2e/drawer-logs.spec.ts
```
