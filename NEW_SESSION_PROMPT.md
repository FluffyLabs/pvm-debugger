You are starting work in the PVM debugger rewrite workspace.

Read first (in this order):
1. docs/rewrite-architecture.md
2. docs/rewrite-plan.md
3. AGENTS.md
4. spec/README.md
5. The spec you've been instructed to implement

Reference code is in:
- reference/pvm-debugger/ (current app — read for behavior, write clean new code)
- reference/shared-ui/ (component library)

Key constraints:
- @pvmdbg/* package namespace
- No Redux — orchestrator events + React hooks
- Real PVM interpreters from npm — no mocks
- Async PvmAdapter interface (defined in packages/types)
- Strictly typed event-emitter orchestrator
- @fluffylabs/shared-ui for UI primitives; Tabs/Table/Drawer copied from reference app
- TailwindCSS v4 for styling
- Fixtures in fixtures/ directory — don't embed hex in source code
- Web workers for browser PVM execution; DirectAdapter for Node.js

Execute the spec end-to-end, run verify commands, then mark the spec file as implemented (add `Status: Implemented` to the top) and enhance acceptance criteria with lessons learned during implementation.
