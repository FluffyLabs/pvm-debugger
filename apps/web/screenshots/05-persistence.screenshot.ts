import { capture, expect, settle, test } from "./helpers";

test.describe("Persistence", () => {
  test("persistence-restored: state preserved across reload", async ({
    page,
  }) => {
    await page.goto("/#/load");
    await page.getByTestId("example-card-fibonacci").click();
    await expect(page.getByTestId("debugger-page")).toBeVisible({
      timeout: 15000,
    });
    // Take a few steps so the restored state looks "live".
    for (let i = 0; i < 4; i++) {
      await page.getByTestId("next-button").click();
      await page.waitForTimeout(60);
    }
    // Reload the page — persistence should reinstall the program.
    await page.reload();
    await expect(page.getByTestId("debugger-page")).toBeVisible({
      timeout: 15000,
    });
    await settle(page);
    await capture(page, "persistence-restored.png");
  });
});
