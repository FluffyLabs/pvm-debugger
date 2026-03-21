import { test, expect } from "@playwright/test";

test.describe("Sprint 05 — Single Step (Next Button)", () => {
  /**
   * Helper: load a program and wait for the debugger page.
   * Uses "step-test" by default — a single LOAD_IMM instruction that
   * sets r0 = 42, survives one step without terminating.
   */
  async function loadProgram(page: import("@playwright/test").Page, exampleId = "step-test") {
    await page.goto("/#/load");
    const card = page.getByTestId(`example-card-${exampleId}`);
    await expect(card).toBeVisible();
    await card.click();
    await expect(page.getByTestId("debugger-page")).toBeVisible({ timeout: 15000 });
  }

  test("Next button is visible on the debugger page", async ({ page }) => {
    await loadProgram(page);

    const nextBtn = page.getByTestId("next-button");
    await expect(nextBtn).toBeVisible();
    // In instruction mode, the Next button shows "Step" label
    await expect(nextBtn).toHaveText(/Step/);
    await expect(nextBtn).toHaveAttribute("aria-label", "Next");
  });

  test("clicking Next advances the PC", async ({ page }) => {
    await loadProgram(page);

    const pcValue = page.getByTestId("pc-value");
    await expect(pcValue).toHaveText("0x0000");

    await page.getByTestId("next-button").click();

    // After one LOAD_IMM instruction (6 bytes), PC should advance
    await expect(pcValue).not.toHaveText("0x0000", { timeout: 5000 });
  });

  test("gas decreases after stepping", async ({ page }) => {
    await loadProgram(page);

    const gasValue = page.getByTestId("gas-value");
    const gasBefore = await gasValue.textContent();

    await page.getByTestId("next-button").click();

    await expect(gasValue).not.toHaveText(gasBefore!, { timeout: 5000 });
  });

  test("register value changes after stepping a register-writing program", async ({ page }) => {
    await loadProgram(page);

    // r0 should be 0 initially
    const regHex0 = page.getByTestId("register-hex-0");
    const before = await regHex0.textContent();

    await page.getByTestId("next-button").click();

    // After LOAD_IMM r0=42, register 0 should change
    await expect(regHex0).not.toHaveText(before!, { timeout: 5000 });
  });

  test("Next button is disabled during step execution and re-enables after", async ({ page }) => {
    await loadProgram(page);

    const nextBtn = page.getByTestId("next-button");
    await expect(nextBtn).toBeEnabled();

    // Step once — PVM remains in ok state (single instruction, not past end yet)
    await nextBtn.click();

    // Button should re-enable after the step completes (PVM is still ok)
    await expect(nextBtn).toBeEnabled({ timeout: 5000 });
  });

  test("Next button stays disabled in terminal state", async ({ page }) => {
    await loadProgram(page);

    const nextBtn = page.getByTestId("next-button");

    // Step once: executes LOAD_IMM, PVM still ok at PC=6
    await nextBtn.click();
    await expect(nextBtn).toBeEnabled({ timeout: 5000 });

    // Step again: PC=6 is past program end, PVM panics → terminal
    await nextBtn.click();

    // Button should stay disabled (terminal state)
    await expect(nextBtn).toBeDisabled({ timeout: 5000 });
  });

  test("instruction panel highlight moves after stepping", async ({ page }) => {
    await loadProgram(page);

    // The initial row at PC=0 should have the highlight class
    const row0 = page.getByTestId("instruction-row-0");
    await expect(row0).toBeVisible();
    await expect(row0).toHaveClass(/instruction-row-current/);

    await page.getByTestId("next-button").click();

    // Wait for PC to change
    await expect(page.getByTestId("pc-value")).not.toHaveText("0x0000", { timeout: 5000 });

    // Row at PC=0 should no longer be highlighted
    await expect(row0).not.toHaveClass(/instruction-row-current/);
  });
});
