import { test, expect } from "@playwright/test";

test.describe("Sprint 16 — Stepping Modes (Step Button)", () => {
  /** Load a program and wait for the debugger page to be visible. */
  async function loadProgram(page: import("@playwright/test").Page, exampleId = "step-test") {
    await page.goto("/#/load");
    const card = page.getByTestId(`example-card-${exampleId}`);
    await expect(card).toBeVisible();
    await card.click();
    await expect(page.getByTestId("debugger-page")).toBeVisible({ timeout: 15000 });
  }

  /** Open the settings tab in the bottom drawer. */
  async function openSettings(page: import("@playwright/test").Page) {
    await page.getByTestId("drawer-tab-settings").click();
    await expect(page.getByTestId("settings-tab")).toBeVisible();
  }

  test("Step button is hidden in instruction mode (default)", async ({ page }) => {
    await loadProgram(page);

    // Step button is hidden when steppingMode is "instruction" (the default)
    await expect(page.getByTestId("step-button")).not.toBeVisible();
  });

  test("Step button appears when switching to block mode", async ({ page }) => {
    await loadProgram(page);
    await openSettings(page);

    // Switch to Block mode — Step button should appear
    await page.getByTestId("stepping-radio-block").click();
    await expect(page.getByTestId("stepping-radio-block")).toBeChecked();

    const stepBtn = page.getByTestId("step-button");
    await expect(stepBtn).toBeVisible();
    await expect(stepBtn).toHaveText(/Step/);
    await expect(stepBtn).toHaveAttribute("aria-label", "Step 1 instruction");
  });

  test("changing stepping mode in settings updates the Next button label", async ({ page }) => {
    await loadProgram(page);
    await openSettings(page);

    const nextBtn = page.getByTestId("next-button");

    // Default instruction mode: Next button shows "Step"
    await expect(nextBtn).toHaveText(/Step/);

    // Switch to Block mode
    await page.getByTestId("stepping-radio-block").click();
    await expect(nextBtn).toHaveText(/Block/);

    // Switch to N-Instructions mode
    await page.getByTestId("stepping-radio-n_instructions").click();
    await expect(page.getByTestId("stepping-radio-n_instructions")).toBeChecked();

    // Default n is 10
    await expect(nextBtn).toHaveText(/Next\(10\)/);

    // Change the count to 25
    const countInput = page.getByTestId("n-instructions-count");
    await countInput.fill("25");

    await expect(nextBtn).toHaveText(/Next\(25\)/);
  });

  test("Step with N-Instructions mode steps the correct count", async ({ page }) => {
    await loadProgram(page);
    await openSettings(page);

    // Switch to N-Instructions mode with 5 steps
    await page.getByTestId("stepping-radio-n_instructions").click();
    const countInput = page.getByTestId("n-instructions-count");
    await countInput.fill("5");

    // Record initial PC
    const pcValue = page.getByTestId("pc-value");
    const initialPc = await pcValue.textContent();

    // Click Step button (visible in n_instructions mode)
    const stepBtn = page.getByTestId("step-button");
    await stepBtn.click();

    // PC should change (we stepped 1 instruction via Step)
    await expect(pcValue).not.toHaveText(initialPc!, { timeout: 5000 });
  });

  test("Step button is disabled in terminal state", async ({ page }) => {
    await loadProgram(page);
    await openSettings(page);

    // Switch to block mode so Step button is visible
    await page.getByTestId("stepping-radio-block").click();

    // Run to completion
    await page.getByTestId("run-button").click();
    await expect(page.getByTestId("execution-complete-badge")).toBeVisible({ timeout: 10000 });

    // Step button should be disabled
    await expect(page.getByTestId("step-button")).toBeDisabled();
  });

  test("toolbar order is Load, Reset, Next, Step, Run", async ({ page }) => {
    await loadProgram(page);
    await openSettings(page);

    // Switch to block mode so Step button is visible
    await page.getByTestId("stepping-radio-block").click();

    const controls = page.getByTestId("execution-controls");
    const buttons = controls.locator("button");

    await expect(buttons.nth(0)).toHaveAttribute("data-testid", "load-button");
    await expect(buttons.nth(1)).toHaveAttribute("data-testid", "reset-button");
    await expect(buttons.nth(2)).toHaveAttribute("data-testid", "next-button");
    await expect(buttons.nth(3)).toHaveAttribute("data-testid", "step-button");
    await expect(buttons.nth(4)).toHaveAttribute("data-testid", "run-button");
  });
});
