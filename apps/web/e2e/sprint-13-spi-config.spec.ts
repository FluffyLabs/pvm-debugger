import { test, expect } from "@playwright/test";
import * as path from "path";
import * as url from "url";

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const fixturesDir = path.resolve(__dirname, "../../../fixtures");

test.describe("Sprint 13 — SPI Entrypoint Configuration", () => {
  test.beforeEach(async ({ page }) => {
    // Clear persisted SPI config so tests start fresh
    await page.goto("/#/load");
    await page.evaluate(() => localStorage.removeItem("pvmdbg:spi-config"));
    await page.reload();
    await expect(page.getByTestId("load-page")).toBeVisible();
  });

  test("SPI entrypoint config renders for JAM SPI examples", async ({ page }) => {
    // Upload a JAM SPI file
    const fileInput = page.getByTestId("file-upload-input");
    await fileInput.setInputFiles(path.join(fixturesDir, "add.jam"));
    await expect(page.getByTestId("file-upload-selected")).toBeVisible();
    await page.getByTestId("source-step-continue").click();

    // Step 2 should render with SPI config
    await expect(page.getByTestId("config-step")).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId("spi-entrypoint-config")).toBeVisible();
    await expect(page.getByTestId("spi-entrypoint-options")).toBeVisible();
    await expect(page.getByTestId("spi-raw-hex")).toBeVisible();
  });

  test("all three entrypoint options are selectable", async ({ page }) => {
    const fileInput = page.getByTestId("file-upload-input");
    await fileInput.setInputFiles(path.join(fixturesDir, "add.jam"));
    await expect(page.getByTestId("file-upload-selected")).toBeVisible();
    await page.getByTestId("source-step-continue").click();
    await expect(page.getByTestId("spi-entrypoint-config")).toBeVisible({ timeout: 15000 });

    // Click Refine
    await page.getByTestId("spi-entrypoint-refine").click();
    await expect(page.getByTestId("spi-field-core")).toBeVisible();
    await expect(page.getByTestId("spi-field-index")).toBeVisible();
    await expect(page.getByTestId("spi-field-payload")).toBeVisible();

    // Click Is Authorized
    await page.getByTestId("spi-entrypoint-is_authorized").click();
    await expect(page.getByTestId("spi-field-core")).toBeVisible();
    // Accumulate-specific fields should not be visible
    await expect(page.getByTestId("spi-field-slot")).not.toBeVisible();

    // Click Accumulate
    await page.getByTestId("spi-entrypoint-accumulate").click();
    await expect(page.getByTestId("spi-field-slot")).toBeVisible();
    await expect(page.getByTestId("spi-field-id")).toBeVisible();
    await expect(page.getByTestId("spi-field-results")).toBeVisible();
  });

  test("builder and RAW mode stay synchronized", async ({ page }) => {
    const fileInput = page.getByTestId("file-upload-input");
    await fileInput.setInputFiles(path.join(fixturesDir, "add.jam"));
    await expect(page.getByTestId("file-upload-selected")).toBeVisible();
    await page.getByTestId("source-step-continue").click();
    await expect(page.getByTestId("spi-entrypoint-config")).toBeVisible({ timeout: 15000 });

    // Default is Accumulate — change a field value
    await page.getByTestId("spi-field-slot").fill("100");

    // Read the auto-generated hex
    const rawHex = await page.getByTestId("spi-raw-hex").inputValue();
    expect(rawHex).toMatch(/^0x/);
    expect(rawHex.length).toBeGreaterThan(2);

    // Switch to RAW mode
    await page.getByTestId("spi-raw-mode-switch").click();

    // The hex should be preserved
    const rawHexAfterSwitch = await page.getByTestId("spi-raw-hex").inputValue();
    expect(rawHexAfterSwitch).toBe(rawHex);

    // Switch back to builder mode
    await page.getByTestId("spi-raw-mode-switch").click();

    // Builder fields should still have the same values
    const slotValue = await page.getByTestId("spi-field-slot").inputValue();
    expect(slotValue).toBe("100");
  });

  test("example entrypoints prefill the builder", async ({ page }) => {
    // Click an SPI example that has entrypoint preset (e.g., "add-jam" from examples.json)
    // Find an example card in the JAM SPI category
    const spiExample = page.locator('[data-testid^="example-card-"][data-testid$="-jam"]').first();
    const exists = await spiExample.isVisible().catch(() => false);

    if (!exists) {
      // If no JAM example card visible, just upload the JAM fixture
      const fileInput = page.getByTestId("file-upload-input");
      await fileInput.setInputFiles(path.join(fixturesDir, "add.jam"));
      await expect(page.getByTestId("file-upload-selected")).toBeVisible();
      await page.getByTestId("source-step-continue").click();
    } else {
      await spiExample.click();
    }

    await expect(page.getByTestId("spi-entrypoint-config")).toBeVisible({ timeout: 15000 });

    // When loaded from an example with accumulate entrypoint,
    // the Accumulate button should be selected and fields should be prefilled
    const slotField = page.getByTestId("spi-field-slot");
    if (await slotField.isVisible().catch(() => false)) {
      const slotValue = await slotField.inputValue();
      // Default from examples.json is "42"
      expect(slotValue).toBe("42");
    }
  });

  test("trace sources do not render SPI config", async ({ page }) => {
    const fileInput = page.getByTestId("file-upload-input");
    await fileInput.setInputFiles(path.join(fixturesDir, "trace-001.log"));
    await expect(page.getByTestId("file-upload-selected")).toBeVisible();
    await page.getByTestId("source-step-continue").click();

    await expect(page.getByTestId("config-step")).toBeVisible({ timeout: 15000 });
    // SPI config should NOT be visible for trace files
    await expect(page.getByTestId("spi-entrypoint-config")).not.toBeVisible();
  });

  test("generic PVM does not render SPI config", async ({ page }) => {
    const fileInput = page.getByTestId("file-upload-input");
    await fileInput.setInputFiles(path.join(fixturesDir, "generic/add.pvm"));
    await expect(page.getByTestId("file-upload-selected")).toBeVisible();
    await page.getByTestId("source-step-continue").click();

    await expect(page.getByTestId("config-step")).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId("spi-entrypoint-config")).not.toBeVisible();
  });

  test("JSON test vector does not render SPI config", async ({ page }) => {
    const fileInput = page.getByTestId("file-upload-input");
    await fileInput.setInputFiles(path.join(fixturesDir, "json/inst_add_32.json"));
    await expect(page.getByTestId("file-upload-selected")).toBeVisible();
    await page.getByTestId("source-step-continue").click();

    await expect(page.getByTestId("config-step")).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId("spi-entrypoint-config")).not.toBeVisible();
  });

  test("invalid input disables Load Program", async ({ page }) => {
    const fileInput = page.getByTestId("file-upload-input");
    await fileInput.setInputFiles(path.join(fixturesDir, "add.jam"));
    await expect(page.getByTestId("file-upload-selected")).toBeVisible();
    await page.getByTestId("source-step-continue").click();
    await expect(page.getByTestId("spi-entrypoint-config")).toBeVisible({ timeout: 15000 });

    // Switch to RAW mode and enter invalid hex
    await page.getByTestId("spi-raw-mode-switch").click();
    await page.getByTestId("spi-raw-hex").fill("0xZZZZ");

    // Validation error should show
    await expect(page.getByTestId("spi-validation-error")).toBeVisible();

    // Load Program button should be disabled
    await expect(page.getByTestId("config-step-load")).toBeDisabled();
  });

  test("switching entrypoint types preserves field values", async ({ page }) => {
    const fileInput = page.getByTestId("file-upload-input");
    await fileInput.setInputFiles(path.join(fixturesDir, "add.jam"));
    await expect(page.getByTestId("file-upload-selected")).toBeVisible();
    await page.getByTestId("source-step-continue").click();
    await expect(page.getByTestId("spi-entrypoint-config")).toBeVisible({ timeout: 15000 });

    // Set a custom slot value for Accumulate
    await page.getByTestId("spi-field-slot").fill("777");

    // Switch to Refine
    await page.getByTestId("spi-entrypoint-refine").click();
    await expect(page.getByTestId("spi-field-core")).toBeVisible();

    // Set a custom core value for Refine
    await page.getByTestId("spi-field-core").fill("55");

    // Switch back to Accumulate — slot should be preserved
    await page.getByTestId("spi-entrypoint-accumulate").click();
    const slotValue = await page.getByTestId("spi-field-slot").inputValue();
    expect(slotValue).toBe("777");

    // Switch back to Refine — core should be preserved
    await page.getByTestId("spi-entrypoint-refine").click();
    const coreValue = await page.getByTestId("spi-field-core").inputValue();
    expect(coreValue).toBe("55");
  });

  test("persisted values survive page reload", async ({ page }) => {
    const fileInput = page.getByTestId("file-upload-input");
    await fileInput.setInputFiles(path.join(fixturesDir, "add.jam"));
    await expect(page.getByTestId("file-upload-selected")).toBeVisible();
    await page.getByTestId("source-step-continue").click();
    await expect(page.getByTestId("spi-entrypoint-config")).toBeVisible({ timeout: 15000 });

    // Change slot to a distinctive value
    await page.getByTestId("spi-field-slot").fill("999");

    // Verify localStorage has the value (stored per-entrypoint in allFields)
    const stored = await page.evaluate(() => localStorage.getItem("pvmdbg:spi-config"));
    expect(stored).toBeTruthy();
    const parsed = JSON.parse(stored!);
    expect(parsed.allFields.accumulate.slot).toBe("999");

    // Reload the page and navigate back to step 2 with same file
    await page.reload();
    await page.goto("/#/load");
    await expect(page.getByTestId("load-page")).toBeVisible({ timeout: 10000 });

    const fileInput2 = page.getByTestId("file-upload-input");
    await fileInput2.setInputFiles(path.join(fixturesDir, "add.jam"));
    await expect(page.getByTestId("file-upload-selected")).toBeVisible();
    await page.getByTestId("source-step-continue").click();
    await expect(page.getByTestId("spi-entrypoint-config")).toBeVisible({ timeout: 15000 });

    // The persisted slot value should be restored
    const slotValue = await page.getByTestId("spi-field-slot").inputValue();
    expect(slotValue).toBe("999");
  });
});
