# Feature Specifications

This folder contains feature specifications for the PVM debugger rewrite.

Each spec file documents the **what** and **why** of a feature — interfaces, behavior, constraints, and acceptance criteria — so that implementations can be built from these specs without re-deriving the design.

## Structure

- `spec/*.md` — core package specs (types, trace parser, content pipeline, orchestrator, etc.)
- `spec/ui/*.md` — UI feature specs (panels, wizard, drawer tabs, etc.)

## After implementation

When a spec is implemented and verified:
1. Add `Status: Implemented` to the top of the spec file.
2. **Keep and enhance acceptance criteria** — add edge cases, pitfalls, and verification steps discovered during implementation.
3. Preserve interfaces, behavior rules, and architectural constraints.

## File naming

`NNN-short-title.md`.
