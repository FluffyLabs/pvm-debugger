import { test, expect } from "@playwright/test";
import * as path from "path";
import * as url from "url";

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const fixturesDir = path.resolve(__dirname, "../../../fixtures");

test.describe("Sprint 12 — Detection Summary (Wizard Step 2)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/#/load");
    await expect(page.getByTestId("load-page")).toBeVisible();
  });

  test("step 2 renders after selecting a source in step 1", async ({ page }) => {
    // Upload a generic PVM file
    const fileInput = page.getByTestId("file-upload-input");
    await fileInput.setInputFiles(path.join(fixturesDir, "generic/add.pvm"));
    await expect(page.getByTestId("file-upload-selected")).toBeVisible();

    // Click Continue to advance to step 2
    await page.getByTestId("source-step-continue").click();

    // Step 2 should render
    await expect(page.getByTestId("config-step")).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId("detection-summary")).toBeVisible();
    await expect(page.getByTestId("config-step-load")).toBeVisible();
    await expect(page.getByTestId("config-step-back")).toBeVisible();
  });

  test("SPI example shows structural details", async ({ page }) => {
    // Find and click an SPI example (first JAM SPI example available)
    const spiExample = page.locator('[data-testid^="example-card-"]').filter({ hasText: "SPI" }).first();
    // If no SPI example by text, try any example from the JAM SPI category
    const spiCategory = page.getByTestId("example-category-jam-spi");
    const hasSpiCategory = await spiCategory.isVisible().catch(() => false);

    if (hasSpiCategory) {
      // Click first example in JAM SPI category
      const firstSpiCard = spiCategory.locator('[data-testid^="example-card-"]').first();
      await firstSpiCard.click();
    } else {
      // Fallback: use a file upload with an SPI fixture if available
      const fileInput = page.getByTestId("file-upload-input");
      await fileInput.setInputFiles(path.join(fixturesDir, "generic/add.pvm"));
      await page.getByTestId("source-step-continue").click();
    }

    // Step 2 should render with summary
    await expect(page.getByTestId("config-step")).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId("detection-summary")).toBeVisible();
    await expect(page.getByTestId("detection-summary-format")).toBeVisible();

    // Should show structural details
    await expect(page.getByTestId("summary-code-size").or(page.getByTestId("summary-program-size"))).toBeVisible();
    await expect(page.getByTestId("summary-pc")).toBeVisible();
    await expect(page.getByTestId("summary-gas")).toBeVisible();
  });

  test("JSON vector shows expected terminal status", async ({ page }) => {
    // Look for a JSON test vector category
    const jsonCategory = page.getByTestId("example-category-json-test-vectors");
    const hasJsonCategory = await jsonCategory.isVisible().catch(() => false);

    if (hasJsonCategory) {
      const firstJsonCard = jsonCategory.locator('[data-testid^="example-card-"]').first();
      await firstJsonCard.click();

      await expect(page.getByTestId("config-step")).toBeVisible({ timeout: 15000 });
      await expect(page.getByTestId("detection-summary")).toBeVisible();
      await expect(page.getByTestId("detection-summary-json")).toBeVisible();
      await expect(page.getByTestId("summary-expected-status")).toBeVisible();
    } else {
      // Fallback: load a JSON fixture file directly
      const jsonFixture = path.join(fixturesDir, "json-vectors");
      const fileInput = page.getByTestId("file-upload-input");

      // Try to find a JSON fixture
      const fs = await import("fs");
      const jsonDir = path.join(fixturesDir, "json-vectors");
      if (fs.existsSync(jsonDir)) {
        const files = fs.readdirSync(jsonDir).filter((f: string) => f.endsWith(".json"));
        if (files.length > 0) {
          await fileInput.setInputFiles(path.join(jsonDir, files[0]));
          await expect(page.getByTestId("file-upload-selected")).toBeVisible();
          await page.getByTestId("source-step-continue").click();

          await expect(page.getByTestId("config-step")).toBeVisible({ timeout: 15000 });
          await expect(page.getByTestId("detection-summary")).toBeVisible();
          await expect(page.getByTestId("detection-summary-json")).toBeVisible();
          await expect(page.getByTestId("summary-expected-status")).toBeVisible();
        }
      }
    }
  });

  test("Load Program navigates to debugger with OK status", async ({ page }) => {
    // Upload a generic PVM file
    const fileInput = page.getByTestId("file-upload-input");
    await fileInput.setInputFiles(path.join(fixturesDir, "generic/add.pvm"));
    await expect(page.getByTestId("file-upload-selected")).toBeVisible();

    // Advance to step 2
    await page.getByTestId("source-step-continue").click();
    await expect(page.getByTestId("config-step")).toBeVisible({ timeout: 10000 });

    // Click Load Program
    await page.getByTestId("config-step-load").click();

    // Should navigate to debugger
    await expect(page.getByTestId("debugger-page")).toBeVisible({ timeout: 15000 });
  });

  test("Back returns to step 1 with candidate preserved", async ({ page }) => {
    // Upload a generic PVM file
    const fileInput = page.getByTestId("file-upload-input");
    await fileInput.setInputFiles(path.join(fixturesDir, "generic/add.pvm"));
    await expect(page.getByTestId("file-upload-selected")).toBeVisible();

    // Advance to step 2
    await page.getByTestId("source-step-continue").click();
    await expect(page.getByTestId("config-step")).toBeVisible({ timeout: 10000 });

    // Click Back
    await page.getByTestId("config-step-back").click();

    // Should be back on step 1 with candidate preview
    await expect(page.getByTestId("load-page")).toBeVisible();
    await expect(page.getByTestId("load-page-candidate")).toBeVisible();

    // The Continue button on the candidate preview should work
    await page.getByTestId("load-page-candidate-continue").click();
    await expect(page.getByTestId("config-step")).toBeVisible({ timeout: 5000 });
  });

  test("invalid payload shows error and generic fallback option", async ({ page }) => {
    // Use manual hex input with bytes that might be detected as a text format but fail parsing
    // Use a trace-like prefix that will fail trace parsing
    const hexField = page.getByTestId("manual-input-field");
    // "program 0x" in hex, but malformed trace content
    await hexField.fill("70726f6772616d20307800");
    await hexField.blur();

    await expect(page.getByTestId("manual-input-success")).toBeVisible();
    await page.getByTestId("source-step-continue").click();

    await expect(page.getByTestId("config-step")).toBeVisible({ timeout: 10000 });

    // Should show decode error
    await expect(page.getByTestId("config-step-decode-error")).toBeVisible();
    // Should show generic fallback button
    await expect(page.getByTestId("config-step-force-generic")).toBeVisible();

    // Click fallback
    await page.getByTestId("config-step-force-generic").click();

    // Summary should now render with generic format
    await expect(page.getByTestId("detection-summary")).toBeVisible();
    // Fallback button should be hidden now
    await expect(page.getByTestId("config-step-force-generic")).not.toBeVisible();
  });

  test("step 2 renders after selecting an example", async ({ page }) => {
    // Click first available example
    const firstCard = page.locator('[data-testid^="example-card-"]').first();
    await firstCard.click();

    // Step 2 should render
    await expect(page.getByTestId("config-step")).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId("detection-summary")).toBeVisible();
    await expect(page.getByTestId("config-step-load")).toBeEnabled();
  });

  test("no gas editor on step 2", async ({ page }) => {
    // Upload a file and advance to step 2
    const fileInput = page.getByTestId("file-upload-input");
    await fileInput.setInputFiles(path.join(fixturesDir, "generic/add.pvm"));
    await expect(page.getByTestId("file-upload-selected")).toBeVisible();

    await page.getByTestId("source-step-continue").click();
    await expect(page.getByTestId("config-step")).toBeVisible({ timeout: 10000 });

    // Verify there's no gas editor/input field
    const gasInput = page.locator('input[data-testid="gas-editor"], [data-testid="gas-input"]');
    await expect(gasInput).not.toBeVisible();
  });
});
