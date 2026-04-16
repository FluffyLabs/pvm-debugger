# Sprint 49 — Register Symbol Rename: ω → φ

Status: Implemented

## Goal

Rename the PVM register symbol from ω (omega, U+03C9) to φ (phi, U+03C6) throughout the codebase, aligning with the latest Gray Paper revision which changed the register notation.

## Background

The Gray Paper recently changed the symbol used for PVM registers from ω (omega) to φ (phi). All user-facing labels, code comments, and test assertions need to be updated to match the new convention.

## Prior Sprint Dependencies

- Sprint 03: flat instruction list (introduced ω notation in disassembled args)
- Sprint 04: registers and status (introduced ω labels in register panel)
- Sprint 21: ecalli trace tab (introduced ω in trace display)
- Sprint 25: divergence detection (introduced ω in divergence detail strings)
- Sprint 28: ASM/Raw toggle (tests assert ω in ASM mode)
- Sprint 42: host call UX redesign (introduced ω₇ in output preview, NONE description, and handler comments)
- Sprint 43: fetch handler and JAM codec (introduced ω subscript notation in fetch kind descriptions)

## What Changed

### 1. Register Name Function (`useDisassembly.ts`)

`regName()` returns `φ${index}` instead of `ω${index}`. This is the single source of truth for register notation in disassembled instruction arguments (ASM mode). The JSDoc on `rawArgs` updated from "no omega notation" to "no phi notation".

### 2. Register Panel Labels (`RegisterRow.tsx`)

Each register row label changed from `ω{index}:` to `φ{index}:`.

### 3. Trace Display (`trace-display.ts`)

- Host call header: `ecalli ${index}, φ7 = ${gas}` (was ω7)
- Register writes: `φ${reg} ← ${val}` (was ω)

### 4. Host Call Tab (`HostCallTab.tsx`)

- Output preview label: `φ₇ ←` (was ω₇)
- NONE mode description: `φ₇ = 2⁶⁴−1` (was ω₇)
- NONE toggle comment: `φ₇ = 2^64-1` (was ω₇)

### 5. Divergence Check (`useDivergenceCheck.ts`)

Unicode escape in detail line changed from `\u03C9` (ω) to `\u03C6` (φ) for register divergence labels like `φ3: typeberry=0xa, polkavm=0x14`.

### 6. Host Call Handlers

- **GasHostCall.tsx**: Comment and UI text updated to reference φ₇.
- **LogHostCall.tsx**: JSDoc register list updated (φ7=level, φ8=target_ptr, etc.).
- **StorageHostCall.tsx**: Comment register list updated (φ7=serviceId, φ8=keyPtr, etc.) and φ₇ return value comment.
- **host-call-registers.ts**: JSDoc updated to reference φ₇.

### 7. Supporting Libraries

- **fetch-codec.ts**: Six fetch kind descriptions updated (φ₁₁, φ₁₂ subscript notation).
- **fetch-utils.ts**: JSDoc for `computeFetchEffects` updated (φ₇, φ₈, φ₉).
- **storage-utils.ts**: JSDoc for `deriveKeyHex` updated (φ8/φ9 for read, φ7/φ8 for write).
- **useDebuggerActions.ts**: Comment updated (φ9/φ10 for write value).

### 8. Orchestrator (`orchestrator.ts`)

Log host call register comment updated (φ8=target_ptr, φ9=target_len, etc.).

## Files Changed

| File | Changes |
|------|---------|
| `apps/web/src/hooks/useDisassembly.ts` | `regName()` returns `φ`, JSDoc updated |
| `apps/web/src/components/debugger/RegisterRow.tsx` | Label `φ{index}:` |
| `apps/web/src/components/drawer/trace-display.ts` | Header and register write lines use φ |
| `apps/web/src/components/drawer/HostCallTab.tsx` | Output preview, NONE description and comment use φ₇ |
| `apps/web/src/hooks/useDivergenceCheck.ts` | Unicode escape `\u03C6` |
| `apps/web/src/components/drawer/hostcalls/GasHostCall.tsx` | Comment and UI text use φ₇ |
| `apps/web/src/components/drawer/hostcalls/LogHostCall.tsx` | JSDoc register list uses φ |
| `apps/web/src/components/drawer/hostcalls/StorageHostCall.tsx` | Comments use φ |
| `apps/web/src/components/drawer/hostcalls/host-call-registers.ts` | JSDoc uses φ₇ |
| `apps/web/src/lib/fetch-codec.ts` | Fetch kind descriptions use φ subscripts |
| `apps/web/src/lib/fetch-utils.ts` | JSDoc uses φ₇/φ₈/φ₉ |
| `apps/web/src/lib/storage-utils.ts` | JSDoc uses φ8/φ9 and φ7/φ8 |
| `apps/web/src/hooks/useDebuggerActions.ts` | Comment uses φ9/φ10 |
| `packages/orchestrator/src/orchestrator.ts` | Comment uses φ8–φ11 |
| `apps/web/src/hooks/useDisassembly.test.tsx` | Assertions match φ notation |
| `apps/web/src/components/drawer/trace-display.test.ts` | Expected strings use φ |
| `apps/web/src/components/debugger/RegistersPanel.test.tsx` | Comments use φ |
| `apps/web/src/hooks/useDivergenceCheck.test.tsx` | Assertions and variables use φ |
| `apps/web/src/lib/storage-utils.test.ts` | Test names use φ |
| `apps/web/e2e/sprint-03-instructions.spec.ts` | E2E assertions match φ |
| `apps/web/e2e/sprint-04-registers.spec.ts` | E2E label assertions match φ |
| `apps/web/e2e/sprint-28-asm-raw-popover.spec.ts` | E2E ASM mode assertions match φ |
| `apps/web/e2e/integration-smoke.spec.ts` | Comment uses φ7 |

## Acceptance Criteria

- All user-facing register labels display φ (phi) instead of ω (omega).
- Disassembled instruction arguments in ASM mode use `φN` notation.
- Trace display uses `φ7` in host call headers and `φN` in register writes.
- Divergence detail strings use `φN:` prefix.
- Host call output preview shows `φ₇ ←`.
- No remaining references to ω in `.ts` or `.tsx` source or test files.
- All 683 unit tests pass.
- The spec/ directory documentation files are not updated (they are historical records of prior sprints).

## Verification

```bash
npm run build
npm test
# Confirm no ω remains in source/test files:
grep -r 'ω' --include='*.ts' --include='*.tsx' apps/ packages/
```
