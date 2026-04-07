import { expect, test } from "@playwright/test";

/**
 * Dispatch a keyboard event from within the page.
 * Using page.evaluate instead of page.keyboard.press because
 * Playwright's CDP-level key dispatch can trigger browser shortcuts
 * (Ctrl+Shift+R → hard refresh) before the JS handler
 * has a chance to call preventDefault(). Synthetic KeyboardEvents
 * dispatched from JS go directly through the DOM event pipeline.
 */
async function pressKey(
  page: import("@playwright/test").Page,
  key: string,
  opts: { ctrlKey?: boolean; shiftKey?: boolean } = {},
) {
  await page.evaluate(
    ({ key, ctrlKey, shiftKey }) => {
      document.dispatchEvent(
        new KeyboardEvent("keydown", {
          key,
          ctrlKey: ctrlKey ?? false,
          shiftKey: shiftKey ?? false,
          bubbles: true,
          cancelable: true,
        }),
      );
    },
    { key, ...opts },
  );
}

test.describe("Sprint 17 — Keyboard Shortcuts", () => {
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

  test("Ctrl+Shift+N advances execution (PC changes)", async ({ page }) => {
    await loadProgram(page);

    const pcValue = page.getByTestId("pc-value");
    const initialPc = await pcValue.textContent();

    // Press Ctrl+Shift+N to trigger Next
    await pressKey(page, "N", { ctrlKey: true, shiftKey: true });

    // PC should change
    await expect(pcValue).not.toHaveText(initialPc!, { timeout: 5000 });
  });

  test("Ctrl+Shift+P starts running, pressing again pauses", async ({
    page,
  }) => {
    // Use game-of-life — runs for many thousands of steps (gas=10M)
    await loadProgram(page, "game-of-life");

    const pcValue = page.getByTestId("pc-value");
    const initialPc = await pcValue.textContent();

    // Press Ctrl+Shift+P to start running
    await pressKey(page, "P", { ctrlKey: true, shiftKey: true });

    // Verify execution started: either pause button appears (running) or execution completes.
    const pauseOrComplete = await Promise.race([
      page
        .getByTestId("pause-button")
        .waitFor({ state: "visible", timeout: 5000 })
        .then(() => "running" as const),
      page
        .getByTestId("execution-complete-badge")
        .waitFor({ state: "visible", timeout: 5000 })
        .then(() => "completed" as const),
      // Fallback: PC changed significantly (execution happened)
      expect(pcValue)
        .not.toHaveText(initialPc!, { timeout: 5000 })
        .then(() => "pc-changed" as const),
    ]);

    if (pauseOrComplete === "running") {
      // Press Ctrl+Shift+P again to pause
      await pressKey(page, "P", { ctrlKey: true, shiftKey: true });

      // Run button should reappear (program paused or completed after stopping)
      await expect(page.getByTestId("run-button")).toBeVisible({
        timeout: 5000,
      });
    }
    // If completed or pc-changed, shortcut successfully triggered run
  });

  test("Ctrl+Shift+R resets to initial state", async ({ page }) => {
    await loadProgram(page);

    const pcValue = page.getByTestId("pc-value");
    const gasValue = page.getByTestId("gas-value");

    // Record initial values
    const initialPc = await pcValue.textContent();
    const initialGas = await gasValue.textContent();

    // Step once to change state
    await page.getByTestId("next-button").click();
    await expect(pcValue).not.toHaveText(initialPc!, { timeout: 5000 });

    // Press Ctrl+Shift+R to reset
    await pressKey(page, "R", { ctrlKey: true, shiftKey: true });

    // Values should return to initial
    await expect(pcValue).toHaveText(initialPc!, { timeout: 5000 });
    await expect(gasValue).toHaveText(initialGas!, { timeout: 5000 });
  });

  test("shortcuts do not trigger page refresh", async ({ page }) => {
    await loadProgram(page);

    // Press Ctrl+Shift+P — should start run, NOT reload the page
    await pressKey(page, "P", { ctrlKey: true, shiftKey: true });

    // The debugger page should still be visible (no page reload)
    await expect(page.getByTestId("debugger-page")).toBeVisible();

    // Wait for run to settle (complete or be pausable)
    await page.waitForTimeout(500);

    // Press Ctrl+Shift+R — should reset, NOT hard-refresh
    // First stop any running execution
    await pressKey(page, "P", { ctrlKey: true, shiftKey: true });
    await page.waitForTimeout(200);

    await pressKey(page, "R", { ctrlKey: true, shiftKey: true });

    // Debugger page should still be present (no page reload navigation)
    await expect(page.getByTestId("debugger-page")).toBeVisible();
  });

  test("shortcuts do not fire when focus is inside an input", async ({
    page,
  }) => {
    await loadProgram(page);

    // Open drawer settings tab and switch to n_instructions mode to expose a text input.
    await page.getByTestId("drawer-tab-settings").click();
    await expect(page.getByTestId("settings-tab")).toBeVisible();
    await page.getByTestId("stepping-radio-n_instructions").click();
    const input = page.getByTestId("n-instructions-count");
    await expect(input).toBeVisible();

    const pcValue = page.getByTestId("pc-value");
    const initialPc = await pcValue.textContent();

    // Focus the input
    await input.focus();

    // Dispatch Ctrl+Shift+N from the input element (target is input, so handler skips it)
    await page.evaluate(() => {
      const el = document.querySelector("[data-testid='n-instructions-count']");
      if (el) {
        el.dispatchEvent(
          new KeyboardEvent("keydown", {
            key: "N",
            ctrlKey: true,
            shiftKey: true,
            bubbles: true,
            cancelable: true,
          }),
        );
      }
    });

    // Small wait to ensure no async step happened
    await page.waitForTimeout(200);

    // PC should remain unchanged
    await expect(pcValue).toHaveText(initialPc!);
  });
});
