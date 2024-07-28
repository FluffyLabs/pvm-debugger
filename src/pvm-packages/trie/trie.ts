import { Bytes, type BytesBlob } from "@typeberry/bytes";
import { check } from "@typeberry/utils";
import { BranchNode, HASH_BYTES, LeafNode, NodeType, type StateKey, TRUNCATED_KEY_BITS, type TrieHash, type TrieNode, type TruncatedStateKey } from "./nodes";
import { type NodesDb, type TrieHasher, WriteableNodesDb } from "./nodesDb";

export class InMemoryTrie {
  private readonly flat: Map<string, BytesBlob> = new Map();
  private readonly nodes: WriteableNodesDb;
  private root: TrieNode | null = null;

  static empty(hasher: TrieHasher): InMemoryTrie {
    return new InMemoryTrie(new WriteableNodesDb(hasher));
  }

  constructor(nodes: WriteableNodesDb) {
    this.nodes = nodes;
  }

  set(key: StateKey, value: BytesBlob, maybeValueHash?: TrieHash) {
    this.flat.set(key.toString(), value);
    const valueHash = maybeValueHash ?? this.nodes.hasher.hashConcat(value.buffer);
    const leafNode = LeafNode.fromValue(key, value, valueHash);
    this.root = trieInsert(this.root, this.nodes, leafNode);
  }

  getRoot(): TrieHash {
    if (this.root === null) {
      return Bytes.zero(HASH_BYTES) as TrieHash;
    }

    return this.nodes.hashNode(this.root);
  }

  toString(): string {
    return trieStringify(this.root, this.nodes);
  }
}

/**
 * Insert a new leaf node into a trie starting at the given `root` node.
 *
 * The function will find a place where the leaf node should be present and update
 * the entire branch up to the trie root.
 *
 * New root node is returned.
 */
function trieInsert(root: TrieNode | null, nodes: WriteableNodesDb, leaf: LeafNode): TrieNode {
  if (root === null) {
    nodes.insert(leaf.node);
    return leaf.node;
  }

  // first we look up a good place to insert the node to the tree, based on it's key.
  const traversedPath = findNodeToReplace(root, nodes, leaf.getKey());

  // now we analyze two possible situations:
  // 1. We found a leaf node - that means we need to create a branch node (and possible
  //    extra branch nodes for a common prefix) with these two leaves. Finally we update the
  //    traversed path from root.
  // 2. We found an empty spot (i.e. branch node with zero hash) - we can just update already
  //    traversed path from root.
  const nodeToInsert: [TrieNode, TrieHash] = traversedPath.leafToReplace ? createSubtreeForBothLeaves(traversedPath, nodes, traversedPath.leafToReplace, leaf) : [leaf.node, nodes.insert(leaf.node)];

  // finally update the traversed path from `root` to the insertion location.
  let historicalBranch = traversedPath.branchingHistory.pop();
  let [lastNode, lastHash] = nodeToInsert;

  while (historicalBranch !== undefined) {
    const [branchNode, branchHash, bit] = historicalBranch;
    nodes.remove(branchHash);

    // TODO [ToDr] [opti] Avoid allocation here by re-using the old branch node?
    const newBranchNode = bit ? BranchNode.fromSubNodes(branchNode.getLeft(), lastHash) : BranchNode.fromSubNodes(lastHash, branchNode.getRight());
    lastHash = nodes.insert(newBranchNode.node);
    lastNode = newBranchNode.node;

    historicalBranch = traversedPath.branchingHistory.pop();
  }

  return lastNode;
}

/**
 * Path of branch nodes traversed while looking for the best place to put a new leaf.
 */
class TraversedPath {
  /** history of branch nodes (with their hashes) and the branching bit. */
  branchingHistory: [BranchNode, TrieHash, boolean][] = [];
  /** last bitIndex */
  bitIndex = 0;
  /** in case of a leaf node at destination, details of that leaf node */
  leafToReplace?: [LeafNode, TrieHash];
}

/**
 * Traverse the trie starting from root and return the path leading to the destination
 * where leaf with `key` should be placed.
 */
function findNodeToReplace(root: TrieNode, nodes: NodesDb, key: TruncatedStateKey): TraversedPath {
  const traversedPath = new TraversedPath();
  let currentNode = root;
  let currentNodeHash = nodes.hashNode(root);

  while (true) {
    const kind = currentNode.getNodeType();
    if (kind !== NodeType.Branch) {
      // we found a leaf that needs to be merged with the one being inserted.
      const leaf = currentNode.asLeafNode();
      traversedPath.leafToReplace = [leaf, currentNodeHash];
      return traversedPath;
    }

    // going down the trie
    const branch = currentNode.asBranchNode();
    const currBit = getBit(key, traversedPath.bitIndex);
    const nextHash = currBit ? branch.getRight() : branch.getLeft();
    traversedPath.branchingHistory.push([branch, currentNodeHash, currBit]);

    const nextNode = nodes.get(nextHash);
    if (nextNode === null) {
      if (nextHash.isEqualTo(Bytes.zero(HASH_BYTES))) {
        return traversedPath;
      }

      throw new Error(`Missing trie node '${nextHash}' with key prefix: ${key}[0..${traversedPath.bitIndex}]`);
    }

    currentNode = nextNode;
    currentNodeHash = nextHash;
    traversedPath.bitIndex += 1;
  }
}

/**
 * Handle a situation where we replace an existing leaf node at destination.
 *
 * In such case we need to create a subtree that will hold both of the leaves.
 *
 * The function returns a root of the subtree.
 */
function createSubtreeForBothLeaves(traversedPath: TraversedPath, nodes: WriteableNodesDb, leafToReplace: [LeafNode, TrieHash], leaf: LeafNode): [TrieNode, TrieHash] {
  const key = leaf.getKey();
  let [existingLeaf, existingLeafHash] = leafToReplace;
  const existingLeafKey = existingLeaf.getKey();

  // TODO [ToDr] [opti] instead of inserting/removing a bunch of nodes, it might be
  // better to return a changeset that can be batch-applied to the DB.
  const leafNodeHash = nodes.insert(leaf.node);
  if (existingLeafKey.isEqualTo(key)) {
    // just replacing an existing value
    nodes.remove(existingLeafHash);
    return [leaf.node, leafNodeHash];
  }

  // In case both keys share a prefix we need to add a bunch of branch
  // nodes up until the keys start diverging.
  // Here we identify the common bit prefix that will later be used
  // in reverse to construct required branch nodes.
  const commonBits: boolean[] = [];
  let divergingBit = getBit(key, traversedPath.bitIndex);
  while (traversedPath.bitIndex < TRUNCATED_KEY_BITS) {
    divergingBit = getBit(key, traversedPath.bitIndex);
    const bit2 = getBit(existingLeafKey, traversedPath.bitIndex);
    if (divergingBit === bit2) {
      commonBits.push(bit2);
      traversedPath.bitIndex += 1;
    } else {
      break;
    }
  }

  // Now construct the common branches, and insert zero hash in place of other sub-trees.
  const zero = Bytes.zero(HASH_BYTES) as TrieHash;

  // In case we move the leaf from left to right it's hash needs to be re-calculated (missing bit).
  // TODO [ToDr] [opti] might be better to store the original bit value instead of recalculating.
  const leafWasInLeftBranch = (() => {
    const l = traversedPath.branchingHistory.length;
    if (l > 0) {
      return traversedPath.branchingHistory[l - 1][2] === false;
    }
    return false;
  })();
  if (leafWasInLeftBranch && !divergingBit) {
    existingLeafHash = nodes.hashNode(existingLeaf.node);
  }

  let lastBranch = divergingBit ? BranchNode.fromSubNodes(existingLeafHash, leafNodeHash) : BranchNode.fromSubNodes(leafNodeHash, existingLeafHash);
  let lastHash = nodes.insert(lastBranch.node);
  let bit = commonBits.pop();

  // go up and create branch nodes for the common prefix
  while (bit !== undefined) {
    lastBranch = bit ? BranchNode.fromSubNodes(zero, lastHash) : BranchNode.fromSubNodes(lastHash, zero);
    lastHash = nodes.insert(lastBranch.node);
    bit = commonBits.pop();
  }

  // let's return the top branch to join with the history
  return [lastBranch.node, lastHash];
}

/**
 * Return a single bit from `key` located at `bitIndex`.
 */
function getBit(key: TruncatedStateKey, bitIndex: number): boolean {
  check(bitIndex < TRUNCATED_KEY_BITS);
  const byte = bitIndex >> 3;
  const bit = bitIndex - (byte << 3);
  const mask = 1 << bit;

  const val = key.raw[byte] & mask;
  return val > 0;
}

function trieStringify(root: TrieNode | null, nodes: NodesDb): string {
  if (root === null) {
    return "<empty tree>";
  }

  const kind = root.getNodeType();
  if (kind === NodeType.Branch) {
    const branch = root.asBranchNode();
    const leftHash = branch.getLeft();
    const rightHash = branch.getRight();
    const indent = (v: string) =>
      v
        .split("\n")
        .map((v) => `\t\t${v}`)
        .join("\n");
    const left = trieStringify(nodes.get(leftHash), nodes);
    const right = trieStringify(nodes.get(rightHash), nodes);

    return `<branch>
	-- ${leftHash}: ${indent(left)}
	-- ${rightHash}: ${indent(right)}
`;
  }

  const leaf = root.asLeafNode();
  const valueLength = leaf.getValueLength();
  const value = valueLength > 0 ? `'${leaf.getValue()}'(len:${valueLength})` : `'<hash>${leaf.getValueHash()}'`;
  return `\nLeaf('${leaf.getKey().toString()}',${value})`;
}
