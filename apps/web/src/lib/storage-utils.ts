import type { HostCallInfo } from "@pvmdbg/types";
import { toHex } from "@pvmdbg/types";

/**
 * Derive the storage key hex string from a storage host call's state.
 *
 * For read (index 3): key pointer at φ8, length at φ9.
 * For write (index 4): key pointer at φ7, length at φ8.
 *
 * The key bytes are found by matching a trace memory write at the key pointer address.
 * Returns null if no key can be derived (no proposal or no matching memory write).
 */
export function deriveKeyHex(info: HostCallInfo): string | null {
  const proposal = info.resumeProposal;
  if (!proposal) return null;

  let keyPtr: number;
  let keyLen: number;

  if (info.hostCallIndex === 3) {
    keyPtr = Number(info.currentState.registers[8] ?? 0n);
    keyLen = Number(info.currentState.registers[9] ?? 0n);
  } else if (info.hostCallIndex === 4) {
    keyPtr = Number(info.currentState.registers[7] ?? 0n);
    keyLen = Number(info.currentState.registers[8] ?? 0n);
  } else {
    return null;
  }

  for (const mw of proposal.memoryWrites) {
    if (mw.address === keyPtr && mw.data.length >= keyLen) {
      return toHex(mw.data.slice(0, keyLen));
    }
  }

  return null;
}
