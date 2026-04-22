import { capture, expect, settle, test } from "./helpers";

test.describe("Settings and multi-PVM", () => {
  test("settings: drawer showing PVM toggles and stepping modes", async ({
    page,
  }) => {
    await page.goto("/#/load");
    await page.getByTestId("example-card-fibonacci").click();
    await expect(page.getByTestId("debugger-page")).toBeVisible({
      timeout: 15000,
    });
    await page.getByTestId("drawer-tab-settings").click();
    await expect(page.getByTestId("settings-tab")).toBeVisible();
    await settle(page);
    await capture(page, "settings.png");
  });

  test("multiple-pvms: both typeberry and ananas enabled", async ({ page }) => {
    await page.goto("/#/load");
    await page.getByTestId("example-card-fibonacci").click();
    await expect(page.getByTestId("debugger-page")).toBeVisible({
      timeout: 15000,
    });
    await page.getByTestId("drawer-tab-settings").click();
    await expect(page.getByTestId("settings-tab")).toBeVisible();
    // Enable ananas alongside typeberry.
    const ananasSwitch = page.getByTestId("pvm-switch-ananas");
    const isChecked = await ananasSwitch.isChecked().catch(() => false);
    if (!isChecked) {
      await ananasSwitch.click();
    }
    // Close drawer so PVM tabs in the top-right are in frame.
    await page.getByTestId("drawer-close-button").click();
    // Both PVM tabs should appear.
    await expect(page.getByTestId("pvm-tab-typeberry")).toBeVisible();
    await expect(page.getByTestId("pvm-tab-ananas")).toBeVisible();
    // Advance a few steps to produce deltas between the two PVMs (usually none
    // for a clean example, but stepping gives the UI something real to show).
    for (let i = 0; i < 3; i++) {
      await page.getByTestId("next-button").click();
      await page.waitForTimeout(100);
    }
    await settle(page);
    await capture(page, "multiple-pvms.png");
  });
});
