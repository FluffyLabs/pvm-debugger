import { encodeVarU32 } from "@pvmdbg/types";

/**
 * Encode raw PVM instruction bytes into a proper PVM program blob.
 *
 * PVM blob format:
 * 1. jumpTableLength (varU32) - number of jump table entries
 * 2. jumpTableItemLength (u8) - bytes per entry
 * 3. codeLength (varU32) - length of code section
 * 4. jumpTable data
 * 5. code bytes
 * 6. mask (bitVecFixLen(codeLength)) - instruction boundary mask
 *
 * @param code - Raw instruction bytes
 * @param instructionStarts - Array of byte offsets that are instruction starts.
 *   If omitted, only byte 0 is marked as an instruction start.
 */
export function encodePvmBlob(
  code: Uint8Array,
  instructionStarts?: number[],
): Uint8Array {
  const codeLength = code.length;
  const maskByteLength = Math.ceil(codeLength / 8);

  // Build mask bitvec
  const mask = new Uint8Array(maskByteLength);
  const starts = instructionStarts ?? [0];
  for (const start of starts) {
    if (start < codeLength) {
      mask[Math.floor(start / 8)] |= 1 << (start % 8);
    }
  }

  // Ensure unused high bits in the last byte are zero (already guaranteed by Uint8Array init)

  const jtLenBytes = encodeVarU32(0); // no jump table
  const jtItemLenByte = new Uint8Array([0]); // no jump table items
  const codeLenBytes = encodeVarU32(codeLength);

  const totalLength = jtLenBytes.length + jtItemLenByte.length + codeLenBytes.length + codeLength + maskByteLength;
  const blob = new Uint8Array(totalLength);
  let offset = 0;

  blob.set(jtLenBytes, offset);
  offset += jtLenBytes.length;
  blob.set(jtItemLenByte, offset);
  offset += jtItemLenByte.length;
  blob.set(codeLenBytes, offset);
  offset += codeLenBytes.length;
  blob.set(code, offset);
  offset += codeLength;
  blob.set(mask, offset);

  return blob;
}
