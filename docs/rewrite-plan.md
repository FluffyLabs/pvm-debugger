# PVM Debugger Rewrite Plan

Last updated: 2026-03-12
Status: Refined — all tickets written with concrete specs. Incorporates feedback from opus46/gpt54 test runs.

## 1. Brief Project Description

Rewrite the PVM debugger from scratch. The current app (`reference/pvm-debugger/`) is a React + Redux web debugger. The rewrite separates browser-agnostic core logic from the UI and rebuilds with clean package boundaries, typed event-emitter orchestration (no Redux), and detailed per-feature UI tickets.

## 2. Scope for Rewrite V1

**In scope:**
- Source loading: examples (from fixtures), URL payload, upload, manual hex input, local storage restore.
- Format detection and SPI decoding (with metadata, without metadata, generic PVM, trace files).
- Async PVM adapter interface with real interpreters (Typeberry + Ananas from npm).
- Web worker bridge for browser execution + direct adapter for Node.js.
- Event-emitter orchestrator with per-PVM lifecycle, breakpoints, host-call handling, trace recording.
- CLI trace replay tool (Node.js).
- Web UI: load wizard (2 steps), 3-column debugger, bottom drawer (settings, trace log, host calls).
- Contextual host call UIs: gas, storage read/write, log, generic.
- Persistence and auto-reload.

**Out of scope:**
- Post-load editor modes.
- Full per-field multi-PVM diff viewer.
- Dynamically loaded PVMs (URL/file WASM upload).
- PolkaVM adapter.
- Rich manual-input parsing beyond hex.

## 3. Ticket Structure

### Core Package Specs (`spec/001-007`)

Sequential implementation. See `spec/README.md` for dependency graph.

| # | Title | Key Output |
|---|---|---|
| 001 | Workspace Bootstrap | Monorepo skeleton, shared config, Vite+React web app |
| 002 | Types and Interface Contracts | All shared types and the locked `PvmAdapter` interface |
| 003 | ECALLI Trace Parser | Trace parse/serialize/compare package |
| 004 | Content Pipeline | Source loading, format detection, SPI decoding |
| 005 | Runtime Worker + Adapters | Web worker bridge, Typeberry + Ananas adapters |
| 006 | Orchestrator | Multi-PVM orchestrator with events, host calls, breakpoints |
| 007 | CLI Trace Replay | Node.js CLI that validates orchestrator works without browser |

### UI Feature Specs (`spec/ui/001-016`)

Granular per-feature specs. See `spec/ui/` for the full list.

| # | Title |
|---|---|
| 001 | App Shell and Routing |
| 002 | Load Wizard — Step 1: Source Selection |
| 003 | Load Wizard — Step 2: Detection Preview + Config |
| 004 | Debugger Layout (3-column + drawer) |
| 005 | Instructions Panel |
| 006 | Registers and Status Panel |
| 007 | Memory Panel |
| 008 | Execution Controls |
| 009 | PVM Tabs and Divergence Indicators |
| 010 | Bottom Drawer — Settings Tab |
| 011 | Bottom Drawer — Trace Log Tab |
| 012 | Bottom Drawer — Host Call Tab |
| 013 | Persistence and Reload |
| 014 | Block Stepping Integration |
| 015 | Integration Smoke Test (E2E) |
| 016 | User Documentation |

## 4. Key Design Decisions

1. **No lockstep mode** — orchestrator has only `step(n)`. Caller controls granularity.
2. **Event-emitter pattern** — strictly typed, works in browser + Node.js.
3. **No Redux** — React hooks + orchestrator events.
4. **Real PVM interpreters** — `@typeberry/lib` v0.5.9 and ananas from npm. No mocks.
5. **Web workers** for browser, `DirectAdapter` for Node.js CLI.
6. **Shared-ui + local components** — use `@fluffylabs/shared-ui` where available, copy Tabs/Table/Drawer from reference app.
7. **Bottom drawer** — draggable, collapsible, auto-opens for host calls (unless auto-continue handles it silently).
8. **Load wizard** — 2 steps: source selection (with 6 example categories) → detection preview + SPI config (builder+RAW mode).
9. **Trace log** — two-column comparison in ECALLI text format. Log statements rendered as readable text.
10. **Storage host calls** — editable storage table persists across host calls. High-level decoded view.
11. **No separate resume button** — normal Step/Run/Block controls handle host call resumption.
12. **Paused state** — after load, PVM is "paused" (not "ready"). All values editable when paused.
13. **No gas editing in load wizard** — initial gas is editable in the debugger screen after load.
14. **No infinite memory scroll** — ranges-only view with collapsible page ranges.
15. **Virtual scrolling** — instructions panel uses `@tanstack/react-virtual` for large programs.
16. **Visual style guide** — dense, monospace, minimal chrome. See architecture doc section 12.
17. **E2E tests** — every UI ticket includes Playwright E2E test specifications.

## 5. Reference Code

Available as git submodules:
- `reference/pvm-debugger/` — current production app
- `reference/shared-ui/` — shared UI component library

Agents should read reference code for behavior understanding but write clean new code. No copy-paste of logic.

## 6. Fixtures

`fixtures/` directory contains example programs and trace files:
- `.jam` files: JAM SPI programs with metadata
- `.log` files: ECALLI trace files in JIP-6 format

These are used as test fixtures and as example programs in the load wizard.
