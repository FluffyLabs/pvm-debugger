import { Bytes, BytesBlob } from "@typeberry/bytes";
import { type Opaque, check } from "@typeberry/utils";

export type Hash = Bytes<32>;
export type StateKey = Opaque<Bytes<32>, "stateKey">;
export type TruncatedStateKey = Opaque<Bytes<31>, "stateKey">;
export type TrieHash = Opaque<Hash, "trie">;
export type ValueHash = Opaque<Hash, "trieValue">;

/** Regular hash length */
export const HASH_BYTES = 32;
/** Value nodes have the key truncated to 31 bytes. */
const TRUNCATED_KEY_BYTES = 31;
export const TRUNCATED_KEY_BITS = TRUNCATED_KEY_BYTES * 8;

export function parseStateKey(v: string): StateKey {
  return Bytes.parseBytesNoPrefix(v, HASH_BYTES) as StateKey;
}

/**
 * The kind of the trie node.
 */
export enum NodeType {
  /** Branch node (left & right subtree hashes) */
  Branch = 0,
  /** Leaf node (value hash) */
  Leaf = 1,
  /** Embedded leaf node (value len + value) */
  EmbedLeaf = 2,
}

/**
 * A representation of an unidentified raw trie node.
 *
 * The node can be either (determined by the first bit):
 *	- a branch node
 *	- a leaf node
 *
 * In case of a branch node the contained data is:
 *	- left sub-node hash (32 bytes - 1 bit)
 *	- right sub-node hash (32 bytes)
 *
 * There are two kinds of leaf nodes (determined by the second bit)
 *	- Embedded value leaf nodes
 *	- Value hash leaf nodes
 *
 * Embedded value leaf nodes contain:
 *  - a length of the embedded value (last 6 bits of the first byte)
 *  - the value itself (padded with zeroes)
 *
 * Regular value leaf nodes contain:
 *  - a hash of the value
 */
export class TrieNode {
  /** Exactly 512 bits / 64 bytes */
  readonly data: Uint8Array = new Uint8Array(64);

  /** Returns the type of the node */
  getNodeType(): NodeType {
    if ((this.data[0] & 0b1) === 0b0) {
      return NodeType.Branch;
    }

    if ((this.data[0] & 0b11) === 0b11) {
      return NodeType.EmbedLeaf;
    }

    return NodeType.Leaf;
  }

  /** View this node as a branch node */
  asBranchNode(): BranchNode {
    check(this.getNodeType() === NodeType.Branch);
    return new BranchNode(this);
  }

  /** View this node as a leaf node */
  asLeafNode(): LeafNode {
    check(this.getNodeType() !== NodeType.Branch);
    return new LeafNode(this);
  }
}

/**
 * A branch node view of the underlying raw trie node.
 *
 * +---------------------------------------------------------------+
 * |                        512-bit trie node                      |
 * +---+----------------------------+------------------------------+
 * | B | Left Sub-node Hash         | Right Sub-node Hash          |
 * |   | (255 bits)                 | (256 bits)                   |
 * |---|----------------------------|------------------------------|
 * | 0 | 101010101010101010101...   | 11001100110011001100...      |
 * +---------------------------------------------------------------+
 */
export class BranchNode {
  // Underlying raw node.
  constructor(readonly node: TrieNode) {}

  static fromSubNodes(left: TrieHash, right: TrieHash) {
    const node = new TrieNode();
    node.data.set(left.raw, 0);
    node.data.set(right.raw, HASH_BYTES);

    // set the first bit to 0 (branch node)
    node.data[0] &= 0b1111_1110;

    return new BranchNode(node);
  }

  /** Get the hash of the left sub-trie. */
  getLeft(): TrieHash {
    return new Bytes(this.node.data.subarray(0, HASH_BYTES), HASH_BYTES) as TrieHash;
  }

  /** Get the hash of the right sub-trie. */
  getRight(): TrieHash {
    return new Bytes(this.node.data.subarray(HASH_BYTES), HASH_BYTES) as TrieHash;
  }
}

/**
 * A leaf node view of the underlying raw trie node.
 *
 * +---------------------------------------------------------------+
 * |                    Embedded value leaf                        |
 * +----+----------+-------------------+---------------------------+
 * | BL | V_len    | Key               | 0-padded value (V_len)    |
 * | 2b | (6 bits) | (31 bytes)        | (32 bytes)                |
 * |----|----------|-------------------|---------------------------|
 * | 10 |  000111  | deadbeef...       | 0123456789abcdef...       |
 * +---------------------------------------------------------------+
 * |                    Value hash leaf                            |
 * +----+----------+-------------------+---------------------------+
 * | BL |   zero   | Key               | Value hash                |
 * |----|----------|-------------------|---------------------------|
 * | 11 |  000000  | deadbeef...       | deadbeef...               |
 * +---------------------------------------------------------------+
 */
export class LeafNode {
  // Underlying raw node.
  readonly node: TrieNode;

  constructor(node: TrieNode) {
    this.node = node;
  }

  static fromValue(key: StateKey, value: BytesBlob, valueHash: TrieHash): LeafNode {
    const node = new TrieNode();
    // The value will fit in the leaf itself.
    if (value.length <= HASH_BYTES) {
      node.data[0] = value.length << 2;
      node.data[0] |= 0b01;
      // truncate & copy the key
      node.data.set(key.raw.subarray(0, TRUNCATED_KEY_BYTES), 1);
      // copy the value
      node.data.set(value.buffer, TRUNCATED_KEY_BYTES + 1);
    } else {
      node.data[0] = 0b11;
      // truncate & copy the key
      node.data.set(key.raw.subarray(0, TRUNCATED_KEY_BYTES), 1);
      // copy the value hash
      node.data.set(valueHash.raw, TRUNCATED_KEY_BYTES + 1);
    }

    return new LeafNode(node);
  }

  /** Get the key (truncated to 31 bytes). */
  getKey(): TruncatedStateKey {
    return new Bytes(this.node.data.subarray(1, TRUNCATED_KEY_BYTES + 1), TRUNCATED_KEY_BYTES) as TruncatedStateKey;
  }

  /**
   * Get the byte length of embedded value.
   *
   * @remark
   * Note in case this node only contains hash this is going to be 0.
   */
  getValueLength(): number {
    const firstByte = this.node.data[0] >> 2;
    return firstByte;
  }

  /**
   * Returns the embedded value.
   *
   * @remark
   * Note that this is going to be empty for a regular leaf node (i.e. containing a hash).
   */
  getValue(): BytesBlob {
    const len = this.getValueLength();
    return new BytesBlob(this.node.data.subarray(HASH_BYTES, HASH_BYTES + len));
  }

  /**
   * Returns contained value hash.
   *
   * @remark
   * Note that for embedded value this is going to be full 0-padded 32 bytes.
   */
  getValueHash(): ValueHash {
    return new Bytes(this.node.data.subarray(HASH_BYTES), HASH_BYTES) as ValueHash;
  }
}
