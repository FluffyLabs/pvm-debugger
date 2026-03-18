# Agent Workflow Instructions

## Scope

This repository is the clean-slate rewrite workspace for the PVM debugger.

Read first (in this order):
1. `spec/README.md` — spec structure and conventions
2. The specific spec you're implementing (as instructed in the prompt)

## Reference Code

Two git submodules provide reference material:
- `reference/pvm-debugger/` — current production app (read for behavior, do NOT copy-paste)
- `reference/shared-ui/` — shared UI component library (`@fluffylabs/shared-ui`)

Each ticket lists specific reference files to read. Study the behavior, then write clean new code.

## Ticket Execution Rules

1. You will be told which spec to implement in the prompt. Specs live in `spec/` (core) and `spec/ui/` (UI).
2. Read the spec thoroughly — it contains exact interfaces, file paths to produce, and acceptance criteria.
3. Implement the full spec end-to-end (code + tests).
4. Run the verify commands listed in the spec.
5. After successful implementation, mark the spec file as implemented by adding `Status: Implemented` to the top. Enhance acceptance criteria with edge cases, pitfalls, and verification steps discovered during implementation.
6. If work is partial or blocked, append a `Blocked` section to the spec file.

## Constraints

- **Package namespace**: `@pvmdbg/<name>`.
- **No Redux**: use orchestrator events + React hooks.
- **No mocks for PVM interpreters**: use real `@typeberry/lib` and ananas packages.
- **Async adapter interface**: all PVM adapter methods return Promises.
- **Event-emitter orchestrator**: strictly typed, works in browser + Node.js.
- **Shared-ui first**: use `@fluffylabs/shared-ui` components where available.
- **Local UI components**: Tabs, Table, Drawer are copied from `reference/pvm-debugger/src/components/ui/` and adapted.
- **TailwindCSS v4**: for styling in `apps/web`.
- **Fixtures**: use `fixtures/` for example programs and test data. Do NOT embed hex strings in source code.
- **Browser-agnostic core**: packages other than `apps/web` and `packages/runtime-worker` must not use browser APIs.
- **Web workers**: PVM interpreters run in web workers for browser. `DirectAdapter` for Node.js.

## Code Quality Rules

- **No duplicate utilities.** `hexToBytes`, `HOST_CALL_NAMES`, register byte conversion, and memory page access helpers are defined ONCE in their respective packages. Import, don't copy.
- **No placeholder tests.** `expect(true).toBe(true)` is not acceptable. See section 12.4 for minimum test scenarios per package.
- **`data-testid` attributes** on all interactive UI elements for E2E test selection. See `spec/ui/sprint-36-integration-smoke-test.md`.
- **Ananas has initialization quirks.** Must prime with `nextStep()` after reset. See `spec/005-runtime-worker-and-adapters.md`.
- **Trace matching is by sequential position** (Nth host call → Nth trace entry). NOT by value, NOT by PC.

## Build and Test

```bash
npm install         # install all workspace dependencies
npm run build       # build all packages
npm test            # run all tests
cd apps/web && npx vite build   # build the web app
```
