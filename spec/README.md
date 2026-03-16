# Feature Specifications

This folder contains feature specifications for the PVM debugger rewrite.

Each spec file documents the **what** and **why** of a feature — interfaces, behavior, constraints, and acceptance criteria — so that implementations can be built from these specs without re-deriving the design.

## Structure

- `spec/*.md` — core package specs (types, trace parser, content pipeline, orchestrator, etc.)
- `spec/ui/sprint-NN-*.md` — UI sprint specs, 37 thin vertical slices organized in 7 phases

The UI specs follow a sprint-based iterative process. Each sprint delivers a functional, end-to-end testable feature. Sprints are ordered by dependency — later sprints build on earlier ones.

## After implementation

When a spec is implemented and verified:
1. Add `Status: Implemented` to the top of the spec file.
2. **Keep and enhance acceptance criteria** — add edge cases, pitfalls, and verification steps discovered during implementation.
3. Preserve interfaces, behavior rules, and architectural constraints.

## File naming

- Core specs: `NNN-short-title.md`
- UI sprints: `sprint-NN-short-title.md`
