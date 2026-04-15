import { expect, test } from "@playwright/test";

test.describe("Sprint 25 — No divergence after disabling second PVM", () => {
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

  /**
   * Attempt to enable the Ananas PVM via settings.
   * Returns true if both PVM tabs appear, false otherwise.
   */
  async function tryEnableAnanas(
    page: import("@playwright/test").Page,
  ): Promise<boolean> {
    await openSettings(page);
    const ananasSwitch = page.getByTestId("pvm-switch-ananas");
    await expect(ananasSwitch).toBeVisible();
    await ananasSwitch.click();
    try {
      await expect(page.getByTestId("pvm-tab-ananas")).toHaveRole("tab", {
        timeout: 15000,
      });
      return true;
    } catch {
      return false;
    }
  }

  test("no divergence after enabling then disabling second PVM", async ({
    page,
  }) => {
    await loadProgram(page);

    // Enable ananas
    const enabled = await tryEnableAnanas(page);
    expect(enabled).toBe(true);

    // Wait for both PVMs to be fully loaded (blue dots = paused state)
    await expect(page.getByTestId("pvm-dot-typeberry")).toHaveClass(
      /bg-blue-500/,
      { timeout: 15000 },
    );
    await expect(page.getByTestId("pvm-dot-ananas")).toHaveClass(
      /bg-blue-500/,
      { timeout: 15000 },
    );

    // Both freshly loaded PVMs should not diverge
    await expect(page.getByTestId("divergence-summary")).not.toBeVisible();

    // Disable ananas (settings already open from tryEnableAnanas)
    const ananasSwitch = page.getByTestId("pvm-switch-ananas");
    await ananasSwitch.click();

    // Wait for ananas to be removed (reverts to grayed-out span, no role="tab")
    await expect(page.getByTestId("pvm-tab-ananas")).not.toHaveAttribute(
      "role",
      "tab",
      { timeout: 15000 },
    );

    // Should NOT show divergence with only one PVM
    await expect(page.getByTestId("divergence-summary")).not.toBeVisible();

    // Typeberry should still be functional (blue dot = paused)
    await expect(page.getByTestId("pvm-dot-typeberry")).toHaveClass(
      /bg-blue-500/,
      { timeout: 15000 },
    );
  });

  test("no divergence after stepping, enabling, then disabling second PVM", async ({
    page,
  }) => {
    await loadProgram(page);

    // Step a few times with just typeberry
    const nextBtn = page.getByTestId("next-button");
    await expect(nextBtn).toBeVisible({ timeout: 10000 });
    await nextBtn.click();
    await expect(nextBtn).toBeEnabled({ timeout: 5000 });
    await nextBtn.click();
    await expect(nextBtn).toBeEnabled({ timeout: 5000 });

    // Enable ananas (this resets the session — both PVMs start fresh)
    const enabled = await tryEnableAnanas(page);
    expect(enabled).toBe(true);

    // Wait for both PVMs to load
    await expect(page.getByTestId("pvm-dot-typeberry")).toHaveClass(
      /bg-blue-500/,
      { timeout: 15000 },
    );
    await expect(page.getByTestId("pvm-dot-ananas")).toHaveClass(
      /bg-blue-500/,
      { timeout: 15000 },
    );

    // No divergence — both loaded fresh with identical state
    await expect(page.getByTestId("divergence-summary")).not.toBeVisible();

    // Disable ananas
    const ananasSwitch = page.getByTestId("pvm-switch-ananas");
    await ananasSwitch.click();

    // Wait for transition
    await expect(page.getByTestId("pvm-tab-ananas")).not.toHaveAttribute(
      "role",
      "tab",
      { timeout: 15000 },
    );

    // No divergence after disabling
    await expect(page.getByTestId("divergence-summary")).not.toBeVisible();
  });
});
