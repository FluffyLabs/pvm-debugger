import * as path from "node:path";
import * as url from "node:url";
import { expect, test } from "@playwright/test";

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const fixturesDir = path.resolve(__dirname, "../../../fixtures");

test.describe("Sprint 12 — Detection Summary (Wizard Step 2)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/#/load");
    await expect(page.getByTestId("load-page")).toBeVisible();
  });

  test("step 2 renders after selecting a source in step 1", async ({
    page,
  }) => {
    // Upload an SPI file (non-SPI programs skip config step)
    const fileInput = page.getByTestId("file-upload-input");
    await fileInput.setInputFiles(path.join(fixturesDir, "add.jam"));
    await expect(page.getByTestId("file-upload-selected")).toBeVisible();

    // Click Continue to advance to step 2
    await page.getByTestId("source-step-continue").click();

    // Step 2 should render
    await expect(page.getByTestId("config-step")).toBeVisible({
      timeout: 10000,
    });
    await expect(page.getByTestId("detection-summary")).toBeVisible();
    await expect(page.getByTestId("config-step-load")).toBeVisible();
    await expect(page.getByTestId("config-step-back")).toBeVisible();
  });

  test("SPI example shows structural details and jump table count", async ({
    page,
  }) => {
    // Upload an SPI fixture file directly
    const fileInput = page.getByTestId("file-upload-input");
    await fileInput.setInputFiles(path.join(fixturesDir, "add.jam"));
    await expect(page.getByTestId("file-upload-selected")).toBeVisible();
    await page.getByTestId("source-step-continue").click();

    // Step 2 should render with SPI-specific summary
    await expect(page.getByTestId("config-step")).toBeVisible({
      timeout: 15000,
    });
    await expect(page.getByTestId("detection-summary")).toBeVisible();
    await expect(page.getByTestId("detection-summary-spi")).toBeVisible();

    // Should show SPI structural details
    await expect(page.getByTestId("summary-code-size")).toBeVisible();
    await expect(page.getByTestId("summary-binary-size")).toBeVisible();
    await expect(page.getByTestId("summary-jump-table")).toBeVisible();
    await expect(page.getByTestId("summary-memory")).toBeVisible();
    await expect(page.getByTestId("summary-pc")).toBeVisible();
    await expect(page.getByTestId("summary-gas")).toBeVisible();
    await expect(page.getByTestId("summary-registers")).toBeVisible();
  });

  test("JSON vector skips config step and loads directly into debugger", async ({
    page,
  }) => {
    // Upload a JSON test vector fixture directly
    const fileInput = page.getByTestId("file-upload-input");
    await fileInput.setInputFiles(
      path.join(fixturesDir, "json/inst_add_32.json"),
    );
    await expect(page.getByTestId("file-upload-selected")).toBeVisible();
    await page.getByTestId("source-step-continue").click();

    // Non-SPI programs skip config step and go directly to debugger
    await expect(page.getByTestId("debugger-page")).toBeVisible({
      timeout: 15000,
    });
  });

  test("trace file skips config step and loads directly into debugger", async ({
    page,
  }) => {
    // Upload a trace fixture file
    const fileInput = page.getByTestId("file-upload-input");
    await fileInput.setInputFiles(path.join(fixturesDir, "trace-001.log"));
    await expect(page.getByTestId("file-upload-selected")).toBeVisible();
    await page.getByTestId("source-step-continue").click();

    // Non-SPI programs skip config step and go directly to debugger
    await expect(page.getByTestId("debugger-page")).toBeVisible({
      timeout: 15000,
    });
  });

  test("Load Program navigates to debugger with OK status", async ({
    page,
  }) => {
    // Upload an SPI file (non-SPI programs skip config step)
    const fileInput = page.getByTestId("file-upload-input");
    await fileInput.setInputFiles(path.join(fixturesDir, "add.jam"));
    await expect(page.getByTestId("file-upload-selected")).toBeVisible();

    // Advance to step 2
    await page.getByTestId("source-step-continue").click();
    await expect(page.getByTestId("config-step")).toBeVisible({
      timeout: 10000,
    });

    // Click Load Program
    await page.getByTestId("config-step-load").click();

    // Should navigate to debugger
    await expect(page.getByTestId("debugger-page")).toBeVisible({
      timeout: 15000,
    });
  });

  test("Back returns to step 1 with candidate preserved", async ({ page }) => {
    // Upload an SPI file (non-SPI programs skip config step)
    const fileInput = page.getByTestId("file-upload-input");
    await fileInput.setInputFiles(path.join(fixturesDir, "add.jam"));
    await expect(page.getByTestId("file-upload-selected")).toBeVisible();

    // Advance to step 2
    await page.getByTestId("source-step-continue").click();
    await expect(page.getByTestId("config-step")).toBeVisible({
      timeout: 10000,
    });

    // Click Back
    await page.getByTestId("config-step-back").click();

    // Should be back on step 1 with candidate preview
    await expect(page.getByTestId("load-page")).toBeVisible();
    await expect(page.getByTestId("load-page-candidate")).toBeVisible();

    // The Continue button on the candidate preview should work
    await page.getByTestId("load-page-candidate-continue").click();
    await expect(page.getByTestId("config-step")).toBeVisible({
      timeout: 5000,
    });
  });

  test("invalid payload shows error and generic fallback option", async ({
    page,
  }) => {
    // Use manual hex input with bytes that might be detected as a text format but fail parsing
    // Use a trace-like prefix that will fail trace parsing
    const hexField = page.getByTestId("manual-input-field");
    // "program 0x" in hex, but malformed trace content
    await hexField.fill("70726f6772616d20307800");
    await hexField.blur();

    await expect(page.getByTestId("manual-input-success")).toBeVisible();
    await page.getByTestId("source-step-continue").click();

    await expect(page.getByTestId("config-step")).toBeVisible({
      timeout: 10000,
    });

    // Should show decode error
    await expect(page.getByTestId("config-step-decode-error")).toBeVisible();
    // Should show generic fallback button
    await expect(page.getByTestId("config-step-force-generic")).toBeVisible();

    // Click fallback
    await page.getByTestId("config-step-force-generic").click();

    // Summary should now render with generic format
    await expect(page.getByTestId("detection-summary")).toBeVisible();
    // Fallback button should be hidden now
    await expect(
      page.getByTestId("config-step-force-generic"),
    ).not.toBeVisible();
  });

  test("step 2 renders after selecting an SPI example", async ({ page }) => {
    // Click a JAM SPI example (non-SPI programs skip config step)
    // WAT category is collapsed by default, expand it
    await page.getByTestId("category-toggle-wat").click();
    const card = page.getByTestId("example-card-add-jam");
    await card.click();

    // Step 2 should render
    await expect(page.getByTestId("config-step")).toBeVisible({
      timeout: 15000,
    });
    await expect(page.getByTestId("detection-summary")).toBeVisible();
    await expect(page.getByTestId("config-step-load")).toBeEnabled();
  });

  test("no gas editor on step 2", async ({ page }) => {
    // Upload an SPI file (non-SPI programs skip config step)
    const fileInput = page.getByTestId("file-upload-input");
    await fileInput.setInputFiles(path.join(fixturesDir, "add.jam"));
    await expect(page.getByTestId("file-upload-selected")).toBeVisible();

    await page.getByTestId("source-step-continue").click();
    await expect(page.getByTestId("config-step")).toBeVisible({
      timeout: 10000,
    });

    // Verify there's no gas editor/input field
    const gasInput = page.locator(
      'input[data-testid="gas-editor"], [data-testid="gas-input"]',
    );
    await expect(gasInput).not.toBeVisible();
  });
});
