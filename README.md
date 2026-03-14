# PVM Debugger

A clean-architecture rewrite of the PolkaVM debugger, supporting multiple PVM interpreters with a web-based debugging interface.

## Quick Start

```bash
npm install
npm run build
npm run dev        # start the web app dev server
```

## Available Scripts

| Script | Description |
|---|---|
| `npm run build` | Build all packages and apps |
| `npm test` | Run all unit tests |
| `npm run lint` | Type-check all packages |
| `npm run dev` | Start the web app dev server |
| `npm run test:e2e` | Run Playwright end-to-end tests |
| `npm run cli` | Run the CLI trace replay tool |

## Workspace Packages

| Package | Description |
|---|---|
| `@pvmdbg/types` | Shared domain types and interface contracts |
| `@pvmdbg/trace` | ECALLI trace parser, validator, serializer, comparator |
| `@pvmdbg/content` | Source loading, format detection, JAM SPI decoding |
| `@pvmdbg/runtime-worker` | Browser web worker bridge for PVM adapters |
| `@pvmdbg/orchestrator` | Multi-PVM orchestration, host calls, breakpoints |
| `@pvmdbg/cli` | Node.js CLI for trace replay |
| `@pvmdbg/web` | React web UI for the debugger |

## Documentation

Usage guide will be available at `docs/usage-guide.md` after UI-016 is complete.

## License

See repository root for license information.
