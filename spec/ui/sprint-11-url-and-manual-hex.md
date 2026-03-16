# Sprint 11 — URL + Manual Hex Sources

## Goal

Add the remaining two source types to the load page: URL fetch and manual hex input. After this sprint all four source methods are available.

## What Works After This Sprint

- URL input fetches binary payloads, supports GitHub blob URL rewriting
- URL fetch shows loading state and byte count on success
- Manual hex input validates on blur
- Invalid hex shows a destructive error
- Valid hex shows byte count and enables Continue
- All four sources (upload, URL, hex, examples) coexist on one page

## Prior Sprint Dependencies

- Sprint 10: two-column layout, source step, file upload, Continue flow

## Required Files

```
apps/web/src/components/load/UrlInput.tsx
apps/web/src/components/load/ManualInput.tsx
apps/web/src/components/load/SourceStep.tsx   (extend)
apps/web/e2e/sprint-11-url-and-hex.spec.ts
```

## URL Input Contract

Use `loadUrl()` from the content package.

Rules:

- support GitHub blob URL rewriting through the content package
- show loading state while fetching
- show fetched byte count on success
- clear the pending selection when the URL text changes
- errors surface in an alert

## Manual Hex Input Contract

Use `loadManualInput()` from the content package.

Rules:

- validate on blur
- keep Continue disabled until hex parses successfully
- show a destructive alert for invalid hex
- show parsed byte count once valid

## Source Selection Contract

All four source methods live on the same screen:

- left column: upload, URL input, manual hex (stacked vertically)
- right column: example browser

Rules:

- selecting any source type clears any prior pending selection from a different type
- example selections still advance immediately (no Continue needed)
- non-example sources share the same Continue button

## E2E Tests

```
- URL fetch succeeds and shows byte count
- URL fetch shows loading state
- invalid manual hex shows error alert
- valid manual hex enables Continue and shows byte count
- all four source types are visible on the page
```

## Acceptance Criteria

- URL and manual hex inputs are present on the load page.
- URL fetch uses the content loader with GitHub URL rewriting.
- Manual hex validates on blur with clear error feedback.
- All four source types coexist in the two-column layout.
- Continue is shared across non-example sources.
- `cd apps/web && npx vite build` succeeds.
- E2E tests pass.

## Verification

```bash
cd apps/web && npx vite build
npx playwright test e2e/sprint-11-url-and-hex.spec.ts
```
