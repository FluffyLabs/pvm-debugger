# Sprint 11 — URL + Manual Hex Sources

Status: Implemented

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

## Implementation Notes

### Edge cases discovered during implementation

- **Vite preview SPA fallback**: The vite preview server serves `index.html` as a 200 response for non-existent paths (SPA fallback). This means using `http://localhost:4199/nonexistent.pvm` in URL error tests will succeed with HTML content instead of 404. E2E tests for URL errors must use a dead port (e.g., `localhost:19876`) to trigger genuine network errors.
- **Source exclusivity**: `SourceStep` tracks an `activeSource` discriminant (`"file" | "url" | "hex" | null`). When any source produces a result, the other two results are cleared to prevent stale payloads from being sent to `createProgramEnvelope`.
- **URL text change clears result**: Editing the URL field immediately clears any fetched result and disables Continue, forcing re-fetch. This prevents submitting stale bytes from a previously fetched URL.
- **Hex with 0x prefix**: `loadManualInput` strips whitespace but `fromHex` from `@pvmdbg/types` handles the `0x` prefix. Verified with E2E test.
- **Manual hex validates on blur only**: Does not validate on every keystroke to avoid noisy errors while typing.
- **Empty hex on blur**: Correctly does nothing — no error, no success, Continue stays disabled.
- **`formatByteCount` deduplication**: Initially duplicated across FileUpload, UrlInput, and ManualInput. Extracted to `format.ts` as a shared utility per the "No duplicate utilities" guardrail.

### Test IDs added

- `url-input`, `url-input-field`, `url-input-fetch`, `url-input-loading`, `url-input-success`, `url-input-bytecount`, `url-input-error`
- `manual-input`, `manual-input-field`, `manual-input-success`, `manual-input-bytecount`, `manual-input-error`

## Verification

```bash
cd apps/web && npx vite build
npx playwright test e2e/sprint-11-url-and-hex.spec.ts
```
