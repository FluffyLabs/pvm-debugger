import { test, expect } from "@playwright/test";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test.describe("Trace file loading", () => {
  test("should load io-trace-output.log without crashing", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.evaluate(() => window.localStorage.clear());

    const fileInput = page.locator('input[type="file"]');
    const tracePath = path.join(__dirname, "../io-trace-output.log");

    await fileInput.setInputFiles(tracePath);

    await page.waitForTimeout(2000);

    const loadButton = page.getByTestId("load-button");
    await expect(loadButton).toBeVisible({ timeout: 5000 });
    await expect(loadButton).toBeEnabled({ timeout: 5000 });

    await loadButton.click();

    await page.waitForTimeout(3000);

    const errorBoundary = page.locator("text=Something went wrong");
    let hasError = await errorBoundary.isVisible().catch(() => false);

    if (hasError) {
      const errorMessage = await page.locator("pre").first().textContent();
      console.error("Error boundary caught after load:", errorMessage);
      throw new Error(`App crashed after load with error: ${errorMessage}`);
    }

    const programStatus = page.getByTestId("program-status");
    await expect(programStatus).toBeVisible({ timeout: 10000 });
  });

  test("should run io-trace-output.log program without crashing", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.evaluate(() => window.localStorage.clear());

    const fileInput = page.locator('input[type="file"]');
    const tracePath = path.join(__dirname, "../io-trace-output.log");

    await fileInput.setInputFiles(tracePath);
    await page.waitForTimeout(2000);

    const loadButton = page.getByTestId("load-button");
    await loadButton.click();
    await page.waitForTimeout(3000);

    const programStatus = page.getByTestId("program-status");
    await expect(programStatus).toBeVisible({ timeout: 10000 });

    // Now click Run
    const runButton = page.getByRole("button", { name: "Run" });
    await expect(runButton).toBeVisible({ timeout: 5000 });
    await runButton.click();

    // Wait and check for errors
    await page.waitForTimeout(10000);

    const errorBoundary = page.locator("text=Something went wrong");
    const hasError = await errorBoundary.isVisible().catch(() => false);

    if (hasError) {
      const errorMessage = await page.locator("pre").first().textContent();
      const stackTrace = await page
        .locator("pre")
        .nth(1)
        .textContent()
        .catch(() => "");
      console.error("Error boundary caught after Run:", errorMessage);
      console.error("Stack trace:", stackTrace);
      throw new Error(`App crashed after Run with error: ${errorMessage}`);
    }

    // Program should either be running, halted, or showing host call dialog
    const hostCallDialog = page.locator('[role="dialog"]');
    const isDialogVisible = await hostCallDialog.isVisible().catch(() => false);

    if (!isDialogVisible) {
      // If no dialog, program should have finished or be in some valid state
      await expect(programStatus).toBeVisible();
    }
  });
});
