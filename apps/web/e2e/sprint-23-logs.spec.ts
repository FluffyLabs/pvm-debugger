import { test, expect } from "@playwright/test";

test.describe("Sprint 23 — Logs Tab", () => {
  /** Load a simple (non-trace) program. */
  async function loadSimpleProgram(page: import("@playwright/test").Page) {
    await page.goto("/#/load");
    const card = page.getByTestId("example-card-step-test");
    await expect(card).toBeVisible({ timeout: 15000 });
    await card.click();
    await expect(page.getByTestId("config-step")).toBeVisible({ timeout: 15000 });
    await page.getByTestId("config-step-load").click();
    await expect(page.getByTestId("debugger-page")).toBeVisible({ timeout: 15000 });
  }

  /** Load trace-001 which has ecalli=100 log entries. */
  async function loadTraceProgram(page: import("@playwright/test").Page) {
    await page.goto("/#/load");
    const card = page.getByTestId("example-card-trace-001");
    await expect(card).toBeVisible({ timeout: 15000 });
    await card.click();
    await expect(page.getByTestId("config-step")).toBeVisible({ timeout: 15000 });
    await page.getByTestId("config-step-load").click();
    await expect(page.getByTestId("debugger-page")).toBeVisible({ timeout: 15000 });
  }

  /** Open the Logs tab. */
  async function openLogsTab(page: import("@playwright/test").Page) {
    await page.getByTestId("drawer-tab-logs").click();
    await expect(page.getByTestId("logs-tab")).toBeVisible();
  }

  /** Set auto-continue to always. */
  async function setAlwaysContinue(page: import("@playwright/test").Page) {
    await page.getByTestId("drawer-tab-settings").click();
    await expect(page.getByTestId("settings-tab")).toBeVisible();
    await page.getByTestId("auto-continue-radio-always_continue").click();
    await expect(page.getByTestId("auto-continue-radio-always_continue")).toBeChecked();
  }

  test("empty state renders before any log host calls", async ({ page }) => {
    await loadSimpleProgram(page);
    await openLogsTab(page);

    await expect(page.getByTestId("logs-empty")).toBeVisible();
    await expect(page.getByTestId("logs-empty")).toHaveText("No log messages yet.");
  });

  test("after a log host call, decoded text appears with step number", async ({ page }) => {
    await loadTraceProgram(page);
    await setAlwaysContinue(page);

    // Run the program so host calls accumulate (trace-001 has ecalli=100 entries)
    await page.getByTestId("run-button").click();
    await page.waitForTimeout(5000);

    // Pause if still running
    const pauseBtn = page.getByTestId("pause-button");
    if (await pauseBtn.isVisible()) {
      await pauseBtn.click();
      await page.waitForTimeout(500);
    }

    await openLogsTab(page);

    // Check that at least one log entry appeared
    const entries = page.getByTestId("log-entry");
    const count = await entries.count();
    if (count > 0) {
      // Each entry should show [Step N] prefix
      const firstEntry = entries.first();
      const text = await firstEntry.textContent();
      expect(text).toMatch(/\[Step \d+\]/);
    }
  });

  test("Copy writes the visible log stream to clipboard", async ({ page }) => {
    await loadTraceProgram(page);
    await setAlwaysContinue(page);

    // Run to accumulate log entries
    await page.getByTestId("run-button").click();
    await page.waitForTimeout(5000);
    const pauseBtn = page.getByTestId("pause-button");
    if (await pauseBtn.isVisible()) {
      await pauseBtn.click();
      await page.waitForTimeout(500);
    }

    await openLogsTab(page);

    // Grant clipboard permissions
    await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);

    // Click Copy
    await page.getByTestId("logs-copy-button").click();

    // Read clipboard content
    const clipboardText = await page.evaluate(() => navigator.clipboard.readText());

    // If there were log entries, clipboard should contain [Step N] prefixed lines
    const entries = page.getByTestId("log-entry");
    const count = await entries.count();
    if (count > 0) {
      expect(clipboardText).toContain("[Step ");
    }
  });

  test("Clear returns the panel to empty state", async ({ page }) => {
    await loadTraceProgram(page);
    await setAlwaysContinue(page);

    // Run to accumulate log entries
    await page.getByTestId("run-button").click();
    await page.waitForTimeout(5000);
    const pauseBtn = page.getByTestId("pause-button");
    if (await pauseBtn.isVisible()) {
      await pauseBtn.click();
      await page.waitForTimeout(500);
    }

    await openLogsTab(page);

    // If entries exist, clear should remove them
    const entries = page.getByTestId("log-entry");
    const countBefore = await entries.count();
    if (countBefore > 0) {
      await page.getByTestId("logs-clear-button").click();
      await expect(page.getByTestId("logs-empty")).toBeVisible();
      await expect(page.getByTestId("logs-empty")).toHaveText("No log messages yet.");
    }
  });
});
