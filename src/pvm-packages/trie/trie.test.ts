import assert from "node:assert";
import { test } from "node:test";
import { Bytes, BytesBlob } from "@typeberry/bytes";
import { blake2bTrieHasher } from "./blake2b.node";
import { LeafNode, parseStateKey } from "./nodes";
import { InMemoryTrie } from "./trie";

test("Trie", async () => {
  await test("Empty trie", () => {
    const trie = InMemoryTrie.empty(blake2bTrieHasher);

    assert.deepStrictEqual(trie.getRoot(), Bytes.parseBytesNoPrefix("0000000000000000000000000000000000000000000000000000000000000000", 32));
  });

  await test("Leaf Node", () => {
    const key = parseStateKey("16c72e0c2e0b78157e3a116d86d90461a199e439325317aea160b30347adb8ec");
    const value = BytesBlob.parseBlob("0x4227b4a465084852cd87d8f23bec0db6fa7766b9685ab5e095ef9cda9e15e49dff");
    const valueHash = blake2bTrieHasher.hashConcat(value.buffer);
    const node = LeafNode.fromValue(key, value, valueHash);

    assert.deepStrictEqual(node.getKey(), Bytes.parseBytes("0x16c72e0c2e0b78157e3a116d86d90461a199e439325317aea160b30347adb8", 31));
    assert.deepStrictEqual(node.getValueLength(), 0);
    assert.deepStrictEqual(node.getValue().buffer, Bytes.zero(0).raw);
    assert.deepStrictEqual(node.getValueHash(), valueHash);
  });

  await test("Empty value", () => {
    const trie = InMemoryTrie.empty(blake2bTrieHasher);

    trie.set(parseStateKey("16c72e0c2e0b78157e3a116d86d90461a199e439325317aea160b30347adb8ec"), BytesBlob.fromBytes([]));

    assert.deepStrictEqual(trie.getRoot(), Bytes.parseBytesNoPrefix("17d7a1c738dfa055bc810110004585ca79be323586764e14179ee20e54376592", 32));
  });

  await test("Should import some keys", () => {
    const trie = InMemoryTrie.empty(blake2bTrieHasher);

    trie.set(parseStateKey("645eece27fdce6fd3852790131a50dc5b2dd655a855421b88700e6eb43279ad9"), BytesBlob.fromBytes([0x72]));

    assert.deepStrictEqual(trie.getRoot(), Bytes.parseBytesNoPrefix("75978696ab7bd70492c2abbecf26fd03eb2c41e0d83daf968f45c20f566b9a9b", 32));
  });

  await test("Non embedded leaf", () => {
    const trie = InMemoryTrie.empty(blake2bTrieHasher);

    trie.set(parseStateKey("3dbc5f775f6156957139100c343bb5ae6589af7398db694ab6c60630a9ed0fcd"), BytesBlob.parseBlob("0x4227b4a465084852cd87d8f23bec0db6fa7766b9685ab5e095ef9cda9e15e49d"));

    assert.deepStrictEqual(trie.getRoot(), Bytes.parseBytesNoPrefix("9ea1799e255f9b5edb960cf6640aa42ec2fac24a199be8155853ddcce9b896c4", 32));
  });

  await test("More complicated trie", () => {
    const trie = InMemoryTrie.empty(blake2bTrieHasher);

    trie.set(parseStateKey("f2a9fcaf8ae0ff770b0908ebdee1daf8457c0ef5e1106c89ad364236333c5fb3"), BytesBlob.parseBlob("0x22c62f84ee5775d1e75ba6519f6dfae571eb1888768f2a203281579656b6a29097f7c7e2cf44e38da9a541d9b4c773db8b71e1d3"));
    trie.set(parseStateKey("f3a9fcaf8ae0ff770b0908ebdee1daf8457c0ef5e1106c89ad364236333c5fb3"), BytesBlob.parseBlob("0x44d0b26211d9d4a44e375207"));

    assert.deepStrictEqual(trie.getRoot(), Bytes.parseBytesNoPrefix("b9c99f66e5784879a178795b63ae178f8a49ee113652a122cd4b3b2a321418c1", 32));
  });

  await test("Move leaf from left to right branch", () => {
    const trie = InMemoryTrie.empty(blake2bTrieHasher);

    // left value
    trie.set(parseStateKey("f2a9fcaf8ae0ff770b0908ebdee1daf8457c0ef5e1106c89ad364236333c5fb3"), BytesBlob.parseBlob("0x23"));

    // right value
    trie.set(parseStateKey("f1a9fcaf8ae0ff770b0908ebdee1daf8457c0ef5e1106c89ad364236333c5fb3"), BytesBlob.parseBlob("0x1234"));

    // now insert another leaf, which causes `0xf2..` to move to the right.
    trie.set(parseStateKey("f0a9fcaf8ae0ff770b0908ebdee1daf8457c0ef5e1106c89ad364236333c5fb3"), BytesBlob.parseBlob("0x1234"));

    assert.deepStrictEqual(trie.getRoot().toString(), "0xdc2fda54f07a9774c4bf553322e66a998807d88f0bea3eca308407b215b5f492");
  });

  await test("Replace leaf value", () => {
    const trie = InMemoryTrie.empty(blake2bTrieHasher);
    const insert = {
      f2a9fcaf8ae0ff770b0908ebdee1daf8457c0ef5e1106c89ad364236333c5fb3: "0x23",
      f1a9fcaf8ae0ff770b0908ebdee1daf8457c0ef5e1106c89ad364236333c5fb3: "0x1234",
      f0a9fcaf8ae0ff770b0908ebdee1daf8457c0ef5e1106c89ad364236333c5fb3: "0x1234",
    };
    for (const [k, v] of Object.entries(insert)) {
      trie.set(parseStateKey(k), BytesBlob.parseBlob(v));
    }
    assert.deepStrictEqual(trie.getRoot().toString(), "0xdc2fda54f07a9774c4bf553322e66a998807d88f0bea3eca308407b215b5f492");

    // now set the same key again
    trie.set(parseStateKey("f2a9fcaf8ae0ff770b0908ebdee1daf8457c0ef5e1106c89ad364236333c5fb3"), BytesBlob.parseBlob("0x1234"));
    assert.deepStrictEqual(trie.getRoot().toString(), "0x40ab9b14f53a2e3299afa802792df4cd02dd27dff71df3e3056d558c88965fc0");
  });

  await test("Test vector 9", () => {
    const vector = {
      input: {
        d7f99b746f23411983df92806725af8e5cb66eba9f200737accae4a1ab7f47b9: "24232437f5b3f2380ba9089bdbc45efaffbe386602cb1ecc2c17f1d0",
        "59ee947b94bcc05634d95efb474742f6cd6531766e44670ec987270a6b5a4211": "72fdb0c99cf47feb85b2dad01ee163139ee6d34a8d893029a200aff76f4be5930b9000a1bbb2dc2b6c79f8f3c19906c94a3472349817af21181c3eef6b",
        a3dc3bed1b0727caf428961bed11c9998ae2476d8a97fad203171b628363d9a2: "8a0dafa9d6ae6177",
        "15207c233b055f921701fc62b41a440d01dfa488016a97cc653a84afb5f94fd5": "157b6c821169dacabcf26690df",
        b05ff8a05bb23c0d7b177d47ce466ee58fd55c6a0351a3040cf3cbf5225aab19: "6a208734106f38b73880684b",
      },
      output: "55634c70b9dca56f2f40b343f750a5c9744798370cbf3f669e29ebe0b8d64ceb",
    };

    runTestVector(vector);
  });

  await test("Test vector 10", () => {
    const vector = {
      input: {
        "5dffe0e2c9f089d30e50b04ee562445cf2c0e7e7d677580ef0ccf2c6fa3522dd": "bb11c256876fe10442213dd78714793394d2016134c28a64eb27376ddc147fc6044df72bdea44d9ec66a3ea1e6d523f7de71db1d05a980e001e9fa",
        df08871e8a54fde4834d83851469e635713615ab1037128df138a6cd223f1242: "b8bded4e1c",
        "7723a8383e43a1713eb920bae44880b2ae9225ea2d38c031cf3b22434b4507e7": "e46ddd41a5960807d528f5d9282568e622a023b94b72cb63f0353baff189257d",
        "3e7d409b9037b1fd870120de92ebb7285219ce4526c54701b888c5a13995f73c": "9bc5d0",
        c2d3bda8f77cc483d2f4368cf998203097230fd353d2223e5a333eb58f76a429: "9ae1dc59670bd3ef6fb51cbbbc05f1d2635fd548cb31f72500000a",
        "6bf8460545baf5b0af874ebbbd56ae09ee73cd24926b4549238b797b447e050a": "0964801caa928bc8c1869d60dbf1d8233233e0261baf725f2631d2b27574efc0316ce3067b4fccfa607274",
        "832c15668a451578b4c69974085280b4bac5b01e220398f06e06a1d0aff2859a": "4881dd3238fd6c8af1090d455e7b449a",
        c7a04effd2c0cede0279747f58bd210d0cc9d65c2eba265c6b4dfbc058a7047b: "d1fddfd63fd00cd6749a441b6ceaea1f250982a3a6b6d38f1b40cae00972cce3f9f4eaf7f9d7bc3070bd1e8d088500b10ca72e5ed5956f62",
        "9e78a15cc0b45c83c83218efadd234cbac22dbffb24a76e2eb5f6a81d32df616": "e8256c6b5a9623cf2b293090f78f8fbceea6fc3991ac5f872400608f14d2a8b3d494fcda1c51d93b9904e3242cdeaa4b227c68cea89cca05ab6b5296edf105",
        "03345958f90731bce89d07c2722dc693425a541b5230f99a6867882993576a23": "cd759a8d88edb46dda489a45ba6e48a42ce7efd36f1ca31d3bdfa40d2091f27740c5ec5de746d90d9841b986f575d545d0fb642398914eaab5",
      },
      output: "0120dd8239fdc65ef0485215493b6de1b4b31b96d9bae99617afb6178e4d43e3",
    };

    runTestVector(vector);
  });

  function runTestVector(vector: { input: { [key: string]: string }; output: string }) {
    const trie = InMemoryTrie.empty(blake2bTrieHasher);

    for (const [key, val] of Object.entries(vector.input)) {
      const stateKey = parseStateKey(key);
      const value = BytesBlob.parseBlobNoPrefix(val);
      trie.set(stateKey, value);
    }

    const expected = Bytes.parseBytesNoPrefix(vector.output, 32);
    assert.deepStrictEqual(trie.getRoot().toString(), expected.toString());
  }
});
