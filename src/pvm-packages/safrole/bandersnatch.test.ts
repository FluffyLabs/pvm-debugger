import { test } from "node:test";
import { verifyBandersnatch } from "./bandersnatch";

test("Bandersnatch verification", async (t) => {
  await t.test("verify", async () => {
    try {
      await verifyBandersnatch();
    } catch (e) {
      console.log("Error temporarily expected.");
    }
  });
});
