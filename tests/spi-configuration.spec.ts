import { test, expect } from "@playwright/test";
import { openDebugger, openProgram, selectPVM } from "./utils/actions";

test("GoL example loads and SPI configuration works", async ({ page }) => {
  await openDebugger(page);
  await selectPVM(page, "@typeberry");

  // Load the GoL (JAM-SDK) example
  await openProgram(page, "gol-sdk");

  // Wait for entrypoint selection dialog to appear
  await page.waitForTimeout(1000);

  // Wait for Load button to be visible and enabled, then click it
  const loadButton = page.locator("button#load-button");
  await loadButton.waitFor({ state: "visible", timeout: 5000 });
  await expect(loadButton).toBeEnabled();
  await loadButton.click();

  // Wait for the program loader dialog to close
  await page.waitForTimeout(2000);

  // Verify program loader dialog is no longer visible
  // Wait for navigation back to main view
  await page.waitForURL("/", { timeout: 10000 });

  // Wait a bit more for state to settle
  await page.waitForTimeout(1000);

  // Verify that the settings cog shows the SPI indicator (blue dot)
  const settingsButton = page.locator("button.cursor-pointer:has(svg)").first();
  const spiIndicator = page.locator("span.bg-blue-500");
  await expect(spiIndicator).toBeVisible();

  // Click settings button to open settings dialog
  await settingsButton.click();

  // Wait for settings dialog to open
  await page.waitForSelector('[role="dialog"]');

  // Verify "JAM SPI arguments" section is visible
  const spiArgsLabel = page.locator("text=JAM SPI arguments");
  await expect(spiArgsLabel).toBeVisible();

  // Find and click the "Configure" button
  const configureButton = page.locator('button:has-text("Configure")');
  await expect(configureButton).toBeVisible();
  await configureButton.click();

  // Wait for SPI config dialog to open
  await page.waitForTimeout(500);

  // Verify entrypoint selector is visible
  const entrypointHeader = page.locator("text=Select Entrypoint");
  await expect(entrypointHeader).toBeVisible();

  // Verify default entrypoint is "Accumulate"
  const accumulateOption = page.locator('div:has-text("Accumulate")');
  await expect(accumulateOption).toBeVisible();

  // Click on "Refine" entrypoint
  const refineOption = page.locator('div:has-text("Refine")').first();
  await refineOption.click();

  // Wait for parameters to update
  await page.waitForTimeout(500);

  // Verify Refine parameters are visible
  const coreLabel = page.locator("text=Core");
  await expect(coreLabel).toBeVisible();

  // Change core parameter value
  const coreInput = page.locator("input#refine-core");
  await coreInput.fill("5");

  // Wait for auto-encoding
  await page.waitForTimeout(500);

  // Verify SPI Arguments field is auto-filled
  const spiArgsInput = page.locator("input#spi-args");
  const spiArgsValue = await spiArgsInput.inputValue();
  expect(spiArgsValue).toBeTruthy();
  expect(spiArgsValue.startsWith("0x")).toBeTruthy();

  // Click Apply button
  const applyButton = page.locator('button:has-text("Apply")');
  await applyButton.click();

  // Wait for dialog to close
  await page.waitForTimeout(500);

  // Verify we're back at the settings dialog
  await expect(spiArgsLabel).toBeVisible();

  // Verify the SPI arguments input field is updated
  const settingsSpiArgsInput = page.locator('input[placeholder*="0x-prefixed"]');
  const updatedSpiArgs = await settingsSpiArgsInput.inputValue();
  expect(updatedSpiArgs).toBe(spiArgsValue);

  // Close settings dialog
  await page.keyboard.press("Escape");

  // Verify indicator is still visible after closing
  await expect(spiIndicator).toBeVisible();
});

test("Manual mode allows direct PC and SPI args editing", async ({ page }) => {
  await openDebugger(page);
  await selectPVM(page, "@typeberry");

  // Load the GoL example
  await openProgram(page, "gol-sdk");

  // Wait for entrypoint selection dialog and load the program
  await page.waitForTimeout(1000);
  const loadButton = page.locator("button#load-button");
  await loadButton.waitFor({ state: "visible", timeout: 5000 });
  await expect(loadButton).toBeEnabled();
  await loadButton.click();
  await page.waitForTimeout(3000);

  // Open settings
  const settingsButton = page.locator("button.cursor-pointer:has(svg)").first();
  await settingsButton.click();
  await page.waitForSelector('[role="dialog"]');

  // Click Configure button
  const configureButton = page.locator('button:has-text("Configure")');
  await configureButton.click();
  await page.waitForTimeout(500);

  // Toggle to manual mode using the RAW switch
  const rawSwitch = page.locator('button[role="switch"]');
  await rawSwitch.click();

  // Wait for manual mode UI
  await page.waitForTimeout(500);

  // Verify Manual Configuration header is visible
  const manualHeader = page.locator("text=Manual Configuration");
  await expect(manualHeader).toBeVisible();

  // Verify Program Counter input is visible
  const pcInput = page.locator("input#manual-pc");
  await expect(pcInput).toBeVisible();

  // Change PC value
  await pcInput.fill("10");

  // Verify SPI args input is editable (not read-only)
  const spiArgsInput = page.locator("input#spi-args");
  const isReadOnly = await spiArgsInput.getAttribute("readonly");
  expect(isReadOnly).toBeNull();

  // Change SPI args manually
  await spiArgsInput.fill("0x123456");

  // Click Apply
  const applyButton = page.locator('button:has-text("Apply")');
  await applyButton.click();

  // Wait for success
  await page.waitForTimeout(500);

  // Verify settings dialog shows updated SPI args
  const settingsSpiArgsInput = page.locator('input[placeholder*="0x-prefixed"]');
  const updatedSpiArgs = await settingsSpiArgsInput.inputValue();
  expect(updatedSpiArgs).toBe("0x123456");
});

test("Service ID is synced between settings and entrypoint parameters", async ({ page }) => {
  await openDebugger(page);
  await selectPVM(page, "@typeberry");

  // Load the GoL example
  await openProgram(page, "gol-sdk");

  // Wait for entrypoint selection dialog and load the program
  await page.waitForTimeout(1000);
  const loadButton = page.locator("button#load-button");
  await loadButton.waitFor({ state: "visible", timeout: 5000 });
  await expect(loadButton).toBeEnabled();
  await loadButton.click();
  await page.waitForTimeout(3000);

  // Open settings
  const settingsButton = page.locator("button.cursor-pointer:has(svg)").first();
  await settingsButton.click();
  await page.waitForSelector('[role="dialog"]');

  // Find the Service ID input in settings
  const serviceIdInput = page
    .locator("input")
    .filter({ hasText: /Service ID/ })
    .or(page.locator('div:has-text("Service ID")').locator("..").locator("input"))
    .first();

  // Click Configure button
  const configureButton = page.locator('button:has-text("Configure")');
  await configureButton.click();
  await page.waitForTimeout(500);

  // Select Accumulate entrypoint
  const accumulateOption = page.locator('div:has-text("Accumulate")').first();
  await accumulateOption.click();
  await page.waitForTimeout(500);

  // Find the Service ID field in accumulate parameters
  const accumulateServiceIdInput = page.locator("input#accumulate-id");
  await expect(accumulateServiceIdInput).toBeVisible();

  // Change the service ID in the accumulate entrypoint
  await accumulateServiceIdInput.fill("999");
  await page.waitForTimeout(500);

  // Apply changes
  const applyButton = page.locator('button:has-text("Apply")');
  await applyButton.click();
  await page.waitForTimeout(500);

  // Verify the global Service ID was updated
  const updatedServiceId = await serviceIdInput.inputValue();
  expect(updatedServiceId).toBe("999");
});
