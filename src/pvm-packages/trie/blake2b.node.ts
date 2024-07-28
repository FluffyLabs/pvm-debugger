import { Bytes } from "@typeberry/bytes";
import blake2b from "blake2b";
import { HASH_BYTES, type TrieHash } from "./nodes";
import type { TrieHasher } from "./nodesDb";

export const blake2bTrieHasher: TrieHasher = {
  hashConcat(n: Uint8Array, rest?: Uint8Array[]): TrieHash {
    const hasher = blake2b(HASH_BYTES);
    hasher?.update(n);
    for (const v of rest ?? []) {
      hasher?.update(v);
    }
    const out = Bytes.zero(HASH_BYTES);
    hasher?.digest(out.raw);
    return out as TrieHash;
  },
};
