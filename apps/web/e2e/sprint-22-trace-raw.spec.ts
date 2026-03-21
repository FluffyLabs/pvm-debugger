import { test, expect } from "@playwright/test";

test.describe("Sprint 22 — Ecalli Trace Raw Mode + Download", () => {
  /** Load a trace-backed program and wait for the debugger page. */
  async function loadTraceProgram(page: import("@playwright/test").Page, exampleId = "io-trace") {
    await page.goto("/#/load");
    const card = page.getByTestId(`example-card-${exampleId}`);
    await expect(card).toBeVisible({ timeout: 15000 });
    await card.click();
    await expect(page.getByTestId("debugger-page")).toBeVisible({ timeout: 15000 });
  }

  /** Open the Ecalli Trace tab. */
  async function openTraceTab(page: import("@playwright/test").Page) {
    await page.getByTestId("drawer-tab-ecalli_trace").click();
    await expect(page.getByTestId("ecalli-trace-tab")).toBeVisible();
  }

  /** Set auto-continue policy. */
  async function setAutoContinuePolicy(
    page: import("@playwright/test").Page,
    policy: "always_continue" | "continue_when_trace_matches" | "never",
  ) {
    await page.getByTestId("drawer-tab-settings").click();
    await expect(page.getByTestId("settings-tab")).toBeVisible();
    await page.getByTestId(`auto-continue-radio-${policy}`).click();
    await expect(page.getByTestId(`auto-continue-radio-${policy}`)).toBeChecked();
  }

  test("raw mode toggle switches to textarea view", async ({ page }) => {
    await loadTraceProgram(page);
    await openTraceTab(page);

    // Initially in formatted mode — trace columns visible
    await expect(page.getByTestId("trace-column-execution-trace")).toBeVisible();

    // Click Raw toggle
    await page.getByTestId("view-mode-raw").click();

    // Now should show raw textareas
    await expect(page.getByTestId("trace-raw-view")).toBeVisible();
    await expect(page.getByTestId("trace-raw-execution")).toBeVisible();
    await expect(page.getByTestId("trace-raw-reference")).toBeVisible();

    // Formatted columns should not be visible
    await expect(page.getByTestId("trace-column-execution-trace")).not.toBeVisible();
  });

  test("raw mode shows serialized trace text", async ({ page }) => {
    await loadTraceProgram(page);
    await setAutoContinuePolicy(page, "always_continue");

    // Run the program to generate trace entries
    await page.getByTestId("run-button").click();
    await page.waitForTimeout(5000);
    const pauseBtn = page.getByTestId("pause-button");
    if (await pauseBtn.isVisible()) {
      await pauseBtn.click();
      await page.waitForTimeout(500);
    }

    // Open trace tab and switch to raw mode
    await openTraceTab(page);
    await page.getByTestId("view-mode-raw").click();

    // The reference trace textarea should contain serialized trace text
    const refTextarea = page.getByTestId("trace-raw-reference");
    const refText = await refTextarea.inputValue();
    // Reference trace from a trace-backed example should contain "program 0x"
    expect(refText).toContain("program 0x");
  });

  test("switching back to formatted mode preserves content", async ({ page }) => {
    await loadTraceProgram(page);
    await setAutoContinuePolicy(page, "always_continue");

    // Run to generate entries
    await page.getByTestId("run-button").click();
    await page.waitForTimeout(5000);
    const pauseBtn = page.getByTestId("pause-button");
    if (await pauseBtn.isVisible()) {
      await pauseBtn.click();
      await page.waitForTimeout(500);
    }

    await openTraceTab(page);

    // Count entries in formatted mode
    const execColumn = page.getByTestId("trace-column-execution-trace");
    const initialBadgeCount = await execColumn.getByTestId("trace-entry-badge").count();

    // Switch to raw, then back to formatted
    await page.getByTestId("view-mode-raw").click();
    await expect(page.getByTestId("trace-raw-view")).toBeVisible();

    await page.getByTestId("view-mode-formatted").click();
    await expect(page.getByTestId("trace-column-execution-trace")).toBeVisible();

    // Entry count should be the same
    const afterBadgeCount = await execColumn.getByTestId("trace-entry-badge").count();
    expect(afterBadgeCount).toBe(initialBadgeCount);
  });

  test("download produces a .log file", async ({ page }) => {
    await loadTraceProgram(page);
    await setAutoContinuePolicy(page, "always_continue");

    // Run to generate execution trace entries
    await page.getByTestId("run-button").click();
    await page.waitForTimeout(5000);
    const pauseBtn = page.getByTestId("pause-button");
    if (await pauseBtn.isVisible()) {
      await pauseBtn.click();
      await page.waitForTimeout(500);
    }

    await openTraceTab(page);

    // Set up download listener before clicking
    const downloadPromise = page.waitForEvent("download");
    await page.getByTestId("download-trace-button").click();
    const download = await downloadPromise;

    // Verify filename pattern
    expect(download.suggestedFilename()).toMatch(/^execution-trace-\d+\.log$/);
  });
});
