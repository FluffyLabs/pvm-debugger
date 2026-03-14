# 001 - Workspace Bootstrap

Status: Implemented

## Purpose

Establish the monorepo skeleton for the PVM debugger rewrite, including package boundaries, shared TypeScript and test configuration, a minimal React web app, shared-ui integration, and Playwright smoke coverage.

## Required Outputs

```
package.json
tsconfig.base.json
vitest.config.ts
packages/types/
packages/trace/
packages/content/
packages/runtime-worker/
packages/orchestrator/
packages/cli/
apps/web/
README.md
```

The workspace must use the `@pvmdbg/<name>` namespace for all packages and `apps/web` must build as `@pvmdbg/web`.

## Root Workspace Requirements

1. Use npm workspaces with `packages/*` and `apps/*`.
2. Set the repository root to `"type": "module"`.
3. Provide root scripts for:
   - `build`
   - `test`
   - `lint`
   - `dev`
   - `test:e2e`
   - `cli`
4. `tsconfig.base.json` must enable strict TypeScript with:
   - `target: ES2022`
   - `module: NodeNext`
   - `moduleResolution: NodeNext`
5. `vitest.config.ts` must support both:
   - Node-based package tests
   - jsdom-based web tests

## Package Skeleton Requirements

Each package under `packages/` must include:

1. `package.json`
   - `"type": "module"`
   - `main` and `types` pointing to `dist/`
   - a `build` script using `tsc`
2. `tsconfig.json`
   - extending the root base config
   - compiling `src/` into `dist/`
3. `src/index.ts`
   - a real placeholder export, not an empty file
4. At least one non-trivial placeholder test
   - no `expect(true).toBe(true)`

## Web App Requirements

`apps/web` must provide:

1. Vite + React 19 application scaffold.
2. TailwindCSS v4 wired through `@tailwindcss/vite`.
3. Shared-ui integration using:
   - `@fluffylabs/shared-ui/theme.css`
   - `@fluffylabs/shared-ui/style.css`
4. Dark mode enabled by default via `setColorMode(true)`.
5. A minimal routed app that redirects `/` to `/load`.
6. A visible load screen built with shared-ui `Header` and `Content`.
7. Local copies of:
   - `Tabs`
   - `Table`
   - `Drawer`

Those copied components must use `cn` from `@fluffylabs/shared-ui`, not a duplicated local utility.

## Playwright Requirements

`apps/web` must include:

1. `playwright.config.ts`
2. `e2e/` directory
3. A smoke test that:
   - opens `/`
   - verifies redirect to `/load`
   - verifies the header is visible

## README Requirements

The root `README.md` must describe the project itself, not the planning workflow. It must contain:

1. Project name and one-line description.
2. Quick start commands.
3. Available scripts.
4. Workspace package overview.
5. Pointer to `docs/usage-guide.md` with a note that it lands after UI-016.
6. License placeholder or reference.

## Implementation Notes

1. Use the published shared-ui CSS export paths. Importing `@fluffylabs/shared-ui/dist/*.css` works against the local reference package layout but fails against the published package exports.
2. Keep the Vite major version aligned across the app, Vitest, and Vite plugins. Mixed Vite 6 and Vite 7 installs cause incompatible plugin typings during `tsc`.
3. jsdom tests need a `window.matchMedia` stub because shared-ui header components use responsive hooks.
4. Ensure the Vitest setup for TSX files supports the React JSX runtime consistently. If not, explicit `React` imports in tested TSX modules are an acceptable fallback.

## Acceptance Criteria

- `npm install` completes without workspace resolution errors.
- `npm run build` builds all packages and `apps/web`.
- `npm test` passes for both package and web tests.
- `apps/web` renders a minimal `/load` page using shared-ui `Header` and `Content`.
- Shared-ui styles are applied with working dark mode defaults.
- The web app includes copied `Tabs`, `Table`, and `Drawer` primitives adapted for this workspace.
- `cd apps/web && npx vite build` succeeds independently of the root build.
- `cd apps/web && npx playwright test` passes the smoke test.
- Every package and app manifest uses `"type": "module"`.
- All package names follow the `@pvmdbg/<name>` convention.

## Verification

Run:

```bash
npm install
npm run build
npm test
cd apps/web && npx vite build
cd apps/web && npx playwright install --with-deps chromium
cd apps/web && npx playwright test
```
