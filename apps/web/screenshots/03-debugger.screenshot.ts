import type { Page } from "@playwright/test";
import { capture, expect, settle, test } from "./helpers";

/** Load a generic PVM example that goes straight to the debugger. */
async function loadGeneric(page: Page, id: string) {
  await page.goto("/#/load");
  await page.getByTestId(`example-card-${id}`).click();
  await expect(page.getByTestId("debugger-page")).toBeVisible({
    timeout: 15000,
  });
}

test.describe("Debugger screen", () => {
  test("debugger-full: layout with instructions/registers/memory", async ({
    page,
  }) => {
    await loadGeneric(page, "fibonacci");
    await settle(page);
    await capture(page, "debugger-full.png");
  });

  test("debugger-stepping: after several steps", async ({ page }) => {
    await loadGeneric(page, "fibonacci");
    // Advance a few instructions so register deltas and the PC marker
    // move off the initial state.
    for (let i = 0; i < 5; i++) {
      await page.getByTestId("next-button").click();
      await page.waitForTimeout(60);
    }
    await settle(page);
    await capture(page, "debugger-stepping.png");
  });

  test("registers-edit: inline register editor open", async ({ page }) => {
    await loadGeneric(page, "fibonacci");
    // Click the hex value to reveal the inline editor input.
    await page.getByTestId("register-hex-7").click();
    await expect(page.getByTestId("register-edit-7")).toBeVisible();
    await settle(page);
    await capture(page, "registers-edit.png");
  });

  test("memory-panel: expanded range with bytes", async ({ page }) => {
    // Game of Life has a writable memory page mapped.
    await loadGeneric(page, "game-of-life");
    // Take a few steps so memory has non-zero bytes to show.
    for (let i = 0; i < 30; i++) {
      await page.getByTestId("next-button").click();
      await page.waitForTimeout(20);
    }
    // Expand the first memory range by clicking its header.
    const firstHeader = page
      .locator("[data-testid^='memory-range-header-']")
      .first();
    await firstHeader.click();
    await settle(page);
    await capture(page, "memory-panel.png");
  });
});
