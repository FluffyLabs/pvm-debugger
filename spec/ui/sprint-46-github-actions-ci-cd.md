# Sprint 46 — GitHub Actions CI/CD

Status: Implemented

## Goal

Add full GitHub Actions CI/CD: PR checks (lint, type-check, test, e2e, changeset verification), continuous `next` tag publishing to npm on every main commit, Changesets-driven `latest` releases, and GitHub Pages deployment.

## What Works After This Sprint

- Every PR to `main` is checked for: Biome lint, TypeScript compilation, unit tests, web app build, Playwright e2e tests, and changeset presence
- Every push to `main` publishes all 6 `@pvmdbg` packages to npm with the `next` tag and a `-next.<short-sha>` version suffix
- Every push to `main` deploys the web app to GitHub Pages
- Merging a Changesets "Version Packages" PR publishes all packages with the `latest` tag and npm provenance attestations
- Contributors add changeset files via `npx changeset` to describe their changes and intended version bumps

## Prior Sprint Dependencies

- All prior sprints (this is infrastructure, not UI)

## Required Files

```
.github/workflows/ci.yml
.github/workflows/publish-next.yml
.github/workflows/release.yml
.changeset/config.json
.githooks/pre-push
biome.json
```

## Modified Files

```
package.json              (add biome, changesets deps; add lint/lint:fix/prepare scripts; fix build order)
apps/web/vite.config.ts   (set base path for GitHub Pages)
```

## Architecture

### Three Workflow Files

Each workflow has a single trigger and a clear purpose:

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| `ci.yml` | `pull_request` to `main` | Validate code quality before merge |
| `publish-next.yml` | `push` to `main` | Publish `next` npm packages + deploy Pages |
| `release.yml` | `push` to `main` | Manage Changesets Version PR + publish `latest` |

### CI Workflow (`ci.yml`)

Trigger: `on: pull_request` targeting `main`.

Two jobs: `ci` (required) and `e2e` (runs after `ci` passes).

**Job: `ci` — Lint, Test & Build**

1. Checkout code
2. Setup Node.js 22.x with npm cache
3. `npm ci`
4. **Build all packages and web app** — `npm run build` (builds packages in dependency order: types → trace → runtime-worker → content → orchestrator → cli → web)
5. **Lint** — `npx biome check .`
6. **Unit tests** — `npm test`
7. **Changeset check** — Verify a `.changeset/*.md` file is present in the PR (skip for PRs from the changesets bot)

**Job: `e2e` — E2E Tests** (needs: `ci`)

1. Checkout, setup Node.js, `npm ci`, build (same as above)
2. Install Playwright Chromium
3. `npm run test:e2e -w apps/web`

### Publish Next Workflow (`publish-next.yml`)

Trigger: `on: push` to `main`.

Permissions: `id-token: write` (npm OIDC provenance), `contents: read`, `pages: write`.

Steps:

1. Checkout code
2. Setup Node.js 22.x with registry URL `https://registry.npmjs.org`
3. `npm ci`
4. Build all packages
5. **Patch versions** — For each package in `packages/*/package.json`, rewrite the `version` field to `<current>-next.<short-sha>` (7 chars). A small inline script or a shell loop handles this.
6. **Publish all 6 packages** — `npm publish --tag next --provenance --access public` from each package directory. npm workspaces resolves `*` workspace references to actual versions at publish time.
7. Build the web app
8. **Deploy to GitHub Pages** — Use `actions/upload-pages-artifact` + `actions/deploy-pages` with `apps/web/dist/`

Authentication: npm trusted publishing via OIDC — the `id-token: write` permission allows npm to verify the publish originated from this repo. No `NPM_TOKEN` secret is needed. Requires npm 9.5+ (bundled with Node 22.x) and the npm org to have trusted publishing configured for the repo.

### Release Workflow (`release.yml`)

Trigger: `on: push` to `main`.

Permissions: `id-token: write`, `contents: write`, `pull-requests: write`.

Steps:

1. Checkout code with `fetch-depth: 0` (full history, needed by changesets)
2. Setup Node.js 22.x with registry URL
3. `npm ci`
4. Build all packages
5. **Run `changesets/action`** with:
   - `version`: `npx changeset version`
   - `publish`: `npx changeset publish --access public`
   - The action detects state automatically:
     - Pending changesets → creates/updates a "Version Packages" PR
     - No pending changesets (version PR was just merged) → publishes to npm with `latest` tag

Uses a **GitHub App token** (not the default `GITHUB_TOKEN`) so the Version Packages PR triggers CI checks. The app credentials are stored as repo secrets: `APP_ID` and `APP_PRIVATE_KEY`. The workflow uses `actions/create-github-app-token` to generate a short-lived token.

### Changesets Configuration (`.changeset/config.json`)

```json
{
  "$schema": "https://unpkg.com/@changesets/config@3.1.1/schema.json",
  "changelog": ["@changesets/changelog-github", { "repo": "FluffyLabs/pvm-debugger" }],
  "commit": false,
  "fixed": [],
  "linked": [],
  "access": "public",
  "baseBranch": "main",
  "updateInternalDependencies": "patch",
  "ignore": ["@pvmdbg/web", "@pvmdbg/root"]
}
```

Key choices:
- `access: "public"` — scoped packages are public
- `ignore` — skip the web app (not published) and root package
- `updateInternalDependencies: "patch"` — when a dependency is bumped, dependents get a patch bump
- `changelog` uses `@changesets/changelog-github` for PR/author links in CHANGELOGs

### Biome Configuration (`biome.json`)

Minimal initial config at root:

```json
{
  "$schema": "https://biomejs.dev/schemas/2.0/schema.json",
  "linter": {
    "enabled": true
  },
  "formatter": {
    "enabled": true,
    "indentStyle": "space",
    "indentWidth": 2
  },
  "files": {
    "ignore": ["**/dist/**", "**/node_modules/**", "**/.changeset/**"]
  }
}
```

### GitHub Pages Base Path

`apps/web/vite.config.ts` needs `base: "/pvm-debugger/"` (matching the repo name) so asset paths resolve correctly when served from `https://fluffylabs.github.io/pvm-debugger/`.

### npm Trusted Publishing (OIDC Provenance)

All `npm publish` commands use `--provenance`. This requires:
- The `id-token: write` permission in the workflow
- Each `@pvmdbg/*` package linked to the `FluffyLabs/pvm-debugger` repo in npm org settings
- The npm org configured to allow publishing from GitHub Actions

No npm tokens are stored as GitHub secrets.

## New Dependencies

Added to root `package.json` as `devDependencies`:

- `@biomejs/biome` — linter and formatter
- `@changesets/cli` — changeset management CLI
- `@changesets/changelog-github` — changelog generation with GitHub PR links

## New Scripts

Added to root `package.json`:

- `"build"` — builds all packages in dependency order (types → trace → runtime-worker → content → orchestrator → cli) then web app
- `"build:packages"` — builds only the library packages in dependency order (excludes web app)
- `"lint": "biome check ."`
- `"lint:fix": "biome check --write ."`
- `"prepare"` — configures git to use `.githooks/` as the hooks directory

## Pre-push Git Hook

A `.githooks/pre-push` hook runs the same checks as CI locally before each push: build, lint, and unit tests. The `prepare` npm script automatically configures `git config core.hooksPath .githooks` on `npm install`, so the hook activates for all contributors without manual setup.

## Manual Setup Required (Outside of Code)

These steps must be performed by a repo admin before the workflows function:

1. **GitHub Pages**: In repo Settings → Pages, set source to "GitHub Actions"
2. **npm org**: In npmjs.com settings for `@pvmdbg`, link each package to the `FluffyLabs/pvm-debugger` repo for trusted publishing
3. **GitHub App**: Create (or reuse) a GitHub App with `contents: write` and `pull_requests: write` permissions on the repo. Store `APP_ID` and `APP_PRIVATE_KEY` as repo secrets.

## E2E Tests

```
- CI workflow blocks PR merge on lint failure
- CI workflow blocks PR merge on type-check failure
- CI workflow blocks PR merge on unit test failure
- CI workflow blocks PR merge on e2e test failure
- CI workflow blocks PR merge on missing changeset
- Push to main publishes all packages with next tag
- Push to main deploys web app to GitHub Pages
- Merging Version Packages PR publishes latest to npm
```

## Acceptance Criteria

- All three workflow files exist and are syntactically valid YAML.
- A PR without a changeset file fails the CI check.
- A PR with lint errors, type errors, or test failures fails the CI check.
- Pushing to main triggers `next` tag publish of all 6 packages with `-next.<sha>` version.
- Pushing to main deploys the web app to GitHub Pages at `https://fluffylabs.github.io/pvm-debugger/`.
- The Changesets action creates a "Version Packages" PR when changesets are pending.
- Merging the "Version Packages" PR publishes all bumped packages with `latest` tag and provenance.
- Biome is configured and catches lint/format issues.
- The web app works correctly on GitHub Pages (base path is set).

## Verification

```bash
# Validate workflow YAML syntax
npx yaml-lint .github/workflows/*.yml

# Validate biome config
npx biome check .

# Validate changesets config
npx changeset status

# Test the full build pipeline locally (same as CI)
npm ci && npm run build && npx biome check . && npm test
```
