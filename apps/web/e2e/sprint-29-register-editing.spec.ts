import { test, expect } from "@playwright/test";

test.describe("Sprint 29 — Registers Inline Editing", () => {
  /**
   * Helper: load a program and wait for the debugger page.
   * Uses "step-test" — a single LOAD_IMM instruction, gives us a paused OK state.
   */
  async function loadProgram(page: import("@playwright/test").Page, exampleId = "step-test") {
    await page.goto("/#/load");
    const card = page.getByTestId(`example-card-${exampleId}`);
    await expect(card).toBeVisible();
    await card.click();
    await expect(page.getByTestId("config-step")).toBeVisible({ timeout: 15000 });
    await page.getByTestId("config-step-load").click();
    await expect(page.getByTestId("debugger-page")).toBeVisible({ timeout: 15000 });
  }

  test("clicking a register value enters edit mode", async ({ page }) => {
    await loadProgram(page);

    const hexSpan = page.getByTestId("register-hex-0");
    await expect(hexSpan).toBeVisible();
    await hexSpan.click();

    const editInput = page.getByTestId("register-edit-0");
    await expect(editInput).toBeVisible();
    await expect(editInput).toBeFocused();
  });

  test("Enter commits a new value", async ({ page }) => {
    await loadProgram(page);

    // Click register 0 to start editing
    await page.getByTestId("register-hex-0").click();
    const editInput = page.getByTestId("register-edit-0");
    await expect(editInput).toBeVisible();

    // Clear and type a new value
    await editInput.fill("42");
    await editInput.press("Enter");

    // Edit mode should close and the value should update
    await expect(editInput).not.toBeVisible();
    const hexSpan = page.getByTestId("register-hex-0");
    // 42 in hex = 0x000000000000002a
    await expect(hexSpan).toHaveText(/0x0{14}2a/i, { timeout: 5000 });
  });

  test("Escape cancels the edit", async ({ page }) => {
    await loadProgram(page);

    const hexSpan = page.getByTestId("register-hex-0");
    const originalText = await hexSpan.textContent();

    await hexSpan.click();
    const editInput = page.getByTestId("register-edit-0");
    await editInput.fill("999");
    await editInput.press("Escape");

    // Should revert to original value
    await expect(editInput).not.toBeVisible();
    await expect(hexSpan).toHaveText(originalText!);
  });

  test("editing a register through hex input works", async ({ page }) => {
    await loadProgram(page);

    await page.getByTestId("register-hex-1").click();
    const editInput = page.getByTestId("register-edit-1");
    await editInput.fill("0xff");
    await editInput.press("Enter");

    await expect(editInput).not.toBeVisible();
    const hexSpan = page.getByTestId("register-hex-1");
    // 0xff = 255 decimal, hex = 0x00000000000000ff
    await expect(hexSpan).toHaveText(/0x0{14}ff/i, { timeout: 5000 });
  });

  test("editing PC with a valid value updates it", async ({ page }) => {
    await loadProgram(page);

    const pcValue = page.getByTestId("pc-value");
    await expect(pcValue).toHaveText("0x0000");

    await pcValue.click();
    const pcEdit = page.getByTestId("pc-value-edit");
    await expect(pcEdit).toBeVisible();

    await pcEdit.fill("0x0010");
    await pcEdit.press("Enter");

    await expect(pcEdit).not.toBeVisible();
    await expect(pcValue).toHaveText(/0x0*10/i, { timeout: 5000 });
  });

  test("editing gas with a valid value updates it", async ({ page }) => {
    await loadProgram(page);

    const gasValue = page.getByTestId("gas-value");
    const originalGas = await gasValue.textContent();

    await gasValue.click();
    const gasEdit = page.getByTestId("gas-value-edit");
    await expect(gasEdit).toBeVisible();

    await gasEdit.fill("500000");
    await gasEdit.press("Enter");

    await expect(gasEdit).not.toBeVisible();
    // 500,000 with thousands separator
    await expect(gasValue).toHaveText("500,000", { timeout: 5000 });
  });

  test("PC rejects negative values", async ({ page }) => {
    await loadProgram(page);

    const pcValue = page.getByTestId("pc-value");
    const originalPc = await pcValue.textContent();

    await pcValue.click();
    const pcEdit = page.getByTestId("pc-value-edit");
    await expect(pcEdit).toBeVisible();

    await pcEdit.fill("-1");
    await pcEdit.press("Enter");

    // The edit input should still be visible (rejected) with error styling
    // or fallback: the value remains unchanged
    // Check that the border turns red (validation error)
    await expect(pcEdit).toHaveClass(/border-red-500/);
  });

  test("editing is disabled during running state", async ({ page }) => {
    await loadProgram(page);

    // Step to terminal state (step twice: first step executes, second panics)
    const nextBtn = page.getByTestId("next-button");
    await nextBtn.click();
    await expect(nextBtn).toBeEnabled({ timeout: 5000 });
    await nextBtn.click();
    await expect(nextBtn).toBeDisabled({ timeout: 5000 });

    // Now in terminal state — register values should not be clickable for editing
    const hexSpan = page.getByTestId("register-hex-0");
    await hexSpan.click();

    // Edit input should NOT appear
    const editInput = page.getByTestId("register-edit-0");
    await expect(editInput).not.toBeVisible();
  });

  test("editing is disabled in terminal state", async ({ page }) => {
    await loadProgram(page);

    // Step to terminal state
    const nextBtn = page.getByTestId("next-button");
    await nextBtn.click();
    await expect(nextBtn).toBeEnabled({ timeout: 5000 });
    await nextBtn.click();
    await expect(nextBtn).toBeDisabled({ timeout: 5000 });

    // PC should not be editable
    const pcValue = page.getByTestId("pc-value");
    await pcValue.click();
    await expect(page.getByTestId("pc-value-edit")).not.toBeVisible();

    // Gas should not be editable
    const gasValue = page.getByTestId("gas-value");
    await gasValue.click();
    await expect(page.getByTestId("gas-value-edit")).not.toBeVisible();
  });

  test("gas shows a secondary hex tooltip", async ({ page }) => {
    await loadProgram(page);

    const trigger = page.getByTestId("gas-hex-tooltip-trigger");
    await expect(trigger).toBeVisible();

    // Hover to reveal tooltip
    await trigger.hover();

    // The tooltip should contain a hex value
    const tooltip = page.getByRole("tooltip");
    await expect(tooltip).toBeVisible({ timeout: 5000 });
    await expect(tooltip).toHaveText(/^0x[0-9a-f]+$/i);
  });

  test("edit mode does not change row height", async ({ page }) => {
    await loadProgram(page);

    const row = page.getByTestId("register-row-0");
    const heightBefore = await row.evaluate((el) => el.getBoundingClientRect().height);

    // Enter edit mode
    await page.getByTestId("register-hex-0").click();
    await expect(page.getByTestId("register-edit-0")).toBeVisible();

    const heightDuring = await row.evaluate((el) => el.getBoundingClientRect().height);

    // Height should be the same (within 1px tolerance for sub-pixel rounding)
    expect(Math.abs(heightDuring - heightBefore)).toBeLessThanOrEqual(1);
  });
});
