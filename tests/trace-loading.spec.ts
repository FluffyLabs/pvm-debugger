import { test, expect } from "@playwright/test";
import { FIXTURES, getFixturePath } from "./utils/fixtures";

test.describe("Trace file loading", () => {
  test("should load io-trace-output.log without crashing", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.evaluate(() => window.localStorage.clear());

    const fileInput = page.locator('input[type="file"]');
    const tracePath = getFixturePath(FIXTURES.IO_TRACE_OUTPUT);

    await fileInput.setInputFiles(tracePath);

    // Wait for load button to be ready instead of fixed timeout
    const loadButton = page.getByTestId("load-button");
    await expect(loadButton).toBeVisible({ timeout: 5000 });
    await expect(loadButton).toBeEnabled({ timeout: 5000 });

    await loadButton.click();

    // Wait for program status or error boundary with race condition
    const programStatus = page.getByTestId("program-status");
    const errorBoundary = page.locator("text=Something went wrong");

    // Wait for either the program to load or an error to appear
    await Promise.race([
      expect(programStatus).toBeVisible({ timeout: 10000 }),
      expect(errorBoundary).toBeVisible({ timeout: 10000 }),
    ]);

    // Check if error boundary appeared
    const hasError = await errorBoundary.isVisible().catch(() => false);
    if (hasError) {
      const errorMessage = await page.locator("pre").first().textContent();
      console.error("Error boundary caught after load:", errorMessage);
      throw new Error(`App crashed after load with error: ${errorMessage}`);
    }

    // Verify program status is visible
    await expect(programStatus).toBeVisible();
  });

  test("should run io-trace-output.log program without crashing", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.evaluate(() => window.localStorage.clear());

    const fileInput = page.locator('input[type="file"]');
    const tracePath = getFixturePath(FIXTURES.IO_TRACE_OUTPUT);

    await fileInput.setInputFiles(tracePath);

    // Wait for load button to be ready
    const loadButton = page.getByTestId("load-button");
    await expect(loadButton).toBeVisible({ timeout: 5000 });
    await loadButton.click();

    // Wait for program status to appear
    const programStatus = page.getByTestId("program-status");
    await expect(programStatus).toBeVisible({ timeout: 10000 });

    // Now click Run
    const runButton = page.getByRole("button", { name: "Run" });
    await expect(runButton).toBeVisible({ timeout: 5000 });
    await runButton.click();

    // Wait for either host call dialog, program status, or error boundary
    const hostCallDialog = page.locator('[role="dialog"]');
    const errorBoundary = page.locator("text=Something went wrong");

    await Promise.race([
      expect(hostCallDialog).toBeVisible({ timeout: 10000 }),
      expect(errorBoundary).toBeVisible({ timeout: 10000 }),
      expect(programStatus).toBeVisible({ timeout: 10000 }),
    ]);

    // Check for errors
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

    // Program should either be showing host call dialog or program status
    const isDialogVisible = await hostCallDialog.isVisible().catch(() => false);
    if (!isDialogVisible) {
      // If no dialog, program should have finished or be in some valid state
      await expect(programStatus).toBeVisible();
    }
  });
});
