# UI-002 - Load Wizard Step 1

## Purpose

Implement the first load-wizard step as a working source selector:

- upload local files
- fetch binary payloads from URLs
- accept manual hex input
- browse bundled and remote examples from the manifest

Step 1 must hand off a real `RawPayload` plus `DetectedFormat` to the next wizard step.

## Required Files

```
apps/web/src/pages/LoadPage.tsx
apps/web/src/components/load/SourceStep.tsx
apps/web/src/components/load/ExampleList.tsx
apps/web/src/components/load/FileUpload.tsx
apps/web/src/components/load/ManualInput.tsx
apps/web/src/components/load/UrlInput.tsx
apps/web/src/components/load/format.ts
apps/web/e2e/load-wizard-step1.spec.ts
```

## Wizard Contract

`LoadPage` owns:

- `step`
- `rawPayload`
- `detectedFormat`
- `exampleEntry`

Rules:

- step 1 renders the source selector
- step 2 may still be a placeholder preview at this stage
- advancing from step 1 must already carry the real payload and detected format
- selecting an example card advances immediately without a separate continue click
- non-example sources enable a `Continue` action only after valid input is ready

## Layout Contract

Use a two-column layout on desktop:

- left column: upload, URL input, manual hex
- right column: example browser

On narrow screens, columns must stack vertically.

Tabs are not allowed for this step.

## Source Behavior

### Upload

- support drag-and-drop and file picker
- accept `.jam`, `.pvm`, `.bin`, `.log`, `.json`
- parse through `loadUpload()`
- detect through `detectFormat()`
- show selected file name and byte count

### URL

- use `loadUrl()`
- support GitHub blob URL rewriting through the content package
- show loading state while fetching
- show fetched byte count on success
- clear the pending selection when the URL changes

### Manual Hex

- use `loadManualInput()`
- validate on blur
- keep continue disabled until the hex parses successfully
- show a destructive alert for invalid hex
- show parsed byte count once valid

## Example Browser

Use `getExamplesManifest()` and `loadExample()`.

Requirements:

- render all six manifest categories
- each category is collapsible and open by default
- cards show example name and format badge
- remote examples show `Remote`
- bundled examples should resolve byte size when possible
- remote example clicks show per-card loading state
- errors are surfaced in an alert instead of crashing the page
- `entrypoint` and `initialState` metadata must survive in the loaded `RawPayload.exampleEntry`

## Shared Package Boundary

The UI must not reimplement source loading or format detection.

It must use:

- `loadUpload()`
- `loadUrl()`
- `loadManualInput()`
- `loadExample()`
- `detectFormat()`

This keeps step 1 aligned with the content pipeline used by the CLI and later debugger flows.

## Step 2 Placeholder

At this stage, step 2 may be a preview-only placeholder, but it must display:

- source identifier
- detected format label
- payload byte count
- example preset name when present

A back action must return to step 1 without crashing.

## Testing Requirements

E2E coverage must prove:

- two-column layout appears
- all example categories render
- clicking a bundled example advances to step 2
- file picker upload enables continue
- invalid manual hex shows an error
- valid manual hex enables continue
- URL fetch succeeds and enables continue
- narrow viewports stack the columns vertically

## Acceptance Criteria

- Step 1 renders upload, URL, manual, and examples in one screen.
- Continue remains disabled until a valid non-example source is ready.
- Example cards load through the content package and advance immediately.
- Manual hex validation runs on blur and surfaces clear errors.
- URL fetch uses the content loader and shows loading feedback.
- All six categories from `fixtures/examples.json` render.
- Step 1 passes the real `RawPayload`, `DetectedFormat`, and optional `ExampleEntry` into step 2.
- `cd apps/web && npx vite build` succeeds.
- `npx playwright test e2e/load-wizard-step1.spec.ts` succeeds.
- `npm test` succeeds for the workspace with the new load-step flow.

## Verification

```bash
cd apps/web && npx vite build
npx playwright test e2e/load-wizard-step1.spec.ts
npm test
```
