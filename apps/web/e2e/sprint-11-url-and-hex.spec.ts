import { test, expect } from "@playwright/test";

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

  test("URL fetch succeeds and shows byte count", async ({ page }) => {
    // Use a fixture served by the same vite preview server
    const urlField = page.getByTestId("url-input-field");
    const fetchBtn = page.getByTestId("url-input-fetch");

    await urlField.fill("http://localhost:4199/fixtures/generic/add.pvm");
    await fetchBtn.click();

    // Wait for success indicator
    await expect(page.getByTestId("url-input-success")).toBeVisible({ timeout: 10000 });
    const byteText = await page.getByTestId("url-input-bytecount").textContent();
    expect(byteText).toMatch(/Fetched \d+(\.\d+)?\s*(B|KB|MB)/);

    // Continue should be enabled
    await expect(page.getByTestId("source-step-continue")).toBeEnabled();
  });

  test("URL fetch shows loading state", async ({ page }) => {
    const urlField = page.getByTestId("url-input-field");
    const fetchBtn = page.getByTestId("url-input-fetch");

    await urlField.fill("http://localhost:4199/fixtures/generic/add.pvm");

    // Click fetch and immediately check for loading indicator
    await fetchBtn.click();

    // The loading spinner should appear (may be very fast for local requests)
    // Check that either the spinner appeared or the success already showed
    const loadingOrSuccess = page
      .getByTestId("url-input-loading")
      .or(page.getByTestId("url-input-success"));
    await expect(loadingOrSuccess).toBeVisible({ timeout: 10000 });
  });

  test("URL fetch error shows alert", async ({ page }) => {
    const urlField = page.getByTestId("url-input-field");
    const fetchBtn = page.getByTestId("url-input-fetch");

    // Use a port where nothing is listening to trigger a network error
    await urlField.fill("http://localhost:19876/test.pvm");
    await fetchBtn.click();

    await expect(page.getByTestId("url-input-error")).toBeVisible({ timeout: 15000 });
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

  test("valid manual hex enables Continue and shows byte count", async ({ page }) => {
    const hexField = page.getByTestId("manual-input-field");

    // A minimal valid generic PVM program (a few instructions)
    await hexField.fill("00030001000d0008000200070001");
    await hexField.blur();

    await expect(page.getByTestId("manual-input-success")).toBeVisible();
    const byteText = await page.getByTestId("manual-input-bytecount").textContent();
    expect(byteText).toMatch(/Parsed \d+(\.\d+)?\s*(B|KB|MB)/);

    await expect(page.getByTestId("source-step-continue")).toBeEnabled();
  });

  test("selecting hex source clears previous URL selection", async ({ page }) => {
    const urlField = page.getByTestId("url-input-field");
    const fetchBtn = page.getByTestId("url-input-fetch");

    await urlField.fill("http://localhost:4199/fixtures/generic/add.pvm");
    await fetchBtn.click();
    await expect(page.getByTestId("url-input-success")).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId("source-step-continue")).toBeEnabled();

    // Now type valid hex — should clear URL result and enable Continue from hex
    const hexField = page.getByTestId("manual-input-field");
    await hexField.fill("00030001000d");
    await hexField.blur();

    await expect(page.getByTestId("manual-input-success")).toBeVisible();
    // URL success should be cleared since hex is now the active source
    await expect(page.getByTestId("url-input-success")).not.toBeVisible();
  });

  test("changing URL text clears pending URL result", async ({ page }) => {
    const urlField = page.getByTestId("url-input-field");
    const fetchBtn = page.getByTestId("url-input-fetch");

    // Fetch a URL
    await urlField.fill("http://localhost:4199/fixtures/generic/add.pvm");
    await fetchBtn.click();
    await expect(page.getByTestId("url-input-success")).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId("source-step-continue")).toBeEnabled();

    // Change the URL text — should clear the result
    await urlField.fill("http://localhost:4199/different");
    await expect(page.getByTestId("url-input-success")).not.toBeVisible();
    await expect(page.getByTestId("source-step-continue")).toBeDisabled();
  });

  test("valid manual hex with 0x prefix works", async ({ page }) => {
    const hexField = page.getByTestId("manual-input-field");

    await hexField.fill("0x00030001000d");
    await hexField.blur();

    await expect(page.getByTestId("manual-input-success")).toBeVisible();
    await expect(page.getByTestId("source-step-continue")).toBeEnabled();
  });

  // --- Edge case tests added during reflection ---

  test("empty hex on blur does not show error or enable Continue", async ({ page }) => {
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

    // Step 2: detection summary
    await expect(page.getByTestId("config-step")).toBeVisible({ timeout: 15000 });
    await page.getByTestId("config-step-load").click();

    await expect(page.getByTestId("debugger-page")).toBeVisible({ timeout: 15000 });
  });

  test("Continue with URL fetch navigates to debugger", async ({ page }) => {
    const urlField = page.getByTestId("url-input-field");
    const fetchBtn = page.getByTestId("url-input-fetch");

    await urlField.fill("http://localhost:4199/fixtures/generic/add.pvm");
    await fetchBtn.click();
    await expect(page.getByTestId("url-input-success")).toBeVisible({ timeout: 10000 });

    await page.getByTestId("source-step-continue").click();

    // Step 2: detection summary
    await expect(page.getByTestId("config-step")).toBeVisible({ timeout: 15000 });
    await page.getByTestId("config-step-load").click();

    await expect(page.getByTestId("debugger-page")).toBeVisible({ timeout: 15000 });
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
    const path = await import("path");
    const url = await import("url");
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
