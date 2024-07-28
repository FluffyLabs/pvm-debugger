import type { TrieHash, TrieNode } from "./nodes";

/**
 * Hasher used for the trie nodes.
 */
export type TrieHasher = {
  hashConcat(n: Uint8Array, r?: Uint8Array[]): TrieHash;
};

/**
 * An abstraction over read-only nodes storage.
 */
export class NodesDb {
  readonly hasher: TrieHasher;

  // TODO [ToDr] [crit] We can't use `TrieHash` directly in the map,
  // because of the way it's being compared. Hence having `string` here.
  // This has to be benchmarked and re-written to a custom map most likely.
  protected readonly nodes: Map<string, TrieNode>;

  constructor(hasher: TrieHasher) {
    this.hasher = hasher;
    this.nodes = new Map();
  }

  get(hash: TrieHash): TrieNode | null {
    const key = NodesDb.hashCompatStr(hash);
    return this.nodes.get(key) ?? null;
  }

  hashNode(n: TrieNode): TrieHash {
    return this.hasher.hashConcat(n.data);
  }

  /**
   * Returns a string identifier of that hash to be used as a key in DB.
   *
   * Before calling `toString` the first bit is set to 0, to maintain compatibility
   * with branch nodes, which have the left subtree stripped out of the first bit (since it's
   * a branch node identifier).
   *
   */
  protected static hashCompatStr(hash: TrieHash): string {
    const prevValue = hash.raw[0];
    hash.raw[0] &= 0b1111_1110;
    const hashString = hash.toString();
    // restore the original byte, so that we have correct value in case it
    // ends up in the right part of the subtree.
    hash.raw[0] = prevValue;
    return hashString;
  }
}

/**
 * A version of `NodesDb` augmented with mutating methods.
 */
export class WriteableNodesDb extends NodesDb {
  remove(hash: TrieHash) {
    const key = NodesDb.hashCompatStr(hash);
    this.nodes.delete(key);
  }

  insert(node: TrieNode, hash?: TrieHash): TrieHash {
    const h = hash ?? this.hashNode(node);
    const key = NodesDb.hashCompatStr(h);
    this.nodes.set(key, node);
    return h;
  }
}
