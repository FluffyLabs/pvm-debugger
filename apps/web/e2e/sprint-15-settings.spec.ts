import { expect, test } from "@playwright/test";

test.describe("Sprint 15 — Settings Tab", () => {
  /** Load a program and wait for the debugger page to be visible. */
  async function loadProgram(page: import("@playwright/test").Page) {
    await page.goto("/#/load");
    const card = page.getByTestId("example-card-step-test");
    await expect(card).toBeVisible();
    await card.click();
    await expect(page.getByTestId("debugger-page")).toBeVisible({
      timeout: 15000,
    });
  }

  /** Open the settings tab in the bottom drawer. */
  async function openSettings(page: import("@playwright/test").Page) {
    await page.getByTestId("drawer-tab-settings").click();
    await expect(page.getByTestId("settings-tab")).toBeVisible();
  }

  test("the three settings groups render", async ({ page }) => {
    await loadProgram(page);
    await openSettings(page);

    await expect(page.getByTestId("settings-pvm-selection")).toBeVisible();
    await expect(page.getByTestId("settings-stepping-mode")).toBeVisible();
    await expect(page.getByTestId("settings-auto-continue")).toBeVisible();
  });

  test("disabling the last PVM is prevented", async ({ page }) => {
    await loadProgram(page);
    await openSettings(page);

    // Typeberry is the only enabled PVM by default — its switch should be disabled
    const typeberrySwitch = page.getByTestId("pvm-switch-typeberry");
    await expect(typeberrySwitch).toBeVisible();
    await expect(typeberrySwitch).toBeDisabled();
  });

  test("stepping mode persists across page reload", async ({ page }) => {
    await loadProgram(page);
    await openSettings(page);

    // Switch to Block mode
    await page.getByTestId("stepping-radio-block").click();
    await expect(page.getByTestId("stepping-radio-block")).toBeChecked();

    // Reload — RestoreGate restores the session and stays on debugger
    await page.reload();
    await expect(page.getByTestId("debugger-page")).toBeVisible({
      timeout: 15000,
    });
    await openSettings(page);

    // Block mode should still be selected
    await expect(page.getByTestId("stepping-radio-block")).toBeChecked();
  });

  test("auto-continue policy persists across page reload", async ({ page }) => {
    await loadProgram(page);
    await openSettings(page);

    // Switch to Always
    await page.getByTestId("auto-continue-radio-always_continue").click();
    await expect(
      page.getByTestId("auto-continue-radio-always_continue"),
    ).toBeChecked();

    // Reload — RestoreGate restores the session and stays on debugger
    await page.reload();
    await expect(page.getByTestId("debugger-page")).toBeVisible({
      timeout: 15000,
    });
    await openSettings(page);

    // Always should still be selected
    await expect(
      page.getByTestId("auto-continue-radio-always_continue"),
    ).toBeChecked();
  });

  test("changing N-instructions count updates the stored value", async ({
    page,
  }) => {
    await loadProgram(page);
    await openSettings(page);

    // Select N-Instructions mode to show the count input
    await page.getByTestId("stepping-radio-n_instructions").click();
    await expect(page.getByTestId("n-instructions-count")).toBeVisible();

    // Change the count
    const countInput = page.getByTestId("n-instructions-count");
    await countInput.fill("25");

    // Reload — RestoreGate restores the session and stays on debugger
    await page.reload();
    await expect(page.getByTestId("debugger-page")).toBeVisible({
      timeout: 15000,
    });
    await openSettings(page);

    // N-Instructions mode should still be selected
    await expect(
      page.getByTestId("stepping-radio-n_instructions"),
    ).toBeChecked();
    await expect(page.getByTestId("n-instructions-count")).toHaveValue("25");
  });

  test("descriptive hint text is visible", async ({ page }) => {
    await loadProgram(page);
    await openSettings(page);

    // PVM hints
    await expect(page.getByTestId("pvm-hint-typeberry")).toBeVisible();
    await expect(page.getByTestId("pvm-hint-typeberry")).not.toBeEmpty();

    // Stepping mode hints
    await expect(page.getByTestId("stepping-hint-instruction")).toBeVisible();
    await expect(page.getByTestId("stepping-hint-instruction")).not.toBeEmpty();

    // Auto-continue hints
    await expect(page.getByTestId("auto-continue-hint-never")).toBeVisible();
    await expect(page.getByTestId("auto-continue-hint-never")).not.toBeEmpty();
  });
});
