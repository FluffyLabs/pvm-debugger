# Repository Guidelines

## Project Structure & Module Organization
`src/` holds the React app: reusable UI in `components/`, feature views in `pages/`, Redux logic in `store/`, and shared helpers inside `hooks/` plus `lib/`. WASM-facing workers live in `src/packages/web-worker`; keep their RPC shapes aligned with the integrations listed in `README.md`. Static assets belong to `public/`, build outputs to `dist/`, and browser specs plus fixtures to `tests/`. Unit specs stay beside their modules using the `*.spec.ts(x)` suffix. Add any new top-level folder to the `@/` alias in `tsconfig.json`.

## Build, Test, and Development Commands
- `npm ci` – install the locked dependencies (Node 22.1.0 expected).
- `npm run dev` – start Vite with hot reload across workers.
- `npm run build` – run `tsc -b` then emit the production bundle into `dist/`.
- `npm run preview` – serve the built bundle locally for smoke tests.
- `npm run lint` / `npm run format(-check)` – enforce ESLint + Prettier, also triggered through `lint-staged`.
- `npm run test` / `npm run test:watch` – execute Vitest; `npx playwright test` runs the Playwright suite in `tests/`.

## Coding Style & Naming Conventions
Write TypeScript-first, functional components with two-space indentation and descriptive filenames (`memory-range-panel.tsx`). Favor Tailwind utilities from `globals.css` before adding new CSS files. Keep stateful flows in hooks or Redux slices, treat shared helpers as pure functions, and validate external inputs with Zod when user data is parsed. Run Prettier and ESLint before pushing, and note any required rule disables with a short justification.

## Testing Guidelines
Vitest with Testing Library is wired through `src/test-setup.ts`; assert observable behavior and match file names to the unit under test (e.g., `store/pvmSlice.spec.ts`). Cover success and failure paths for reducers, hooks, and components that manage debugger state. Playwright specs (`tests/*.spec.ts`) should script critical journeys such as uploading WASM or stepping instructions, reusing fixtures from `tests/utils` for deterministic inputs. New work must land with corresponding unit coverage, and UI tweaks should update the affected Playwright expectations.

## Commit & Pull Request Guidelines
Commits follow the imperative style in history (`Fix persisted state (#445)`), ideally with scope hints and linked issues. Pull requests should summarize intent, list verification steps or commands, and mention any PVM compatibility or worker contract changes. Attach screenshots or recordings for UI-facing tweaks. Keep branches rebased, ensure `npm run lint` and the relevant tests pass locally, and only request review once CI-critical commands succeed.
