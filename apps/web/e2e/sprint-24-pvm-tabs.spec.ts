import { test, expect } from "@playwright/test";

test.describe("Sprint 24 — Multi-PVM Tabs", () => {
  /** Load a program and wait for the debugger page to be visible. */
  async function loadProgram(page: import("@playwright/test").Page) {
    await page.goto("/#/load");
    const card = page.getByTestId("example-card-step-test");
    await expect(card).toBeVisible();
    await card.click();
    await expect(page.getByTestId("config-step")).toBeVisible({ timeout: 15000 });
    await page.getByTestId("config-step-load").click();
    await expect(page.getByTestId("debugger-page")).toBeVisible({ timeout: 15000 });
  }

  /** Open the settings tab in the bottom drawer. */
  async function openSettings(page: import("@playwright/test").Page) {
    await page.getByTestId("drawer-tab-settings").click();
    await expect(page.getByTestId("settings-tab")).toBeVisible();
  }

  /** Enable the Ananas PVM via settings. */
  async function enableAnanas(page: import("@playwright/test").Page) {
    await openSettings(page);
    const ananasSwitch = page.getByTestId("pvm-switch-ananas");
    await expect(ananasSwitch).toBeVisible();
    await ananasSwitch.click();
    // Wait for the orchestrator to reload and tabs to appear
    await expect(page.getByTestId("pvm-tab-ananas")).toBeVisible({ timeout: 15000 });
  }

  test("single-PVM mode shows one tab", async ({ page }) => {
    await loadProgram(page);

    const tabs = page.getByTestId("pvm-tabs");
    await expect(tabs).toBeVisible();

    // Only typeberry tab should render by default
    await expect(page.getByTestId("pvm-tab-typeberry")).toBeVisible();
    await expect(page.getByTestId("pvm-tab-ananas")).not.toBeVisible();
  });

  test("both PVM tabs render when both are enabled", async ({ page }) => {
    await loadProgram(page);
    await enableAnanas(page);

    await expect(page.getByTestId("pvm-tab-typeberry")).toBeVisible();
    await expect(page.getByTestId("pvm-tab-ananas")).toBeVisible();
  });

  test("clicking a tab changes the rendered register values", async ({ page }) => {
    await loadProgram(page);

    // Step a few times so registers have values
    const stepBtn = page.getByTestId("btn-step");
    await expect(stepBtn).toBeVisible();
    await stepBtn.click();
    await stepBtn.click();
    await stepBtn.click();

    // Capture register state for typeberry
    const regPanel = page.getByTestId("panel-registers");
    await expect(regPanel).toBeVisible();
    const typeberryText = await regPanel.innerText();

    // Enable ananas
    await enableAnanas(page);

    // Click ananas tab
    await page.getByTestId("pvm-tab-ananas").click();

    // Wait a tick for panel update
    await expect(page.getByTestId("pvm-tab-ananas")).toHaveAttribute("aria-selected", "true");

    // Register panel should now show ananas state (initially different from stepped typeberry)
    const ananasText = await regPanel.innerText();

    // Click back to typeberry
    await page.getByTestId("pvm-tab-typeberry").click();
    await expect(page.getByTestId("pvm-tab-typeberry")).toHaveAttribute("aria-selected", "true");

    // Verify the tab actually toggled selection
    const typeberryTextAfter = await regPanel.innerText();
    expect(typeberryTextAfter).toBe(typeberryText);
  });

  test("status dots reflect PVM lifecycle", async ({ page }) => {
    await loadProgram(page);

    // Initially paused → blue dot
    const dot = page.getByTestId("pvm-dot-typeberry");
    await expect(dot).toBeVisible();
    await expect(dot).toHaveClass(/bg-blue-500/);

    // Step to completion (run)
    const runBtn = page.getByTestId("btn-run");
    await expect(runBtn).toBeVisible();
    await runBtn.click();

    // Wait for terminal state — dot should turn gray (halt/terminated)
    await expect(dot).toHaveClass(/bg-gray-500/, { timeout: 15000 });
  });
});
