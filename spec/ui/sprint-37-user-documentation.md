# Sprint 37 — User Documentation

Status: Implemented

## Goal

Publish the user-facing documentation set: a practical usage guide, screenshot set, and an updated README. The documentation describes how to use the shipped app, not how the code is implemented.

## What Works After This Sprint

- `docs/usage-guide.md` covers the full debugger workflow
- `docs/usage-screenshots/` contains real screenshots from the running app
- `README.md` links to the guide and reflects the current workspace
- The documentation reads as an end-user guide

## Prior Sprint Dependencies

- All prior sprints (documentation covers the complete app)

## Required Files

```
docs/usage-guide.md
docs/usage-screenshots/
README.md
```

## Usage Guide Contract

`docs/usage-guide.md` covers the full workflow in concise, task-oriented language:

1. Getting started
2. Loading a program
3. Configuring the program
4. The debugger screen
5. Stepping through code
6. Working with registers and state
7. Viewing memory
8. Host calls
9. Trace comparison
10. Settings
11. Multiple PVMs
12. Persistence

Rules:

- write in second person
- explain what to click and what to expect
- keep implementation details out unless they affect user behavior
- reference screenshots with relative paths under `usage-screenshots/`

## Screenshot Contract

Screenshots from the running app (not from a reference project):

- descriptive filenames
- no browser chrome in frame
- prefer real debugger states over empty placeholders
- include: loader, config, debugger, host-call, trace, settings, multi-PVM, persistence states

Implementation pitfalls:

- the host-call drawer auto-opens when paused; clicking the active tab again collapses it
- trace screenshots are more useful after at least one host call has been resumed

## README Contract

`README.md` as the top-level entrypoint:

- project name and one-line description
- quick start
- live instance placeholder or URL
- link to the usage guide
- script table
- workspace package table
- development commands
- license status

## Acceptance Criteria

- `docs/usage-guide.md` covers all 12 sections.
- `docs/usage-screenshots/` contains real screenshots.
- All image references resolve to existing files.
- `README.md` links to the guide and is current.
- The documentation reads as a user guide, not a planning artifact.

## Verification

```bash
grep -oP '(?<=\()usage-screenshots/[^)]+' docs/usage-guide.md | while read f; do
  [ -f "docs/$f" ] || echo "MISSING: docs/$f"
done
```
