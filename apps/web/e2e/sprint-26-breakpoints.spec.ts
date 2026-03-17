import { test, expect } from "@playwright/test";

test.describe("Sprint 26 — Instructions Breakpoints", () => {
  async function loadProgram(page: import("@playwright/test").Page, exampleId = "fibonacci") {
    await page.goto("/#/load");
    const card = page.getByTestId(`example-card-${exampleId}`);
    await expect(card).toBeVisible();
    await card.click();
    await expect(page.getByTestId("config-step")).toBeVisible({ timeout: 15000 });
    await page.getByTestId("config-step-load").click();
    await expect(page.getByTestId("debugger-page")).toBeVisible({ timeout: 15000 });
  }

  test("clicking the gutter shows a red dot", async ({ page }) => {
    await loadProgram(page);

    const panel = page.getByTestId("instructions-panel");
    await expect(panel).toBeVisible();

    // Find the second instruction row's gutter (not the first, which is current PC)
    // First, get all instruction rows to find an available PC
    const rows = panel.locator("[data-testid^='instruction-row-']");
    const rowCount = await rows.count();
    expect(rowCount).toBeGreaterThan(1);

    // Get the second row's data-testid to extract its PC
    const secondRowTestId = await rows.nth(1).getAttribute("data-testid");
    const pc = secondRowTestId!.replace("instruction-row-", "");

    // Click the gutter
    const gutter = page.getByTestId(`breakpoint-gutter-${pc}`);
    await expect(gutter).toBeVisible();
    await gutter.click();

    // Red dot should appear
    const dot = page.getByTestId(`breakpoint-dot-${pc}`);
    await expect(dot).toBeVisible();
  });

  test("clicking again removes the dot", async ({ page }) => {
    await loadProgram(page);

    const panel = page.getByTestId("instructions-panel");
    const rows = panel.locator("[data-testid^='instruction-row-']");
    const secondRowTestId = await rows.nth(1).getAttribute("data-testid");
    const pc = secondRowTestId!.replace("instruction-row-", "");

    const gutter = page.getByTestId(`breakpoint-gutter-${pc}`);

    // Toggle on
    await gutter.click();
    const dot = page.getByTestId(`breakpoint-dot-${pc}`);
    await expect(dot).toBeVisible();

    // Toggle off
    await gutter.click();
    await expect(dot).not.toBeVisible();
  });

  test("setting a breakpoint and running stops at that PC", async ({ page }) => {
    await loadProgram(page);

    // Step a few times to discover a valid PC further along in execution
    const nextBtn = page.getByTestId("next-button");
    const pcValue = page.getByTestId("pc-value");

    // Step once to advance past initial PC
    await nextBtn.click();
    await expect(pcValue).not.toHaveText("0x0000", { timeout: 5000 });

    // Record the new PC — we'll use it as a breakpoint target
    const targetPcText = await pcValue.textContent();
    const targetPc = parseInt(targetPcText!.replace("0x", ""), 16);

    // Reset to go back to start
    await page.getByTestId("reset-button").click();
    await expect(pcValue).toHaveText("0x0000", { timeout: 5000 });

    // Set breakpoint at the target PC
    const gutter = page.getByTestId(`breakpoint-gutter-${targetPc}`);
    await gutter.click();
    await expect(page.getByTestId(`breakpoint-dot-${targetPc}`)).toBeVisible();

    // Run — should stop at the breakpoint PC
    await page.getByTestId("run-button").click();

    // Wait for execution to stop (run button should reappear)
    await expect(page.getByTestId("run-button")).toBeVisible({ timeout: 10000 });

    // PC should match the breakpoint
    await expect(pcValue).toHaveText(targetPcText!, { timeout: 5000 });
  });

  test("breakpoints persist after Reset", async ({ page }) => {
    await loadProgram(page);

    const panel = page.getByTestId("instructions-panel");
    const rows = panel.locator("[data-testid^='instruction-row-']");
    const secondRowTestId = await rows.nth(1).getAttribute("data-testid");
    const pc = secondRowTestId!.replace("instruction-row-", "");

    // Set breakpoint
    const gutter = page.getByTestId(`breakpoint-gutter-${pc}`);
    await gutter.click();
    await expect(page.getByTestId(`breakpoint-dot-${pc}`)).toBeVisible();

    // Reset
    await page.getByTestId("reset-button").click();

    // Breakpoint dot should still be visible
    await expect(page.getByTestId(`breakpoint-dot-${pc}`)).toBeVisible();
  });
});
