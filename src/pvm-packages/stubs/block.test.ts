import assert from "node:assert";
import { test } from "node:test";

test("Hello Block", async (t) => {
  await t.test("subtest", () => {
    assert.strictEqual(1, 1);
  });
});
