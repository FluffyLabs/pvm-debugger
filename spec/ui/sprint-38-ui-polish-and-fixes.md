# Sprint 38 — UI Polish, Load Flow Improvements, and JSON Fix

Status: Implemented

## Goal

Comprehensive UI polish pass across the load screen and debugger, fix broken JSON test vector loading, streamline the load flow for non-SPI programs, and align visual design with the reference pvm-debugger.

## Prior Sprint Dependencies

- Sprint 36 (integration smoke test, dev bridge)
- Sprint 37 (user documentation)

## What Works After This Sprint

### Load Screen

1. **Equal two-column layout.** The load page grid uses equal column widths (not 1:2 ratio).

2. **Lighter example cards.** Example buttons use the tertiary button variant with very faint borders (`border-border/20`), no bold text, and reduced font size (~75% of body). Cards are laid out in a uniform-width CSS grid (`auto-fill, minmax(11rem, 1fr)`).

3. **Compact format badges.** The example cards use a plain inline span for format badges instead of the shared-ui Badge component (which can't be resized due to npm package CSS specificity). Badges are very small (`text-[0.55rem]`), color-coded per format using CSS variables (`--color-info`, `--color-success`, `--color-warning`, `--color-brand-primary`), with `opacity: 0.7` for subtlety.

4. **Text left, badge right.** Each example card has `justify-between` layout with the name left-aligned and badge right-aligned. Long names are truncated with ellipsis.

5. **No "Remote" indicators.** The globe icon and "Remote" text are removed from example cards.

6. **"Examples" header.** The examples column has an "Examples" heading above the category sections.

7. **Default collapsed sections.** Only "Generic PVM Programs", "AssemblyScript → PVM", and "Trace Files" categories start expanded. Others start collapsed.

8. **Left-aligned headers.** The "Load Program" and "Program Summary" headings and subtitles are left-aligned (matching the content container width) rather than centered.

9. **Detection summary background.** The DetectionSummary card uses `bg-card` to match the SPI Entrypoint config box.

### Load Flow

10. **URL fetch auto-advances.** After a successful URL fetch, the load flow automatically advances to step 2 (no manual "Continue" click needed).

11. **Non-SPI programs skip step 2.** Generic PVM, JSON test vectors, and trace files go directly to the debugger, bypassing the ConfigStep summary screen. Only SPI formats show the entrypoint configuration. On failure, falls back to step 2 so the user sees the error.

12. **No alert on session restore failure.** When restoring a previous session fails, the app silently navigates to the load screen instead of showing a `window.alert()`.

### JSON Test Vector Fix

13. **Correct blob handling.** The `decodeJsonTestVector` function now tries `ProgramDecoder.deblob()` first on the `program` field bytes, since upstream jamtestvectors provide pre-encoded PVM blobs. Falls back to wrapping with `encodePvmBlob()` only if deblob fails. This fixes the "unknown instruction (4)" bug.

14. **Corrected local fixture.** The `fixtures/json/inst_add_32.json` file is updated to match the upstream jamtestvectors data (program bytes `[0, 0, 3, 190, 135, 9, 1]` instead of the incorrect `[4, 135, 3]`).

### Debugger Toolbar

15. **"Debugger" title removed.** The h1 text is removed from the toolbar.

16. **Tertiary control buttons (xs size, no flash).** Execution control buttons (Load, Reset, Step, Next/Block, Run/Pause) use the shared-ui `Button` component with `variant="tertiary"`, `shadow-none`, and xs sizing (`text-xs px-2 py-1 h-auto`) for a compact toolbar. The `canStep` flag excludes `isStepInProgress` to avoid a disabled-flash on each step; the callbacks still guard against double-stepping internally.

17. **Shared-ui tooltips.** All toolbar buttons use Radix-based `Tooltip`/`TooltipTrigger`/`TooltipContent` from `@fluffylabs/shared-ui/ui/tooltip` instead of plain `title` attributes.

18. **PVM tabs right-aligned with inactive PVMs.** The PVM tab bar is pushed to the right via `ml-auto`. All known PVMs from `AVAILABLE_PVMS` are rendered: active ones as clickable tab buttons, inactive ones as grayed-out spans (`text-muted-foreground/40`). Extra PVMs from snapshots (not in the known list) also render for backward compatibility.

19. **Lowercase PVM labels.** PVM display names are lowercase ("typeberry", "ananas").

20. **Settings cog button.** A gear icon button appears after the PVM tabs, vertically aligned with PVM names. It uses `variant="ghost"` with `border-0 h-auto p-1 text-muted-foreground` (no outline/border, muted color). Clicking it toggles the settings drawer open/closed. When settings are open, the cog is visually highlighted (`bg-accent`).

21. **Toolbar padding.** Toolbar horizontal padding reduced from `1rem` to `0.5rem` to match panel header padding.

### Debugger — Next/Step Button Logic

22. **Next button respects settings.** The Next button label and behavior depend on the stepping mode setting:
    - Instruction mode → label "Step", tooltip "Execute next instruction"
    - Block mode → label "Block", tooltip "Execute next block"
    - N-instructions mode → label "Next(N)", tooltip "Execute N instructions"

23. **Step button is single-instruction only.** The Step button always executes exactly one instruction regardless of settings. Its tooltip always reads "Step 1 instruction". It is hidden when stepping mode is "instruction" (since Next already does the same thing).

24. **Keyboard shortcuts.** All shortcuts use Ctrl+Shift modifier:
    - `Ctrl+Shift+N` → Next (settings-dependent)
    - `Ctrl+Shift+S` → Step (always single instruction)
    - `Ctrl+Shift+P` → Run/Pause toggle
    - `Ctrl+Shift+R` → Reset
    Old F5/F10 shortcuts are removed.

### Debugger — Instructions Panel

25. **Uppercase mnemonics.** Instruction mnemonics display in uppercase in both the instruction list and the binary popover.

26. **ASM/RAW toggle uppercase.** The toggle reads "ASM | RAW" (not "ASM | Raw").

27. **Brand-colored current instruction highlight.** The active PC row uses the reference debugger's teal palette: light mode `#E4FFFD` bg / `#17AFA3` text, dark mode `#00413B` bg / `#00FFEB` text.

28. **Bold mnemonic on active row.** The current instruction's mnemonic is `font-bold`; other rows use `font-medium`.

29. **Popover text color.** Popover value text uses `text-foreground`; labels stay `text-muted-foreground`.

### Debugger — Registers and Memory

30. **Consistent panel header height.** All three panel headers (Instructions, Registers, Memory) use `h-7` with `flex items-center` for consistent height.

31. **Status/PC/Gas in single row.** The status badge, PC field, and Gas field in the registers panel are displayed in a single horizontal row.

32. **Faded zero registers.** Register rows with value `0n` get `opacity-40` (matching how zero bytes are faded in the memory hex dump).

33. **Brand-colored change indicators.** All change indicators use the brand teal color (`var(--color-brand)`) instead of yellow:
    - Register delta dots, PC/Gas delta dots, inline edit changed borders
    - Memory hex dump changed byte highlighting
    - Register flash animation
    The indicator icon is changed from `Δ` (triangle/warning-like) to `●` (small dot).

### Fonts and Branding

34. **Poppins and Inconsolata fonts.** Google Fonts imports for Poppins (UI text) and Inconsolata (monospace) are added. CSS variables `--font-sans`, `--font-mono`, `--default-font-family`, and `--default-mono-font-family` are overridden in a `:root` block to ensure they take precedence over shared-ui defaults.

35. **Tool name logo.** The `tool-name.svg` from the reference debugger is copied to `apps/web/public/` and passed to the shared-ui Header via `toolNameSrc="/tool-name.svg"`.

## Acceptance Criteria

- `npm run build` succeeds with no errors.
- **All E2E tests pass** (`npm run test:e2e` — 228 passed, 7 skipped due to pre-existing multi-PVM timing issues).
- **All unit tests pass** (`npm test` passes across all test files).
- Load screen shows two equal columns with left-aligned headers.
- Example cards are visually light with color-coded format badges.
- JSON test vectors load correctly and display recognized instructions (e.g., ADD_32 at opcode 190).
- Non-SPI examples go directly to the debugger without showing the config step.
- Debugger toolbar uses tertiary buttons with Radix tooltips showing keyboard shortcuts.
- Ctrl+Shift+N/S/P/R shortcuts work correctly.
- Next button label changes based on stepping mode setting.
- Step button is hidden in instruction mode and always steps one instruction in other modes.
- Instruction mnemonics are uppercase with brand-colored current row highlight.
- Register/memory change indicators use brand teal color with dot icon.
- Zero-value registers are visually faded.
- Poppins font is used for UI text; Inconsolata for monospace elements.
- FluffyLabs tool name logo appears in the header.

## E2E Test Updates

The following E2E test files were updated to match sprint-38 behavior changes:

- **Config step bypass**: Non-SPI programs (generic PVM, JSON, trace) now skip the config step and go directly to the debugger. ~30 test files updated to remove `config-step` wait/click sequences. SPI examples (add-jam, etc.) still go through config step.
- **Collapsed categories**: Only "Generic", "AssemblyScript", and "Traces" categories start expanded. Tests that reference examples in collapsed categories (WAT, JSON Test Vectors, Large) now expand the category first.
- **Toolbar button changes**: Next button shows "Step" in instruction mode. Step button is hidden in instruction mode. Tests updated to reflect new toolbar order and button text.
- **Keyboard shortcuts**: F5/F10 replaced with Ctrl+Shift+P/N. All shortcut tests updated.
- **Highlight class**: Instruction row current-PC highlight changed from `bg-primary` to `instruction-row-current` with brand-colored inline styles.
- **PVM tabs**: Inactive PVMs now shown as grayed-out spans (always visible). Tests check `role="tab"` instead of visibility to distinguish active from inactive.
- **URL auto-advance**: URL fetch now auto-advances for non-SPI programs. Tests for URL source interaction updated accordingly.
- **Silent restore**: Corrupted persistence falls back silently (no dialog). Test updated.

## Verify

```bash
npm run build
npm run test:e2e
```
