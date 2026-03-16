# Sprint 20 — Host Call — Storage Table

## Goal

Add the storage contextual view for host-call indexes 3 (read) and 4 (write). The view includes an editable storage table that persists across host calls within the same execution session, allowing users to supply custom storage values that override trace-based memory writes.

## What Works After This Sprint

- Storage host calls (index 3, 4) render a dedicated view
- Read/write details are decoded into human-readable labels
- An editable storage table persists across host calls in the session
- The active key is highlighted in the table when present
- Users can add new key/value entries and edit existing values
- Storage writes update the table after host-call resume
- Custom storage values override trace memory writes on resume

## Prior Sprint Dependencies

- Sprint 19: Host Call drawer tab, contextual views

## Required Files

```
apps/web/src/components/drawer/hostcalls/StorageHostCall.tsx
apps/web/src/hooks/useStorageTable.ts
apps/web/e2e/sprint-20-host-call-storage.spec.ts
```

## Storage View Contract

For host-call indexes 3 and 4:

- decode read/write details into human-readable labels
- highlight the active key in the storage table
- show pending effects from the trace proposal

## Storage Table Contract

- editable table that persists across host calls within one execution session
- allow adding new key/value entries
- allow editing existing values
- storage writes update the persistent table after the host call resumes
- storage-backed resume effects may override trace memory writes when the user has supplied a custom value

## Storage State Contract

Storage state is execution-scoped, not global.

Rules:

- reset the storage table when the orchestrator instance is replaced
- keep entries stable across multiple read/write host calls in the same session
- avoid `useSyncExternalStore` snapshot churn; expose a stable cached snapshot or revision counter

## Integration with Resume

Shared storage helpers should be reusable by both the Host Call tab and the execution-control resume logic. Trace-backed host calls use the sequential trace proposal model; custom storage values only override the relevant read/write effects.

## E2E Tests

```
- storage host call renders the dedicated view
- the storage table shows entries
- adding a new key/value entry works
- editing an existing value works
- the active key is highlighted
- storage entries persist across multiple host calls in the same session
```

## Acceptance Criteria

- Storage host calls render a dedicated contextual view.
- The editable storage table persists within a session.
- Custom values override trace memory writes on resume.
- The table resets on orchestrator replacement.
- `cd apps/web && npx vite build` succeeds.
- E2E tests pass.

## Verification

```bash
cd apps/web && npx vite build
npx playwright test e2e/sprint-20-host-call-storage.spec.ts
```
