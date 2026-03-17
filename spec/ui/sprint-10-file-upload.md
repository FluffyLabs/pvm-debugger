# Sprint 10 — File Upload Source

Status: Implemented

## Goal

Add file upload as a program source on the load page. Users can drag-and-drop or use a file picker to load local program files. This introduces the two-column load page layout and the `Continue` button flow for non-example sources.

## What Works After This Sprint

- Load page has a two-column layout: sources (left) + examples (right)
- File upload supports drag-and-drop and file picker
- Accepted extensions: `.jam`, `.pvm`, `.bin`, `.log`, `.json`
- Selected file shows name and byte count
- Format is auto-detected through `detectFormat()`
- `Continue` button appears and enables after valid file selection
- Continue advances to Load Program (or step 2 placeholder if step 2 isn't built yet)

## Prior Sprint Dependencies

- Sprint 09: example browser, load page

## Required Files

```
apps/web/src/components/load/SourceStep.tsx
apps/web/src/components/load/FileUpload.tsx
apps/web/src/components/load/format.ts
apps/web/src/pages/LoadPage.tsx              (extend to two-column layout)
apps/web/e2e/sprint-10-file-upload.spec.ts
```

## Layout Contract

Two-column layout on desktop:

- left column: file upload (and future URL/hex inputs)
- right column: example browser

On narrow screens, columns stack vertically. Tabs are not allowed.

## File Upload Contract

Use `loadUpload()` and `detectFormat()` from the content package.

Rules:

- support both drag-and-drop and file picker
- accept `.jam`, `.pvm`, `.bin`, `.log`, `.json`
- show selected file name and byte count after selection
- detect format automatically
- the UI must not reimplement loading or format detection

## Continue Flow Contract

Non-example sources use a `Continue` button:

- `Continue` is disabled until a valid file is selected and parsed
- pressing Continue either advances to wizard step 2 (Sprint 12) or directly loads the program if step 2 is not yet available
- the load page must track `rawPayload` and `detectedFormat` state

## E2E Tests

```
- two-column layout renders (upload left, examples right)
- file picker upload shows filename and byte count
- Continue button appears and enables after file selection
- Continue loads the program and navigates to debugger
- narrow viewport stacks columns vertically
```

## Acceptance Criteria

- Load page uses a two-column layout.
- File upload supports drag-and-drop and file picker.
- Selected file shows name and byte count.
- Format is auto-detected.
- Continue enables only after valid selection.
- `cd apps/web && npx vite build` succeeds.
- E2E tests pass.

## Verification

```bash
cd apps/web && npx vite build
npx playwright test e2e/sprint-10-file-upload.spec.ts
```

## Implementation Notes

_Added during implementation for future agents._

### Architecture decisions
- **`SourceStep.tsx`** owns the load-navigate flow (`createProgramEnvelope → initialize → loadProgram → setEnvelope → navigate`). When Sprint 12 adds wizard step 2, modify `handleContinue()` in SourceStep to route to the config step instead of going directly to the debugger.
- **`FileUpload.tsx`** is a pure presentation component — it reports `FileUploadResult` upward and has no routing or orchestrator knowledge. Future source types (URL, hex input) should follow the same pattern: report a `RawPayload + DetectedFormat` to SourceStep.
- **`format.ts`** contains shared format label/badge maps used by both FileUpload and ExampleList. ExampleList indexes these maps by the manifest's `format` string (which uses the same keys as `DetectedFormat["kind"]`).

### Known DRY opportunity
Both `ExampleList.handleSelect` and `SourceStep.handleContinue` contain nearly identical load flows. A shared `useLoadProgram()` hook could extract the common `createProgramEnvelope → initialize → loadProgram → setEnvelope → navigate` sequence. Deferred since it crosses sprint boundaries — consider when adding the third source type.

### Edge cases verified
- File extension validation rejects unsupported types before calling `loadUpload()`.
- Clearing a file resets to the dropzone state and disables Continue.
- Re-uploading a different file after clearing correctly updates format badge and filename.
- All four format types tested via E2E: Generic (.pvm), JAM SPI (.jam), JSON test vector (.json), Trace (.log).
