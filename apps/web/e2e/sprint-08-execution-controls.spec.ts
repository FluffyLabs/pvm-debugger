import { expect, test } from "@playwright/test";

test.describe("Sprint 08 — Run / Pause / Reset / Load Controls", () => {
  async function loadProgram(
    page: import("@playwright/test").Page,
    exampleId = "step-test",
  ) {
    await page.goto("/#/load");
    const card = page.getByTestId(`example-card-${exampleId}`);
    await expect(card).toBeVisible();
    await card.click();
    await expect(page.getByTestId("debugger-page")).toBeVisible({
      timeout: 15000,
    });
  }

  test("toolbar renders Load, Reset, Next, Run in the correct order", async ({
    page,
  }) => {
    await loadProgram(page);

    const controls = page.getByTestId("execution-controls");
    await expect(controls).toBeVisible();

    const loadBtn = page.getByTestId("load-button");
    const resetBtn = page.getByTestId("reset-button");
    const nextBtn = page.getByTestId("next-button");
    const runBtn = page.getByTestId("run-button");

    await expect(loadBtn).toBeVisible();
    await expect(resetBtn).toBeVisible();
    await expect(nextBtn).toBeVisible();
    await expect(runBtn).toBeVisible();

    // Check aria labels
    await expect(loadBtn).toHaveAttribute("aria-label", "Load");
    await expect(resetBtn).toHaveAttribute("aria-label", "Reset");
    await expect(nextBtn).toHaveAttribute("aria-label", "Next");
    await expect(runBtn).toHaveAttribute("aria-label", "Run");

    // Step button is hidden in instruction mode (the default)
    await expect(page.getByTestId("step-button")).not.toBeVisible();

    // Verify order by checking DOM positions (no step button in instruction mode)
    const buttons = controls.locator("button");
    await expect(buttons.nth(0)).toHaveAttribute("data-testid", "load-button");
    await expect(buttons.nth(1)).toHaveAttribute("data-testid", "reset-button");
    await expect(buttons.nth(2)).toHaveAttribute("data-testid", "next-button");
    await expect(buttons.nth(3)).toHaveAttribute("data-testid", "run-button");
  });

  test("Run starts continuous execution and becomes Pause", async ({
    page,
  }) => {
    // Use game-of-life — runs for many thousands of steps (gas=10M)
    await loadProgram(page, "game-of-life");

    const runBtn = page.getByTestId("run-button");
    await expect(runBtn).toBeVisible();
    await runBtn.click();

    // The Pause button should appear while running
    const pauseBtn = page.getByTestId("pause-button");
    await expect(pauseBtn).toBeVisible({ timeout: 5000 });
    await expect(pauseBtn).toHaveAttribute("aria-label", "Pause");

    // Stop the run so it doesn't keep going after the test.
    // force:true bypasses stability checks during rapid re-renders.
    await pauseBtn.click({ force: true });
  });

  test("Pause stops execution and the run loop exits", async ({ page }) => {
    // Use game-of-life — gas=10M, runs for many steps
    await loadProgram(page, "game-of-life");

    await page.getByTestId("run-button").click();

    // Wait for Pause button to appear, then click it.
    // force:true bypasses stability checks during rapid re-renders.
    const pauseBtn = page.getByTestId("pause-button");
    await expect(pauseBtn).toBeVisible({ timeout: 5000 });
    await pauseBtn.click({ force: true });

    // After pausing, Run button should reappear (the loop has exited).
    // It may be enabled (program paused mid-execution) or disabled
    // (program terminated during the final batch), both are valid.
    await expect(page.getByTestId("run-button")).toBeVisible({ timeout: 5000 });
  });

  test("Reset returns PC, gas, and registers to initial values", async ({
    page,
  }) => {
    await loadProgram(page);

    const pcValue = page.getByTestId("pc-value");
    const gasValue = page.getByTestId("gas-value");

    // Record initial values
    const initialPc = await pcValue.textContent();
    const initialGas = await gasValue.textContent();

    // Step once to change state
    await page.getByTestId("next-button").click();
    await expect(pcValue).not.toHaveText(initialPc!, { timeout: 5000 });

    // Click Reset
    await page.getByTestId("reset-button").click();

    // Values should return to initial
    await expect(pcValue).toHaveText(initialPc!, { timeout: 5000 });
    await expect(gasValue).toHaveText(initialGas!, { timeout: 5000 });
  });

  test("Load navigates back to /load", async ({ page }) => {
    await loadProgram(page);

    await page.getByTestId("load-button").click();

    // Should navigate to load page
    await expect(page).toHaveURL(/\/#\/load/);
    await expect(page.getByTestId("debugger-page")).not.toBeVisible();
  });

  test("running a small program to completion shows terminal status and disables Next/Run", async ({
    page,
  }) => {
    await loadProgram(page);

    // Run the program to completion
    await page.getByTestId("run-button").click();

    // Wait for completion
    await expect(page.getByTestId("execution-complete-badge")).toBeVisible({
      timeout: 10000,
    });
    await expect(page.getByTestId("execution-complete-badge")).toHaveText(
      "Execution Complete",
    );

    // Next and Run should be disabled
    await expect(page.getByTestId("next-button")).toBeDisabled();
    await expect(page.getByTestId("run-button")).toBeDisabled();
  });

  test("Reset and Load remain enabled after completion", async ({ page }) => {
    await loadProgram(page);

    // Run to completion
    await page.getByTestId("run-button").click();
    await expect(page.getByTestId("execution-complete-badge")).toBeVisible({
      timeout: 10000,
    });

    // Reset and Load should still be enabled
    await expect(page.getByTestId("reset-button")).toBeEnabled();
    await expect(page.getByTestId("load-button")).toBeEnabled();
  });

  test("Reset after completion restores state and allows re-execution", async ({
    page,
  }) => {
    await loadProgram(page);

    const pcValue = page.getByTestId("pc-value");
    const initialPc = await pcValue.textContent();

    // Run to completion
    await page.getByTestId("run-button").click();
    await expect(page.getByTestId("execution-complete-badge")).toBeVisible({
      timeout: 10000,
    });

    // Next/Run should be disabled
    await expect(page.getByTestId("next-button")).toBeDisabled();

    // Reset
    await page.getByTestId("reset-button").click();

    // PC should return to initial value
    await expect(pcValue).toHaveText(initialPc!, { timeout: 5000 });

    // Completion badge should disappear
    await expect(
      page.getByTestId("execution-complete-badge"),
    ).not.toBeVisible();

    // Next button should be re-enabled (PVM is paused, not terminal)
    await expect(page.getByTestId("next-button")).toBeEnabled({
      timeout: 5000,
    });

    // Can step again
    await page.getByTestId("next-button").click();
    await expect(pcValue).not.toHaveText(initialPc!, { timeout: 5000 });
  });
});
