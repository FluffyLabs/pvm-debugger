# UI-016 - User Documentation

## Purpose

Publish the user-facing documentation set for the rewrite:

- a practical usage guide in `docs/usage-guide.md`
- a screenshot set in `docs/usage-screenshots/`
- a final contributor/end-user README at the repo root

The guide must describe how to use the shipped app, not how the code is implemented.

## Required Files

```
docs/usage-guide.md
docs/usage-screenshots/
README.md
```

## Usage Guide Contract

`docs/usage-guide.md` must cover the full debugger workflow in concise, task-oriented language.

Required sections:

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
- keep implementation detail out of the guide unless it affects user behavior
- reference screenshots with relative Markdown paths under `usage-screenshots/`

## Screenshot Contract

The screenshot directory must be populated from the running rewrite app, not from the reference project.

Rules:

- use descriptive filenames
- keep browser chrome out of frame
- prefer real debugger states over empty placeholders
- include loader, config, debugger, host-call, trace, settings, multi-PVM, and persistence states

Implementation pitfalls:

- the host-call drawer auto-opens when paused on a host call; clicking the active Host Call tab again collapses it
- trace screenshots are more useful after at least one trace-backed host call has been resumed so recorded entries exist

## README Contract

`README.md` must be the final top-level entrypoint for users and contributors.

Required content:

- project name and one-line description
- quick start
- live instance placeholder or URL
- link to the usage guide
- script table
- workspace package table
- development commands
- current license status

## Acceptance Criteria

- `docs/usage-guide.md` exists and covers all 12 user-facing sections.
- `docs/usage-screenshots/` contains real screenshots from the rewrite app.
- All Markdown image references resolve to files under `docs/usage-screenshots/`.
- `README.md` links to the user guide and reflects the current workspace scripts/packages.
- The documentation reads as an end-user guide, not as a planning artifact.

## Verification

```bash
grep -oP '(?<=\\()usage-screenshots/[^)]+' docs/usage-guide.md | while read f; do
  [ -f "docs/$f" ] || echo "MISSING: docs/$f"
done
```
