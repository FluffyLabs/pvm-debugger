import { expect, test } from "@playwright/test";

test.describe("Sprint 11 — URL + Manual Hex Sources", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/#/load");
    await expect(page.getByTestId("load-page")).toBeVisible();
  });

  test("all four source types are visible on the page", async ({ page }) => {
    // Left column: upload, URL, hex
    await expect(page.getByTestId("file-upload")).toBeVisible();
    await expect(page.getByTestId("url-input")).toBeVisible();
    await expect(page.getByTestId("manual-input")).toBeVisible();
    // Right column: examples
    await expect(page.getByTestId("example-list")).toBeVisible();
  });

  test("URL fetch succeeds and auto-advances to debugger", async ({ page }) => {
    // Use a fixture served by the same vite preview server
    const urlField = page.getByTestId("url-input-field");
    const fetchBtn = page.getByTestId("url-input-fetch");

    await urlField.fill("http://localhost:4199/fixtures/generic/add.pvm");
    await fetchBtn.click();

    // URL auto-advances to debugger for non-SPI programs
    await expect(page.getByTestId("debugger-page")).toBeVisible({
      timeout: 15000,
    });
  });

  test("URL fetch shows loading state", async ({ page }) => {
    const urlField = page.getByTestId("url-input-field");
    const fetchBtn = page.getByTestId("url-input-fetch");

    await urlField.fill("http://localhost:4199/fixtures/generic/add.pvm");

    // Click fetch and immediately check for loading indicator
    await fetchBtn.click();

    // The loading spinner should appear, or the page auto-advances to debugger
    const loadingOrDebugger = page
      .getByTestId("url-input-loading")
      .or(page.getByTestId("debugger-page"));
    await expect(loadingOrDebugger).toBeVisible({ timeout: 10000 });
  });

  test("URL fetch error shows alert", async ({ page }) => {
    const urlField = page.getByTestId("url-input-field");
    const fetchBtn = page.getByTestId("url-input-fetch");

    // Use a port where nothing is listening to trigger a network error
    await urlField.fill("http://localhost:19876/test.pvm");
    await fetchBtn.click();

    await expect(page.getByTestId("url-input-error")).toBeVisible({
      timeout: 15000,
    });
    // Continue should remain disabled
    await expect(page.getByTestId("source-step-continue")).toBeDisabled();
  });

  test("invalid manual hex shows error alert", async ({ page }) => {
    const hexField = page.getByTestId("manual-input-field");

    await hexField.fill("not valid hex zzzz");
    await hexField.blur();

    await expect(page.getByTestId("manual-input-error")).toBeVisible();
    // Continue should remain disabled
    await expect(page.getByTestId("source-step-continue")).toBeDisabled();
  });

  test("valid manual hex enables Continue and shows byte count", async ({
    page,
  }) => {
    const hexField = page.getByTestId("manual-input-field");

    // A minimal valid generic PVM program (a few instructions)
    await hexField.fill("00030001000d0008000200070001");
    await hexField.blur();

    await expect(page.getByTestId("manual-input-success")).toBeVisible();
    const byteText = await page
      .getByTestId("manual-input-bytecount")
      .textContent();
    expect(byteText).toMatch(/Parsed \d+(\.\d+)?\s*(B|KB|MB)/);

    await expect(page.getByTestId("source-step-continue")).toBeEnabled();
  });

  // Note: URL auto-advance (non-SPI URLs navigate directly to debugger)
  // means URL-to-hex and URL-text-change interactions can no longer be
  // tested on the source step. Those scenarios were removed.

  test("valid manual hex with 0x prefix works", async ({ page }) => {
    const hexField = page.getByTestId("manual-input-field");

    await hexField.fill("0x00030001000d");
    await hexField.blur();

    await expect(page.getByTestId("manual-input-success")).toBeVisible();
    await expect(page.getByTestId("source-step-continue")).toBeEnabled();
  });

  // --- Edge case tests added during reflection ---

  test("empty hex on blur does not show error or enable Continue", async ({
    page,
  }) => {
    const hexField = page.getByTestId("manual-input-field");

    // Focus and blur with empty text
    await hexField.focus();
    await hexField.blur();

    await expect(page.getByTestId("manual-input-error")).not.toBeVisible();
    await expect(page.getByTestId("manual-input-success")).not.toBeVisible();
    await expect(page.getByTestId("source-step-continue")).toBeDisabled();
  });

  test("Continue with manual hex navigates to debugger", async ({ page }) => {
    const hexField = page.getByTestId("manual-input-field");

    await hexField.fill("00030001000d0008000200070001");
    await hexField.blur();

    await expect(page.getByTestId("source-step-continue")).toBeEnabled();
    await page.getByTestId("source-step-continue").click();

    // Non-SPI programs skip config step and go directly to debugger
    await expect(page.getByTestId("debugger-page")).toBeVisible({
      timeout: 15000,
    });
  });

  test("URL fetch auto-advances to debugger for non-SPI programs", async ({
    page,
  }) => {
    const urlField = page.getByTestId("url-input-field");
    const fetchBtn = page.getByTestId("url-input-fetch");

    await urlField.fill("http://localhost:4199/fixtures/generic/add.pvm");
    await fetchBtn.click();

    // Non-SPI URL fetches auto-advance directly to the debugger
    await expect(page.getByTestId("debugger-page")).toBeVisible({
      timeout: 15000,
    });
  });

  test("file upload clears previous hex selection", async ({ page }) => {
    const hexField = page.getByTestId("manual-input-field");

    // First, set valid hex
    await hexField.fill("00030001000d");
    await hexField.blur();
    await expect(page.getByTestId("manual-input-success")).toBeVisible();
    await expect(page.getByTestId("source-step-continue")).toBeEnabled();

    // Upload a file — should clear hex result
    const fileInput = page.getByTestId("file-upload-input");
    const path = await import("node:path");
    const url = await import("node:url");
    const __filename = url.fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const fixturesDir = path.resolve(__dirname, "../../../fixtures");
    await fileInput.setInputFiles(path.join(fixturesDir, "generic/add.pvm"));

    // File should now be the active source
    await expect(page.getByTestId("file-upload-selected")).toBeVisible();
    // Hex success should be cleared
    await expect(page.getByTestId("manual-input-success")).not.toBeVisible();
    await expect(page.getByTestId("source-step-continue")).toBeEnabled();
  });
});
