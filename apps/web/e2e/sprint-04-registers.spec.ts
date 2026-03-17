import { test, expect } from "@playwright/test";

test.describe("Sprint 04 — Registers + Status Display", () => {
  /** Helper: load a program and wait for the debugger page. */
  async function loadProgram(page: import("@playwright/test").Page, exampleId = "add") {
    await page.goto("/#/load");
    const card = page.getByTestId(`example-card-${exampleId}`);
    await expect(card).toBeVisible();
    await card.click();
    await expect(page.getByTestId("config-step")).toBeVisible({ timeout: 15000 });
    await page.getByTestId("config-step-load").click();
    await expect(page.getByTestId("debugger-page")).toBeVisible({ timeout: 15000 });
  }

  test("status shows 'OK' after program load", async ({ page }) => {
    await loadProgram(page);

    const badge = page.getByTestId("status-badge");
    await expect(badge).toBeVisible();
    await expect(badge).toHaveText("OK");
  });

  test("PC renders in hex", async ({ page }) => {
    await loadProgram(page);

    const pcValue = page.getByTestId("pc-value");
    await expect(pcValue).toBeVisible();
    // PC should be a hex value like "0x0000" or "0x0005"
    await expect(pcValue).toHaveText(/^0x[0-9A-F]{4,}$/);
  });

  test("gas renders in decimal with thousands separators", async ({ page }) => {
    await loadProgram(page);

    const gasValue = page.getByTestId("gas-value");
    await expect(gasValue).toBeVisible();
    // Gas should be a decimal number, possibly with commas (e.g. "1,000,000")
    await expect(gasValue).toHaveText(/^[\d,]+$/);
  });

  test("all 13 register rows render with omega labels", async ({ page }) => {
    await loadProgram(page);

    const panel = page.getByTestId("registers-panel");
    await expect(panel).toBeVisible();

    for (let i = 0; i < 13; i++) {
      const row = page.getByTestId(`register-row-${i}`);
      await expect(row).toBeVisible();

      const label = page.getByTestId(`register-label-${i}`);
      await expect(label).toHaveText(`ω${i}:`);
    }
  });

  test("register values show hex and decimal", async ({ page }) => {
    await loadProgram(page);

    // Check the first register row has both hex and decimal display
    const hex = page.getByTestId("register-hex-0");
    await expect(hex).toBeVisible();
    // Should be a 0x-prefixed hex string with at least 16 digits
    await expect(hex).toHaveText(/^0x[0-9a-f]{16,}$/);

    const decimal = page.getByTestId("register-decimal-0");
    await expect(decimal).toBeVisible();
    // Should be a parenthesized decimal number
    await expect(decimal).toHaveText(/^\(\d+\)$/);
  });
});
