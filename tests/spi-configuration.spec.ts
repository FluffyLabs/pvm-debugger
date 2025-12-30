import { test, expect } from "@playwright/test";
import { openDebugger, openProgram, selectPVM } from "./utils/actions";

test("GoL example loads and SPI configuration works", async ({ page }) => {
  await openDebugger(page);
  await selectPVM(page, "@typeberry");

  // Load the GoL (JAM-SDK) example
  await openProgram(page, "gol-sdk");

  // Wait for program loader dialog to appear
  await page.waitForTimeout(1000);

  // For SPI programs, we need to click the button twice:
  // First click: Advance from "upload" to "entrypoint" step
  const nextButton = page.getByTestId("load-button");
  await nextButton.waitFor({ state: "visible", timeout: 5000 });
  await expect(nextButton).toBeEnabled();
  await expect(nextButton).toHaveText("Next");
  await nextButton.click();

  // Wait for entrypoint configuration UI to appear
  await page.waitForTimeout(500);

  // Second click: Actually load the program
  const loadButton = page.getByTestId("load-button");
  await expect(loadButton).toBeEnabled();
  await expect(loadButton).toHaveText("Load");
  await loadButton.click();

  // Wait for the program to load and dialog to close
  await page.waitForTimeout(3000);

  // Verify that the settings cog shows the SPI indicator (blue dot)
  const settingsButton = page.getByTestId("settings-button");
  const spiIndicator = page.getByTestId("spi-indicator");
  await expect(spiIndicator).toBeVisible();

  // Click settings button to open settings dialog
  await settingsButton.click();

  // Wait for settings dialog to open
  // Wait for dialog to open and get the last one (desktop dialog, not mobile)
  await page.waitForSelector('[role="dialog"]');
  const visibleDialog = page.locator('[role="dialog"]').last();

  // Find and click the "Configure" button within the visible dialog
  const configureButton = visibleDialog.getByTestId("configure-spi-button");
  await expect(configureButton).toBeVisible();
  await configureButton.click();

  // Wait for SPI config dialog to open
  await page.waitForTimeout(500);

  // Get the SPI config dialog
  const spiConfigDialog = page.getByRole("dialog", { name: "Configure SPI Entrypoint" });

  // Click on "Refine" entrypoint within the SPI config dialog
  const refineOption = spiConfigDialog.getByTestId("entrypoint-refine");
  await refineOption.click();

  // Wait for parameters to update
  await page.waitForTimeout(500);

  // Change core parameter value
  const coreInput = spiConfigDialog.getByTestId("refine-core");
  await coreInput.fill("5");

  // Wait for auto-encoding
  await page.waitForTimeout(500);

  // Verify SPI Arguments field is auto-filled
  const spiArgsInput = spiConfigDialog.getByTestId("spi-args");
  const spiArgsValue = await spiArgsInput.inputValue();
  expect(spiArgsValue).toBeTruthy();
  expect(spiArgsValue.startsWith("0x")).toBeTruthy();

  // Click Apply button
  const applyButton = spiConfigDialog.getByTestId("spi-apply-button");
  await applyButton.click();

  // Wait for dialog to close
  await page.waitForTimeout(500);

  // Verify the SPI arguments input field is updated
  const settingsDialog = page.locator('[role="dialog"]').last();
  const settingsSpiArgsInput = settingsDialog.getByTestId("spi-args-input-settings");
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
  const loadButton = page.getByTestId("load-button");
  await loadButton.waitFor({ state: "visible", timeout: 5000 });
  await expect(loadButton).toBeEnabled();
  await loadButton.click();
  await page.waitForTimeout(3000);

  // Open settings
  const settingsButton = page.getByTestId("settings-button");
  await settingsButton.click();
  // Wait for dialog to open and get the last one (desktop dialog, not mobile)
  await page.waitForSelector('[role="dialog"]');
  const visibleDialog = page.locator('[role="dialog"]').last();

  // Click Configure button within the visible dialog
  const configureButton = visibleDialog.getByTestId("configure-spi-button");
  await configureButton.click();
  await page.waitForTimeout(500);

  // Get the SPI config dialog
  const spiConfigDialog = page.getByRole("dialog", { name: "Configure SPI Entrypoint" });

  // Toggle to manual mode using the RAW switch within the SPI config dialog
  const rawSwitch = spiConfigDialog.getByTestId("manual-mode-switch");
  await rawSwitch.click();

  // Wait for manual mode UI
  await page.waitForTimeout(500);

  // Verify Program Counter input is visible
  const pcInput = spiConfigDialog.getByTestId("manual-pc");
  await expect(pcInput).toBeVisible();

  // Change PC value
  await pcInput.fill("10");

  // Verify SPI args input is editable (not read-only)
  const spiArgsInput = spiConfigDialog.getByTestId("spi-args");
  const isReadOnly = await spiArgsInput.getAttribute("readonly");
  expect(isReadOnly).toBeNull();

  // Change SPI args manually
  await spiArgsInput.fill("0x123456");

  // Click Apply
  const applyButton = spiConfigDialog.getByTestId("spi-apply-button");
  await applyButton.click();

  // Wait for success
  await page.waitForTimeout(500);

  // Verify settings dialog shows updated SPI args
  const settingsDialog = page.locator('[role="dialog"]').last();
  const settingsSpiArgsInput = settingsDialog.getByTestId("spi-args-input-settings");
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
  const loadButton = page.getByTestId("load-button");
  await loadButton.waitFor({ state: "visible", timeout: 5000 });
  await expect(loadButton).toBeEnabled();
  await loadButton.click();
  await page.waitForTimeout(3000);

  // Open settings
  const settingsButton = page.getByTestId("settings-button");
  await settingsButton.click();
  // Wait for dialog to open and get the last one (desktop dialog, not mobile)
  await page.waitForSelector('[role="dialog"]');
  const visibleDialog = page.locator('[role="dialog"]').last();

  // Find the Service ID input in settings
  const serviceIdInput = visibleDialog.getByTestId("service-id-input");

  // Click Configure button within the visible dialog
  const configureButton = visibleDialog.getByTestId("configure-spi-button");
  await configureButton.click();
  await page.waitForTimeout(500);

  // Get the SPI config dialog
  const spiConfigDialog = page.getByRole("dialog", { name: "Configure SPI Entrypoint" });

  // Select Accumulate entrypoint within the SPI config dialog
  const accumulateOption = spiConfigDialog.getByTestId("entrypoint-accumulate");
  await accumulateOption.click();
  await page.waitForTimeout(500);

  // Find the Service ID field in accumulate parameters
  const accumulateServiceIdInput = spiConfigDialog.getByTestId("accumulate-id");
  await expect(accumulateServiceIdInput).toBeVisible();

  // Change the service ID in the accumulate entrypoint
  await accumulateServiceIdInput.fill("999");
  await page.waitForTimeout(500);

  // Apply changes
  const applyButton = spiConfigDialog.getByTestId("spi-apply-button");
  await applyButton.click();
  await page.waitForTimeout(500);

  // Verify the global Service ID was updated (may be in hex format)
  const updatedServiceId = await serviceIdInput.inputValue();
  // Service ID can be displayed as "999" or "0x3e7" depending on numeral system
  expect(updatedServiceId === "999" || updatedServiceId === "0x3e7").toBeTruthy();
});
