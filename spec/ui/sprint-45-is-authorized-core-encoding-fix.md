# Sprint 45 — Fix is_authorized Core Index Encoding

Status: Implemented

## Goal

Fix the `is_authorized` SPI entrypoint encoding to use a fixed 2-byte little-endian u16 for the `core` parameter instead of the current variable-length encoding (`encodeVarU32`).

## Bug

The GP spec defines the `is_authorized` entrypoint parameter as the **core index**, which is a fixed-width 2-byte LE value (u16) — the same encoding used for core indices elsewhere in the protocol (e.g. `coreCount` in ProtocolConstants). The current implementation incorrectly uses `encodeVarU32` / `decodeVarU32`, which produces a variable-length byte sequence.

For small values (0–127) this produces a 1-byte encoding instead of the required 2 bytes. For values 128–16383 it produces 2 bytes but in VarU32 format (with continuation bits), not LE format. Both are incorrect per spec.

**Example:** `core = 5` currently encodes as `[0x05]` (1 byte). It should encode as `[0x05, 0x00]` (2 bytes, u16 LE).

## Files to Change

### `packages/content/src/spi-entrypoint.ts`

1. **Import `encodeU16LE` and `decodeU16LE`** from `@pvmdbg/types` (already exported).
2. **`encodeSpiEntrypoint`** — In the `"is_authorized"` case (line 74–75), replace:
   ```ts
   return concat(encodeVarU32(params.params.core));
   ```
   with:
   ```ts
   return concat(encodeU16LE(params.params.core));
   ```
3. **`decodeSpiEntrypoint`** — In the `"is_authorized"` case (line 126–128), replace `readVarU32()` with a fixed 2-byte LE read using `decodeU16LE`:
   ```ts
   case "is_authorized": {
     const { value: core } = decodeU16LE(bytes, offset);
     offset += 2;
     return { entrypoint: "is_authorized", pc: 0, params: { core } };
   }
   ```

### `packages/content/src/index.test.ts`

Update all `is_authorized` tests to expect fixed 2-byte LE encoding:

1. **"encodes is_authorized { core: 5 }"** (line 261–269) — Change expected output from `[0x05]` to `[0x05, 0x00]`.
2. **"decodes is_authorized bytes back to params"** (line 353–361) — Change input bytes from `[0x05]` to `[0x05, 0x00]`.
3. **"roundtrips is_authorized params"** (line 435–444) — Should continue to pass after both encode/decode are updated. Optionally add a case with `core: 300` (encodes as `[0x2c, 0x01]`) to verify multi-byte LE values work correctly.

## Edge Cases

1. **Core index 0** — Encodes as `[0x00, 0x00]`, two zero bytes. Must not be confused with "empty" input.
2. **Core index > 255** — e.g. `core = 300` → `[0x2c, 0x01]`. Previously this would have used VarU32's continuation-bit format; now it uses standard LE.
3. **Max u16 (65535)** — `[0xff, 0xff]`. The `core` field should not exceed u16 range; no validation change needed since the type is already `number` and `encodeU16LE` will handle truncation.

## Scope

This is a codec-only fix. No UI changes are needed — the `SpiEntrypointConfig` component uses a numeric input that feeds into `encodeSpiEntrypoint`, so the UI continues to work transparently with the corrected encoding.
