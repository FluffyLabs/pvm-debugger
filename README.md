# PVM Debugger

A browser-based debugger for PolkaVM programs with multi-interpreter support, trace replay, and host call inspection.

## Live Instance

<!-- Replace with the deployed URL when available -->
*Deployment URL coming soon.*

## Quick Start

```bash
npm install
npm run build
npm run dev
```

Then open <http://localhost:5173> to launch the debugger.

## Documentation

See the **[Usage Guide](docs/usage-guide.md)** for a walkthrough of every feature — loading programs, stepping through code, inspecting registers and memory, host calls, trace comparison, and multi-PVM debugging.

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

## Development

```bash
npm install          # install all workspace dependencies
npm run build        # build all packages (required before first dev run)
npm run dev          # start the Vite dev server with hot reload
npm test             # run unit tests across all packages
npm run test:e2e     # run Playwright end-to-end tests
npm run cli          # replay a trace file via the CLI tool
```

## License

See repository root for license information.
